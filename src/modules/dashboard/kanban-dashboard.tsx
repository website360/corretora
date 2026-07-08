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
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  LayoutGrid,
} from "lucide-react";
import { ticketsService } from "@/services/tickets.service";
import { calendarService } from "@/services/calendar.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory, useDirectoryStore } from "@/stores/directory-store";
import { useViewCompanyStore } from "@/stores/view-company-store";
import { TASK_BOARD_KINDS, TASK_BOARD_KIND_META, TONE_DOT_CLASS, TONE_TEXT_CLASS } from "@/config/domain";
import { StageDot } from "@/components/common/style-pickers";
import { isHexColor } from "@/lib/tag-color";
import { cn } from "@/lib/utils";
import type { StageColor, TaskBoardKind, TaskColumn } from "@/types/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Fundo suave (tinta) do ícone por tom. */
const TONE_SOFT_BG: Record<StageColor, string> = {
  neutral: "bg-muted",
  primary: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
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

/**
 * Dashboard de Kanbans. Quadros separados por TIPO (Tarefas / Agenda / Outro).
 * Escolhe-se o tipo, o quadro e o período. Mostra: um indicador por vencimento
 * (respeita o quadro, ignora o período) e a distribuição por etapa do quadro
 * (respeita o período). Cada card abre as Tarefas & Agenda com o filtro aplicado.
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

  React.useEffect(() => {
    const k = localStorage.getItem("dashboard_kanban_kind");
    if (k === "tasks" || k === "agenda" || k === "other") setKind(k);
    const b = localStorage.getItem("dashboard_kanban_board");
    if (b) setBoardId(b);
    const r = localStorage.getItem("dashboard_kanban_range");
    if (r === "today" || r === "7d" || r === "month" || r === "year" || r === "all") setRange(r);
  }, []);

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
  const activeBoard = boardsOfKind.find((b) => b.id === activeBoardId);

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

  // Estrito: item está numa coluna se board+coluna batem exatamente — igual ao
  // filtro por etapa das Tarefas, então a contagem sempre casa com o deep-link.
  const inColumn = React.useCallback(
    (item: { board_id?: string | null; column_id?: string | null }, col: TaskColumn) =>
      item.board_id === activeBoardId && item.column_id === col.id,
    [activeBoardId],
  );
  const onBoard = React.useCallback(
    (item: { board_id?: string | null }) => item.board_id === activeBoardId,
    [activeBoardId],
  );

  const perColumn = React.useMemo(
    () =>
      columns.map((col) => {
        const taskCount = showTasks
          ? (tickets ?? []).filter((t) => inColumn(t, col) && inRange(t.created_at)).length
          : 0;
        const eventCount = showEvents
          ? (events ?? []).filter((e) => inColumn(e, col) && inRange(e.starts_at)).length
          : 0;
        return { col, taskCount, eventCount, total: taskCount + eventCount };
      }),
    [columns, tickets, events, showTasks, showEvents, inColumn, inRange],
  );
  const boardTotal = perColumn.reduce((s, c) => s + c.total, 0);

  // Indicador por vencimento — considera TODAS as tarefas do quadro (ignora o
  // período), excluindo finalizados (tarefa closed / evento finished).
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
      for (const t of tickets ?? []) if (onBoard(t) && t.status !== "closed") classify(t.due_at);
    if (showEvents)
      for (const e of events ?? []) if (onBoard(e) && !e.finished) classify(e.starts_at);
    return { overdue, today, upcoming };
  }, [tickets, events, showTasks, showEvents, onBoard]);

  const dueCards: {
    key: string;
    label: string;
    value: number;
    tone: StageColor;
    icon: typeof AlertTriangle;
  }[] = [
    { key: "overdue", label: "Atrasadas", value: dueBuckets.overdue, tone: "destructive", icon: AlertTriangle },
    { key: "today", label: "Para hoje", value: dueBuckets.today, tone: "warning", icon: CalendarClock },
    { key: "upcoming", label: "Em dia", value: dueBuckets.upcoming, tone: "success", icon: CheckCircle2 },
  ];

  const rangeQuery = rangeWindow
    ? `&from=${encodeURIComponent(rangeWindow.from.toISOString())}&to=${encodeURIComponent(rangeWindow.to.toISOString())}`
    : "";
  const cardHref = (columnId: string) =>
    `/tickets?board=${activeBoardId}&stage=${columnId}&entry=all${rangeQuery}`;
  const dueHref = (bucket: string) =>
    `/tickets?board=${activeBoardId}&entry=all&due=${bucket}`;

  if (boards.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10">
        <EmptyState
          icon={LayoutGrid}
          title="Nenhum quadro ainda"
          description="Crie um Kanban em Tarefas para ver os indicadores aqui."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {presentKinds.length > 1 ? (
          <div className="inline-flex flex-wrap gap-1 rounded-full border bg-card p-1">
            {presentKinds.map((k) => {
              const meta = TASK_BOARD_KIND_META[k];
              const Icon = meta.icon;
              const active = activeKind === k;
              return (
                <button
                  key={k}
                  onClick={() => onKindChange(k)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={activeBoardId} onValueChange={onBoardChange}>
            <SelectTrigger className="w-full sm:w-64">
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
          <Select value={range} onValueChange={onRangeChange}>
            <SelectTrigger className="w-full sm:w-44">
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

      {/* Por vencimento — 3 cards fortes */}
      <div className="grid gap-4 sm:grid-cols-3">
        {dueCards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.key} href={dueHref(c.key)} className="group block">
              <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div
                  className={cn(
                    "pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-10 blur-2xl",
                    TONE_DOT_CLASS[c.tone],
                  )}
                />
                <div className="relative flex items-start justify-between">
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl",
                      TONE_SOFT_BG[c.tone],
                      TONE_TEXT_CLASS[c.tone],
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {loading ? (
                  <Skeleton className="relative mt-4 h-11 w-16" />
                ) : (
                  <p className={cn("relative mt-4 text-5xl font-bold tabular-nums tracking-tight", TONE_TEXT_CLASS[c.tone])}>
                    {c.value}
                  </p>
                )}
                <p className="relative mt-1 text-sm font-medium text-muted-foreground">{c.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Etapas do quadro */}
      <div className="rounded-2xl border bg-card/40 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="size-4" />
            </span>
            {activeBoard?.name ?? "Etapas"}
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
            {loading ? "—" : `${boardTotal} ${boardTotal === 1 ? "item" : "itens"}`}
          </span>
        </div>

        {columns.length === 0 ? (
          <EmptyState title="Sem etapas" description="Este quadro ainda não tem colunas." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {perColumn.map(({ col, taskCount, eventCount, total }) => {
              const hex = isHexColor(col.color);
              const share = boardTotal > 0 ? Math.round((total / boardTotal) * 100) : 0;
              const colorClass = hex ? undefined : TONE_DOT_CLASS[col.color as StageColor];
              const colorStyle = hex ? { backgroundColor: col.color } : undefined;
              return (
                <Link key={col.id} href={cardHref(col.id)} className="group block">
                  <div className="relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <div
                      className={cn("absolute inset-x-0 top-0 h-1.5", colorClass)}
                      style={colorStyle}
                    />
                    <div className="mt-1 flex items-center gap-2">
                      <StageDot color={col.color} icon={col.icon} />
                      <span className="truncate text-sm font-medium">{col.name}</span>
                    </div>
                    {loading ? (
                      <Skeleton className="mt-3 h-9 w-12" />
                    ) : (
                      <p className="mt-3 text-3xl font-bold leading-none tabular-nums">{total}</p>
                    )}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", colorClass)}
                        style={{ ...colorStyle, width: `${share}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground/80">
                      {share}% do quadro
                      {both && total > 0 ? ` · ${taskCount} tar. · ${eventCount} ev.` : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
