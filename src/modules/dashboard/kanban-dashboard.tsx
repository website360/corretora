"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, ListChecks } from "lucide-react";
import { ticketsService } from "@/services/tickets.service";
import { calendarService } from "@/services/calendar.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory, useDirectoryStore } from "@/stores/directory-store";
import { useViewCompanyStore } from "@/stores/view-company-store";
import { TASK_BOARD_KINDS, TASK_BOARD_KIND_META } from "@/config/domain";
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

/** Barra colorida fina do rodapé do card (por tom predefinido). */
const TONE_BAR: Record<StageColor, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

/**
 * Dashboard de Kanbans. Os quadros são separados por TIPO (Tarefas / Agenda /
 * Outro). O usuário escolhe o tipo e depois o quadro; vê as etapas (colunas)
 * daquele quadro com a contagem de itens em cada uma. O tipo do quadro define o
 * que é contado: Tarefas → tickets, Agenda → eventos, Outro → ambos.
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

  // Preferências guardadas por dispositivo (voltam selecionadas).
  React.useEffect(() => {
    const k = localStorage.getItem("dashboard_kanban_kind");
    if (k === "tasks" || k === "agenda" || k === "other") setKind(k);
    const b = localStorage.getItem("dashboard_kanban_board");
    if (b) setBoardId(b);
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

  // Tarefas → só tickets; Agenda → só eventos; Outro → ambos.
  const showTasks = activeKind !== "agenda";
  const showEvents = activeKind !== "tasks";
  const both = showTasks && showEvents;
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

  const boardQ = activeBoardId ? `?board=${activeBoardId}` : "";

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

      {/* Seletor de quadro do tipo ativo */}
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
                <Link key={col.id} href={`/tickets${boardQ}`} className="group block">
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
                    {!loading && both && total > 0 && (
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
