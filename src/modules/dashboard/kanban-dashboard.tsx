"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  LayoutGrid,
  ListChecks,
} from "lucide-react";
import { ticketsService } from "@/services/tickets.service";
import { calendarService } from "@/services/calendar.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory, useDirectoryStore } from "@/stores/directory-store";
import { useViewCompanyStore } from "@/stores/view-company-store";
import { TONE_DOT_CLASS, TONE_TEXT_CLASS } from "@/config/domain";
import { StageDot } from "@/components/common/style-pickers";
import { isHexColor } from "@/lib/tag-color";
import { cn } from "@/lib/utils";
import type { CalendarEvent, StageColor, TaskColumn, Ticket } from "@/types/domain";
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

type Scope = "all" | "tasks" | "events";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "tasks", label: "Tarefas" },
  { key: "events", label: "Agenda" },
];

/** Barra colorida fina do rodapé do card (por tom predefinido). */
const TONE_BAR: Record<StageColor, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

/** Tarefa aberta = ainda em andamento (não resolvida/fechada). */
const isOpen = (t: Ticket) =>
  t.status === "open" || t.status === "in_progress" || t.status === "waiting_customer";

/**
 * Dashboard de Kanbans. O usuário escolhe um quadro (task_board) e vê as etapas
 * (colunas) daquele quadro com a contagem de itens em cada uma. O alternador
 * "Tudo / Tarefas / Agenda" define se conta tarefas (tickets), eventos
 * (calendar_events) ou ambos — os dois módulos compartilham os mesmos quadros.
 */
