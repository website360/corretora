"use client";

import * as React from "react";
import Link from "next/link";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";
import { CalendarClock, LayoutGrid, ListChecks } from "lucide-react";
import { ticketsService } from "@/services/tickets.service";
import { calendarService } from "@/services/calendar.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory, useDirectoryStore } from "@/stores/directory-store";
import { useViewCompanyStore } from "@/stores/view-company-store";
import {
  TASK_BOARD_KINDS,
  TASK_BOARD_KIND_META,
  TONE_DOT_CLASS,
  TONE_TEXT_CLASS,
} from "@/config/domain";
import { StageDot } from "@/components/common/style-pickers";
import { isHexColor } from "@/lib/tag-color";
import { cn } from "@/lib/utils";
import type { StageColor, TaskBoardKind, TaskColumn } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Barra colorida fina da borda esquerda do card (por tom predefinido). */
const TONE_BAR: Record<StageColor, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

type RangeKey = "today" | "7d" | "month" | "year" | "all";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "month", label: "Este mês" },
  { key: "year", label: "Este ano" },
  { key: "all", label: "Tudo" },
];

function rangeFor(key: RangeKey): { from: Date; to: Date } | null {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "all":
      return null;
  }
}

/** Card de indicador — tamanho/estilo únicos para "Por vencimento" e "Etapas". */
function StatCard({
  href,
  barClass,
  barStyle,
  marker,
  label,
  value,
  valueClass,
  sub,
  loading,
}: {
  href: string;
  barClass?: string;
  barStyle?: React.CSSProperties;
  marker: React.ReactNode;
  label: string;
  value: number;
  valueClass?: string;
  sub?: string | null;
  loading: boolean;
}) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="relative flex h-full flex-col overflow-hidden p-5 transition-all duration-200 hover:border-foreground/15 hover:shadow-md">
        <div className={cn("absolute inset-y-0 left-0 w-1", barClass)} style={barStyle} />
        <div className="flex items-center gap-2">
          {marker}
          <span className="truncate text-[13px] font-medium text-muted-foreground">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="mt-4 h-9 w-16" />
        ) : (
          <p
            className={cn(
              "mt-4 text-4xl font-bold leading-none tracking-tight tabular-nums",
              valueClass,
            )}
          >
            {value}
          </p>
        )}
        <p className="mt-2 h-4 text-[11px] tabular-nums text-muted-foreground/70">{sub ?? ""}</p>
      </Card>
    </Link>
  );
}

/**
 * Dashboard de Kanbans. Os quadros são separados por TIPO (Tarefas / Agenda /
 * Outro). O usuário escolhe o tipo, o quadro e o período; vê as etapas (colunas)
 * daquele quadro com a contagem de itens em cada uma, e um indicador por
 * vencimento. Ao clicar, abre as Tarefas & Agenda já filtradas (tarefas + eventos).
 */
