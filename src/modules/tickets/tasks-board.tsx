"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { taskBoardsService } from "@/services/task-boards.service";
import { findUser } from "@/services/lookup";
import { useDirectoryStore } from "@/stores/directory-store";
import { useLastBoardStore } from "@/stores/last-board-store";
import { EVENT_MODALITY_META, TONE_DOT_CLASS } from "@/config/domain";
import { formatSmartDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent, TaskBoard, TaskColumn, Ticket } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskCard } from "@/modules/tickets/task-card";
import { TaskBoardDialog } from "@/modules/tickets/task-board-dialog";
import { TaskColumnDialog } from "@/modules/tickets/task-column-dialog";

type Drag = { kind: "task" | "event"; id: string } | null;

export function TasksBoard({
  tickets,
  loading,
  onChanged,
  showTasks = true,
  showEvents = false,
  events = [],
  onOpenEvent,
  onOpenTask,
}: {
  tickets: Ticket[];
  loading?: boolean;
  onChanged?: () => void;
  showTasks?: boolean;
  showEvents?: boolean;
  events?: CalendarEvent[];
  onOpenEvent?: (event: CalendarEvent) => void;
  onOpenTask?: (task: Ticket) => void;
}) {
  const boards = useDirectoryStore((s) => s.taskBoards);
  const allColumns = useDirectoryStore((s) => s.taskColumns);

  const [activeBoardId, setActiveBoardId] = React.useState("");
  const [items, setItems] = React.useState<Ticket[]>(tickets);
  const [evts, setEvts] = React.useState<CalendarEvent[]>(events);
  const [drag, setDrag] = React.useState<Drag>(null);
  const [dragColId, setDragColId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);

  const [boardDialogOpen, setBoardDialogOpen] = React.useState(false);
  const [editingBoard, setEditingBoard] = React.useState<TaskBoard | null>(null);
  const [deletingBoard, setDeletingBoard] = React.useState<TaskBoard | null>(null);
  const [columnDialogOpen, setColumnDialogOpen] = React.useState(false);
  const [editingColumn, setEditingColumn] = React.useState<TaskColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = React.useState<TaskColumn | null>(null);

  React.useEffect(() => setItems(tickets), [tickets]);
  React.useEffect(() => setEvts(events), [events]);

  // Keep a valid active board — restore the last one used, else default/first.
  React.useEffect(() => {
    if (boards.length === 0) {
      setActiveBoardId("");
    } else if (!boards.some((b) => b.id === activeBoardId)) {
      const last = useLastBoardStore.getState().boards["tasks"];
      setActiveBoardId(
        (boards.find((b) => b.id === last) ?? boards.find((b) => b.is_default) ?? boards[0]!).id,
      );
    }
  }, [boards, activeBoardId]);

  React.useEffect(() => {
    if (activeBoardId) useLastBoardStore.getState().set("tasks", activeBoardId);
  }, [activeBoardId]);

  const columns = allColumns
    .filter((c) => c.board_id === activeBoardId)
    .sort((a, b) => a.position - b.position);
  const columnIds = new Set(columns.map((c) => c.id));
  const activeBoard = boards.find((b) => b.id === activeBoardId);

  function tasksFor(column: TaskColumn, index: number) {
    if (!showTasks) return [];
    return items.filter((t) => {
      if (t.board_id !== activeBoardId) return index === 0 && !t.board_id; // orphans → first col
      if (t.column_id === column.id) return true;
      return index === 0 && (!t.column_id || !columnIds.has(t.column_id));
    });
  }
  function eventsFor(column: TaskColumn, index: number) {
    if (!showEvents) return [];
    return evts.filter((e) => {
      if (e.board_id !== activeBoardId) return index === 0 && !e.board_id;
      if (e.column_id === column.id) return true;
      return index === 0 && (!e.column_id || !columnIds.has(e.column_id));
    });
  }

  async function moveTo(column: TaskColumn) {
    const d = drag;
    setOverCol(null);
    setDrag(null);
    if (!d) return;
    if (d.kind === "task") {
      const cur = items.find((t) => t.id === d.id);
      if (!cur || (cur.column_id === column.id && cur.board_id === activeBoardId)) return;
      setItems((prev) =>
        prev.map((t) => (t.id === d.id ? { ...t, board_id: activeBoardId, column_id: column.id } : t)),
      );
      try {
        await taskBoardsService.moveCard("task", d.id, activeBoardId, column.id);
        onChanged?.();
      } catch {
        setItems((prev) =>
          prev.map((t) => (t.id === d.id ? { ...t, board_id: cur.board_id, column_id: cur.column_id } : t)),
        );
        toast.error("Não foi possível mover");
      }
    } else {
      const cur = evts.find((e) => e.id === d.id);
      if (!cur || (cur.column_id === column.id && cur.board_id === activeBoardId)) return;
      setEvts((prev) =>
        prev.map((e) => (e.id === d.id ? { ...e, board_id: activeBoardId, column_id: column.id } : e)),
      );
      try {
        await taskBoardsService.moveCard("event", d.id, activeBoardId, column.id);
        onChanged?.();
      } catch {
        setEvts((prev) =>
          prev.map((e) => (e.id === d.id ? { ...e, board_id: cur.board_id, column_id: cur.column_id } : e)),
        );
        toast.error("Não foi possível mover");
      }
    }
  }

  function reorderColumns(targetColId: string) {
    const fromId = dragColId;
    setDragColId(null);
    setOverCol(null);
    if (!fromId || fromId === targetColId) return;
    const ordered = [...columns];
    const from = ordered.findIndex((c) => c.id === fromId);
    const to = ordered.findIndex((c) => c.id === targetColId);
    if (from === -1 || to === -1) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved!);
    // Optimistic store update, then persist.
    const reindexed = ordered.map((c, i) => ({ ...c, position: i }));
    const others = allColumns.filter((c) => c.board_id !== activeBoardId);
    useDirectoryStore.getState().setData({ taskColumns: [...others, ...reindexed] });
    taskBoardsService.reorderColumns(ordered.map((c) => c.id));
  }

  async function confirmDeleteColumn() {
    const col = deletingColumn;
    if (!col) return;
    setDeletingColumn(null);
    try {
      await taskBoardsService.removeColumn(col.id, col.board_id);
      await useDirectoryStore.getState().refreshTaskBoards();
      toast.success("Bloco excluído");
      onChanged?.();
    } catch {
      toast.error("Não foi possível excluir o bloco");
    }
  }

  async function confirmDeleteBoard() {
    const board = deletingBoard;
    if (!board) return;
    setDeletingBoard(null);
    try {
      await taskBoardsService.removeBoard(board.id);
      await useDirectoryStore.getState().refreshTaskBoards();
      toast.success("Kanban excluído");
      onChanged?.();
    } catch {
      toast.error("Não foi possível excluir o kanban");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Board selector */}
      <div className="flex flex-wrap items-center gap-2">
        {boards.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBoardId(b.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              b.id === activeBoardId
                ? "border-primary bg-primary/10 text-primary"
                : "bg-card hover:border-primary/40",
            )}
          >
            {b.name}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingBoard(null);
            setBoardDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo kanban
        </Button>
        {activeBoard && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Gerenciar kanban">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => {
                  setEditingBoard(activeBoard);
                  setBoardDialogOpen(true);
                }}
              >
                <Pencil /> Renomear kanban
              </DropdownMenuItem>
              {!activeBoard.is_default && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeletingBoard(activeBoard)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 /> Excluir kanban
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Columns */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
        {columns.map((column, index) => {
          const cards = tasksFor(column, index);
          const colEvents = eventsFor(column, index);
          const isOver = overCol === column.id;
          return (
            <div
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(column.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setOverCol(null);
              }}
              onDrop={() => (dragColId ? reorderColumns(column.id) : moveTo(column))}
              className={cn(
                "flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-muted/30 transition-colors",
                isOver && "border-primary/50 bg-accent/40",
                dragColId === column.id && "opacity-50",
              )}
            >
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  setDragColId(column.id);
                }}
                onDragEnd={() => {
                  setDragColId(null);
                  setOverCol(null);
                }}
                className="flex cursor-grab items-center gap-2 px-3 py-3 active:cursor-grabbing"
              >
                <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                <span className={cn("size-2.5 rounded-full", TONE_DOT_CLASS[column.color])} />
                <h3 className="truncate text-sm font-semibold">{column.name}</h3>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {cards.length + colEvents.length}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="ml-auto">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingColumn(column);
                        setColumnDialogOpen(true);
                      }}
                    >
                      <Pencil /> Editar bloco
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeletingColumn(column)}
                      className="text-destructive focus:text-destructive"
                      disabled={columns.length <= 1}
                    >
                      <Trash2 /> Excluir bloco
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-3">
                {loading ? (
                  <div className="h-24 animate-pulse rounded-xl bg-muted" />
                ) : cards.length === 0 && colEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">
                    Arraste cartões para cá
                  </div>
                ) : (
                  <>
                    {colEvents.map((e) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        onOpen={onOpenEvent}
                        onDragStart={() => setDrag({ kind: "event", id: e.id })}
                        onDragEnd={() => {
                          setDrag(null);
                          setOverCol(null);
                        }}
                      />
                    ))}
                    {cards.map((t) => (
                      <TaskCard
                        key={t.id}
                        ticket={t}
                        draggable
                        onOpen={onOpenTask}
                        onDragStart={() => setDrag({ kind: "task", id: t.id })}
                        onDragEnd={() => {
                          setDrag(null);
                          setOverCol(null);
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Add column */}
        {activeBoardId && (
          <button
            onClick={() => {
              setEditingColumn(null);
              setColumnDialogOpen(true);
            }}
            className="flex h-12 w-[280px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 hover:text-foreground"
          >
            <Plus className="size-4" /> Novo bloco
          </button>
        )}
      </div>

      <TaskBoardDialog
        open={boardDialogOpen}
        onOpenChange={setBoardDialogOpen}
        board={editingBoard}
        onSaved={(id) => id && setActiveBoardId(id)}
      />
      <TaskColumnDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        boardId={activeBoardId}
        column={editingColumn}
        onSaved={onChanged}
      />

      <Dialog open={Boolean(deletingColumn)} onOpenChange={(o) => !o && setDeletingColumn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir bloco</DialogTitle>
            <DialogDescription>
              O bloco <strong>{deletingColumn?.name}</strong> será removido e seus cartões irão para
              o primeiro bloco do kanban. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingColumn(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteColumn}>
              Excluir bloco
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingBoard)} onOpenChange={(o) => !o && setDeletingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir kanban</DialogTitle>
            <DialogDescription>
              O kanban <strong>{deletingBoard?.name}</strong> e seus blocos serão removidos. Os
              cartões ficam sem quadro até serem reatribuídos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingBoard(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteBoard}>
              Excluir kanban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({
  event: e,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  event: CalendarEvent;
  onOpen?: (event: CalendarEvent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const owner = findUser(e.owner_id);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen?.(e)}
      className="group w-full cursor-pointer rounded-xl border border-primary/20 bg-accent/20 p-3 text-left shadow-xs transition-all hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <CalendarDays className="size-3.5 text-primary" />
        <Badge variant="secondary" className="text-[10px]">
          {EVENT_MODALITY_META[e.modality ?? "not_applicable"].label}
        </Badge>
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug">{e.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatSmartDate(e.starts_at)}</p>
      <div className="mt-2 flex items-center justify-between">
        {(e.tags ?? []).length > 0 ? (
          <Badge variant="outline" className="text-[10px] capitalize">
            {e.tags![0]}
          </Badge>
        ) : (
          <span />
        )}
        <UserAvatar name={owner?.name} src={owner?.avatar_url} className="size-6" />
      </div>
    </div>
  );
}