export function KanbanDashboard() {
  useDirectory();
  const boards = useDirectoryStore((s) => s.taskBoards);
  const allColumns = useDirectoryStore((s) => s.taskColumns);
  const viewCompanyId = useViewCompanyStore((s) => s.companyId);

  const { data: tickets } = useAsyncData(() => ticketsService.list(), [viewCompanyId]);
  const { data: events } = useAsyncData(() => calendarService.list(), [viewCompanyId]);

  const [boardId, setBoardId] = React.useState("");
  const [scope, setScope] = React.useState<Scope>("all");

  // Preferências guardadas por dispositivo (voltam selecionadas).
  React.useEffect(() => {
    const b = localStorage.getItem("dashboard_kanban_board");
    if (b) setBoardId(b);
    const s = localStorage.getItem("dashboard_kanban_scope");
    if (s === "all" || s === "tasks" || s === "events") setScope(s);
  }, []);

  const activeBoardId =
    boards.some((b) => b.id === boardId)
      ? boardId
      : (boards.find((b) => b.is_default)?.id ?? boards[0]?.id ?? "");

  const onBoardChange = (v: string) => {
    setBoardId(v);
    localStorage.setItem("dashboard_kanban_board", v);
  };
  const onScopeChange = (s: Scope) => {
    setScope(s);
    localStorage.setItem("dashboard_kanban_scope", s);
  };

  const showTasks = scope !== "events";
  const showEvents = scope !== "tasks";
  const loading = !tickets || !events;

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
          ? (tickets ?? []).filter((t) => inColumn(t, col, i)).length
          : 0;
        const eventCount = showEvents
          ? (events ?? []).filter((e) => inColumn(e, col, i)).length
          : 0;
        return { col, taskCount, eventCount, total: taskCount + eventCount };
      }),
    [columns, tickets, events, showTasks, showEvents, inColumn],
  );

  // Itens do quadro ativo (para o resumo por status).
  const boardTasks = React.useMemo(
    () =>
      showTasks ? (tickets ?? []).filter((t) => columns.some((c, i) => inColumn(t, c, i))) : [],
    [tickets, columns, showTasks, inColumn],
  );
  const boardEvents = React.useMemo(
    () =>
      showEvents ? (events ?? []).filter((e) => columns.some((c, i) => inColumn(e, c, i))) : [],
    [events, columns, showEvents, inColumn],
  );

  const now = Date.now();
  const totalItems = perColumn.reduce((s, c) => s + c.total, 0);
  const openCount = boardTasks.filter(isOpen).length;
  const overdueCount = boardTasks.filter(
    (t) => isOpen(t) && t.due_at != null && +new Date(t.due_at) < now,
  ).length;
  const doneCount = boardTasks.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  ).length;
  const finishedEvents = boardEvents.filter((e) => e.finished).length;
  const upcomingEvents = boardEvents.filter(
    (e) => !e.finished && +new Date(e.starts_at) >= now,
  ).length;

  const boardQ = activeBoardId ? `?board=${activeBoardId}` : "";
  const summary: {
    key: string;
    label: string;
    value: number;
    tone: StageColor;
    icon: typeof LayoutGrid;
    href: string;
  }[] = [
    {
      key: "total",
      label: scope === "events" ? "Eventos" : scope === "tasks" ? "Tarefas" : "Itens",
      value: totalItems,
      tone: "primary",
      icon: LayoutGrid,
      href: `/tickets${boardQ}`,
    },
  ];
  if (showTasks) {
    summary.push(
      {
        key: "open",
        label: "Em aberto",
        value: openCount,
        tone: "warning",
        icon: CircleDashed,
        href: `/tickets?status=open${activeBoardId ? `&board=${activeBoardId}` : ""}`,
      },
      {
        key: "overdue",
        label: "Em atraso",
        value: overdueCount,
        tone: "destructive",
        icon: AlertTriangle,
        href: `/tickets?status=overdue${activeBoardId ? `&board=${activeBoardId}` : ""}`,
      },
      {
        key: "done",
        label: "Concluídas",
        value: doneCount,
        tone: "success",
        icon: CheckCircle2,
        href: `/tickets${boardQ}`,
      },
    );
  }
  if (showEvents && !showTasks) {
    summary.push(
      {
        key: "upcoming",
        label: "A realizar",
        value: upcomingEvents,
        tone: "warning",
        icon: CalendarClock,
        href: `/tickets${boardQ}`,
      },
      {
        key: "finished",
        label: "Realizados",
        value: finishedEvents,
        tone: "success",
        icon: CheckCircle2,
        href: `/tickets${boardQ}`,
      },
    );
  }

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
      {/* Controles: seletor de quadro + alternador de tipo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-64">
          <Select value={activeBoardId} onValueChange={onBoardChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um Kanban" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="inline-flex rounded-lg border p-0.5">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => onScopeChange(s.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                scope === s.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.key} href={m.href} className="group block">
              <Card className="relative overflow-hidden p-5 transition-all duration-200 hover:border-foreground/15 hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                    <span className={cn("size-2 rounded-full", TONE_DOT_CLASS[m.tone])} />
                    {m.label}
                  </span>
                  <Icon className={cn("size-[18px]", TONE_TEXT_CLASS[m.tone])} />
                </div>
                {loading ? (
                  <Skeleton className="mt-4 h-10 w-16" />
                ) : (
                  <p className="mt-4 text-4xl font-bold leading-none tracking-tight tabular-nums">
                    {m.value}
                  </p>
                )}
              </Card>
            </Link>
          );
        })}
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
                <Link
                  key={col.id}
                  href={`/tickets${boardQ}`}
                  className="group block"
                >
                  <Card className="relative overflow-hidden p-4 transition-all duration-200 hover:border-foreground/15 hover:shadow-md">
                    <div
                      className={cn(
                        "absolute inset-x-0 bottom-0 h-1",
                        hex ? "" : TONE_BAR[col.color as StageColor],
                      )}
                      style={hex ? { backgroundColor: col.color } : undefined}
                    />
                    <div className="flex items-center gap-2">
                      <StageDot color={col.color} icon={col.icon} />
                      <span className="truncate text-sm font-medium">{col.name}</span>
                    </div>
                    {loading ? (
                      <Skeleton className="mt-3 h-9 w-14" />
                    ) : (
                      <p className="mt-3 text-3xl font-bold leading-none tabular-nums">{total}</p>
                    )}
                    {!loading && scope === "all" && total > 0 && (
                      <p className="mt-2 text-[11px] tabular-nums text-muted-foreground/70">
                        {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"} · {eventCount}{" "}
                        {eventCount === 1 ? "evento" : "eventos"}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
