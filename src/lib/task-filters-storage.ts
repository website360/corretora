import type { PeriodMode } from "@/modules/tickets/tasks-calendar";

/**
 * Persistência (por usuário, em localStorage) dos filtros da tela
 * "Tarefas & Agenda". O salvamento é EXPLÍCITO — só grava quando o usuário
 * clica em "Salvar"; ao voltar à página, restauramos o que foi salvo.
 */
export interface SavedTaskFilters {
  search: string;
  priorities: string[];
  relations: string[];
  personIds: string[];
  tagFilter: string[];
  boardFilter: string[];
  stageFilter: string[];
  hideClosed: boolean;
  subjectFilter: string[];
  entryTypes: string[];
  periodMode: PeriodMode;
  rangeFrom: string;
  rangeTo: string;
}

/** Um filtro salvo com nome, que o usuário aplica com um clique. */
export interface FilterPreset {
  id: string;
  name: string;
  filters: SavedTaskFilters;
}

const KEY_PREFIX = "corretora:task-filters:";
const PRESETS_PREFIX = "corretora:task-filter-presets:";

function keyFor(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

function presetsKeyFor(userId: string) {
  return `${PRESETS_PREFIX}${userId}`;
}

export function loadTaskFilters(userId: string): SavedTaskFilters | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as SavedTaskFilters) : null;
  } catch {
    return null;
  }
}

export function saveTaskFilters(userId: string, filters: SavedTaskFilters) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(filters));
  } catch {
    /* localStorage indisponível (modo privado / quota) — ignora. */
  }
}

export function clearTaskFilters(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignora */
  }
}

/* ── Presets nomeados (lista por usuário) ─────────────────────────────────── */

export function loadTaskPresets(userId: string): FilterPreset[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(presetsKeyFor(userId));
    const list = raw ? (JSON.parse(raw) as FilterPreset[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persistPresets(userId: string, presets: FilterPreset[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(presetsKeyFor(userId), JSON.stringify(presets));
  } catch {
    /* ignora */
  }
}

/* ── Transforms puros de lista (a persistência é feita por quem chama, no
      banco — por usuário). Mantemos o localStorage acima só como fallback de
      migração dos presets criados antes do 0060. ───────────────────────────── */

/** Cria (ou renomeia, se o nome já existir) um preset e devolve a nova lista. */
export function upsertPreset(
  presets: FilterPreset[],
  name: string,
  filters: SavedTaskFilters,
): FilterPreset[] {
  const existing = presets.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return presets.map((p) => (p.id === existing.id ? { ...p, filters } : p));
  }
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now()}`;
  return [...presets, { id, name: name.trim(), filters }];
}

export function removePreset(presets: FilterPreset[], id: string): FilterPreset[] {
  return presets.filter((p) => p.id !== id);
}