export function KanbanDashboard() {
  useDirectory();
  const boards = useDirectoryStore((s) => s.taskBoards);
  const allColumns = useDirectoryStore((s) => s.taskColumns);
  const viewCompanyId = useViewCompanyStore((s) => s.companyId);

  const { data: tickets } = useAsyncData(() => ticketsService.list(), [viewCompanyId]);
  const { data: events } = useAsyncData(() => calendarService.list(), [viewCompanyId]);

  const [kind, setKind] = React.useState<TaskBoardKind | "">("");
  const [boardId, setBoardId] = React.useState("");
  const [range, setRange] = React.useState<RangeKey>("today");

  // Preferências guardadas por dispositivo (voltam selecionadas).
  React.useEffect(() => {
    const k = localStorage.getItem("dashboard_kanban_kind");
    if (k === "tasks" || k === "agenda" || k === "other") setKind(k);
    const b = localStorage.getItem("dashboard_kanban_board");
    if (b) setBoardId(b);
    const r = localStorage.getItem("dashboard_kanban_range");
    if (r === "today" || r === "7d" || r === "month" || r === "year" || r === "all") setRange(r);
  }, []);

  // Tipos que realmente têm quadros (na ordem canônica).
  const presentKinds = React.useMemo(
    () => TASK_BOARD_KINDS.filter((k) => boards.some((b) => b.kind === k)),
    [boards],
  );
  const activeKind: TaskBoardKind | "" =
    kind && presentKinds.includes(kind) ? kind : (presentKinds[0] ?? "");

  const boardsOfKind = React.useMemo(
    () => boards.filter((b) => b.kind === activeKind),
    [boards, activeKind],
  );
  const activeBoardId = boardsOfKind.some((b) => b.id === boardId)
    ? boardId
    : (boardsOfKind.find((b) => b.is_default)?.id ?? boardsOfKind[0]?.id ?? "");

  const onKindChange = (k: TaskBoardKind) => {
    setKind(k);
    localStorage.setItem("dashboard_kanban_kind", k);
  };
  const onBoardChange = (v: string) => {
    setBoardId(v);
    localStorage.setItem("dashboard_kanban_board", v);
  };
  const onRangeChange = (v: string) => {
    setRange(v as RangeKey);
    localStorage.setItem("dashboard_kanban_range", v);
  };

  // Tarefas → só tickets; Agenda → só eventos; Outro → ambos.
  const showTasks = activeKind !== "agenda";
  const showEvents = activeKind !== "tasks";
  const both = showTasks && showEvents;
  const loading = !tickets || !events;

  const rangeWindow = React.useMemo(() => rangeFor(range), [range]);
  const inRange = React.useCallback(
    (iso?: string | null) => {
      if (!rangeWindow) return true;
      if (!iso) return false;
      const t = +new Date(iso);
      return t >= +rangeWindow.from && t <= +rangeWindow.to;
    },
    [rangeWindow],
  );

  const columns = React.useMemo(
    () =>
      allColumns
        .filter((c) => c.board_id === activeBoardId)
        .sort((a, b) => a.position - b.position),
    [allColumns, activeBoardId],
  );
  const columnIds = React.useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  // Mesma lógica do Quadro (tasks-board): itens órfãos (sem quadro) caem na 1ª
  // coluna do quadro ativo; itens de outro quadro não aparecem.
  const inColumn = React.useCallback(
    (item: { board_id?: string | null; column_id?: string | null }, col: TaskColumn, index: number) => {
      if (item.board_id !== activeBoardId) return index === 0 && !item.board_id;
      if (item.column_id === col.id) return true;
      return index === 0 && (!item.column_id || !columnIds.has(item.column_id));
    },
    [activeBoardId, columnIds],
  );

  const perColumn = React.useMemo(
    () =>
      columns.map((col, i) => {
        const taskCount = showTasks
          ? (tickets ?? []).filter((t) => inColumn(t, col, i) && inRange(t.created_at)).length
          : 0;
        const eventCount = showEvents
          ? (events ?? []).filter((e) => inColumn(e, col, i) && inRange(e.starts_at)).length
          : 0;
        return { col, taskCount, eventCount, total: taskCount + eventCount };
      }),
    [columns, tickets, events, showTasks, showEvents, inColumn, inRange],
  );

  // Item pertence ao quadro ativo (em qualquer coluna dele).
  const onBoard = React.useCallback(
    (item: { board_id?: string | null; column_id?: string | null }) =>
      columns.some((c, i) => inColumn(item, c, i)),
    [columns, inColumn],
  );

  // Indicador por vencimento (tarefas: due_at; eventos: starts_at). Considera
  // TODAS as tarefas do quadro (ignora o período). Exclui finalizados (tarefa
  // com status "closed" / evento finished). Atrasada = vencidas nos últimos 30
  // dias; Em dia inclui itens sem prazo (nada vencido).
  const dueBuckets = React.useMemo(() => {
    const today0 = +startOfDay(new Date());
    const endToday = +endOfDay(new Date());
    const start30 = +startOfDay(subDays(new Date(), 30));
    const startTomorrow = +startOfDay(addDays(new Date(), 1));
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    const classify = (d?: string | null) => {
      if (d == null) {
        upcoming++;
        return;
      }
      const t = +new Date(d);
      if (t >= start30 && t < today0) overdue++;
      else if (t >= today0 && t <= endToday) today++;
      else if (t >= startTomorrow) upcoming++;
    };
    if (showTasks)
      for (const t of tickets ?? [])
        if (onBoard(t) && t.status !== "closed") classify(t.due_at);
    if (showEvents)
      for (const e of events ?? []) if (onBoard(e) && !e.finished) classify(e.starts_at);
    return { overdue, today, upcoming };
  }, [tickets, events, showTasks, showEvents, onBoard]);

  const dueCards: { key: string; label: string; value: number; tone: StageColor }[] = [
    { key: "overdue", label: "Atrasada (30 dias)", value: dueBuckets.overdue, tone: "destructive" },
    { key: "today", label: "De hoje", value: dueBuckets.today, tone: "warning" },
    { key: "upcoming", label: "Em dia", value: dueBuckets.upcoming, tone: "success" },
  ];

  const rangeQuery = rangeWindow
    ? `&from=${encodeURIComponent(rangeWindow.from.toISOString())}&to=${encodeURIComponent(rangeWindow.to.toISOString())}`
    : "";

  // Deep-links abrem Tarefas & Agenda com o filtro aplicado, mantendo tarefas +
  // eventos (entry=all).
  const cardHref = (columnId: string) =>
    `/tickets?board=${activeBoardId}&stage=${columnId}&entry=all${rangeQuery}`;
  const dueHref = (bucket: string) =>
    `/tickets?board=${activeBoardId}&entry=all&due=${bucket}`;

  if (boards.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={LayoutGrid}
          title="Nenhum quadro ainda"
          description="Crie um Kanban em Tarefas para ver os indicadores aqui."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Abas por tipo de Kanban */}
      {presentKinds.length > 1 && (
        <div className="inline-flex flex-wrap gap-1 rounded-lg border p-0.5">
          {presentKinds.map((k) => {
            const meta = TASK_BOARD_KIND_META[k];
            const Icon = meta.icon;
            return (
              <button
                key={k}
                onClick={() => onKindChange(k)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeKind === k
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Seletor de quadro + período */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-72">
          <Select value={activeBoardId} onValueChange={onBoardChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um Kanban" />
            </SelectTrigger>
            <SelectContent>
              {boardsOfKind.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select value={range} onValueChange={onRangeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Indicador por vencimento */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CalendarClock className="size-4" />
          Por vencimento
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {dueCards.map((c) => (
            <StatCard
              key={c.key}
              href={dueHref(c.key)}
              barClass={TONE_BAR[c.tone]}
              marker={<span className={cn("size-2.5 rounded-full", TONE_DOT_CLASS[c.tone])} />}
              label={c.label}
              value={c.value}
              valueClass={TONE_TEXT_CLASS[c.tone]}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {/* Etapas do quadro selecionado */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <ListChecks className="size-4" />
          Etapas do quadro
        </div>
        {columns.length === 0 ? (
          <Card className="p-8">
            <EmptyState title="Sem etapas" description="Este quadro ainda não tem colunas." />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {perColumn.map(({ col, taskCount, eventCount, total }) => {
              const hex = isHexColor(col.color);
              return (
                <StatCard
                  key={col.id}
                  href={cardHref(col.id)}
                  barClass={hex ? undefined : TONE_BAR[col.color as StageColor]}
                  barStyle={hex ? { backgroundColor: col.color } : undefined}
                  marker={<StageDot color={col.color} icon={col.icon} />}
                  label={col.name}
                  value={total}
                  sub={both && total > 0 ? `${taskCount} tar. · ${eventCount} ev.` : null}
                  loading={loading}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
