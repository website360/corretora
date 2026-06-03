import type { Company, CompanySettings, SortKey, SortRule } from "@/types/domain";

export const SORT_LABELS: Record<SortKey, string> = {
  created: "Data de criação",
  due_date: "Data de vencimento",
  due_time: "Horário de vencimento",
  due_datetime: "Data e horário de vencimento",
  priority: "Prioridade",
};

/** Sensible default direction for each key (soonest / most urgent first). */
export const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  created: "desc",
  due_date: "asc",
  due_time: "asc",
  due_datetime: "asc",
  priority: "desc",
};

export const ALL_SORT_KEYS: SortKey[] = [
  "due_datetime",
  "due_date",
  "due_time",
  "priority",
  "created",
];

export const DEFAULT_SORT_RULES: SortRule[] = [
  { key: "due_datetime", dir: "asc" },
  { key: "priority", dir: "desc" },
];

/** One-click sort templates for the common combinations. */
export interface SortPreset {
  id: string;
  label: string;
  description: string;
  rules: SortRule[];
}

export const SORT_PRESETS: SortPreset[] = [
  {
    id: "datetime_priority",
    label: "Prazo e prioridade",
    description:
      "Pelos prazos mais próximos (data e horário) e, em empates, os mais urgentes primeiro.",
    rules: [
      { key: "due_datetime", dir: "asc" },
      { key: "priority", dir: "desc" },
    ],
  },
  {
    id: "date_priority",
    label: "Por dia e, no mesmo dia, por prioridade",
    description:
      "Agrupa pela data de vencimento (ignora o horário) e, dentro de cada dia, mostra os mais urgentes primeiro.",
    rules: [
      { key: "due_date", dir: "asc" },
      { key: "priority", dir: "desc" },
    ],
  },
  {
    id: "priority_date",
    label: "Prioridade e, depois, por dia",
    description:
      "Os mais urgentes primeiro e, em empates, pela data de vencimento mais próxima.",
    rules: [
      { key: "priority", dir: "desc" },
      { key: "due_date", dir: "asc" },
    ],
  },
];

/** Returns the preset id whose rules exactly match the given rules, if any. */
export function matchPreset(rules: SortRule[]): string | null {
  const key = JSON.stringify(rules);
  return SORT_PRESETS.find((p) => JSON.stringify(p.rules) === key)?.id ?? null;
}

export const DEFAULT_TASK_TIME_ENABLED = true;

export interface ResolvedSettings {
  taskTimeEnabled: boolean;
  sortRules: SortRule[];
}

/** Merges a company's stored settings with sane defaults. */
export function resolveSettings(company: Pick<Company, "settings">): ResolvedSettings {
  const s = (company.settings ?? {}) as CompanySettings;
  return {
    taskTimeEnabled: s.taskTimeEnabled ?? DEFAULT_TASK_TIME_ENABLED,
    sortRules: s.sortRules && s.sortRules.length > 0 ? s.sortRules : DEFAULT_SORT_RULES,
  };
}

const PRIORITY_RANK: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

/** Values a row exposes to the sort engine. */
export interface SortableRow {
  createdAt: number; // ms
  dueAt: number | null; // ms (null = no due date)
  priority: string | null; // ticket priority or null (events)
}

function valueFor(row: SortableRow, key: SortKey): number {
  const MISSING = Number.POSITIVE_INFINITY;
  switch (key) {
    case "created":
      return row.createdAt;
    case "due_datetime":
      return row.dueAt ?? MISSING;
    case "due_date": {
      if (row.dueAt == null) return MISSING;
      const d = new Date(row.dueAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case "due_time": {
      if (row.dueAt == null) return MISSING;
      const d = new Date(row.dueAt);
      return d.getHours() * 60 + d.getMinutes();
    }
    case "priority":
      return row.priority ? (PRIORITY_RANK[row.priority] ?? 0) : 0;
  }
}

/** Builds a comparator from the configured multi-level sort rules. */
export function makeComparator(rules: SortRule[]) {
  return (a: SortableRow, b: SortableRow): number => {
    for (const rule of rules) {
      const va = valueFor(a, rule.key);
      const vb = valueFor(b, rule.key);
      if (va === vb) continue;
      if (va === Number.POSITIVE_INFINITY) return 1; // missing values sink
      if (vb === Number.POSITIVE_INFINITY) return -1;
      return rule.dir === "asc" ? va - vb : vb - va;
    }
    return 0;
  };
}
