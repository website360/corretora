"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  KanbanSquare,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { kanbanService } from "@/services/kanban.service";
import { customersService } from "@/services/customers.service";
import { companySettingsService } from "@/services/company-settings.service";
import { tagsService } from "@/services/tags.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory } from "@/stores/directory-store";
import { useLastBoardStore } from "@/stores/last-board-store";
import { useSession } from "@/contexts/session-context";
import { findUser } from "@/services/lookup";
import { TONE_BADGE_CLASS, TONE_DOT_CLASS } from "@/config/domain";
import { formatPhone } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Customer, KanbanColumn, StageColor } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/common/tag-badge";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerFormDialog } from "@/modules/customers/customer-form-dialog";
import { BoardDialog, ColumnDialog } from "@/modules/kanban/kanban-dialogs";
import { LeadsList } from "@/modules/kanban/leads-list";
import { LeadsCalendar } from "@/modules/kanban/leads-calendar";

type LeadView = "board" | "list" | "calendar";

export function KanbanView() {
  const router = useRouter();
  const { user } = useSession();
  useDirectory();
  // Read the wildcard column LIVE (the session copy can be stale after it's
  // changed in Settings), falling back to the session value while loading.
  const { data: liveSettings } = useAsyncData(
    () => companySettingsService.get(user.company.id),
    [user.company.id],
  );
  const wildcardColumnId =
    liveSettings?.wildcardColumnId ?? user.company.settings?.wildcardColumnId ?? null;
  const { data: boards, refetch: refetchBoards } = useAsyncData(() => kanbanService.listBoards());
  const { data: tags } = useAsyncData(() => tagsService.list("customers"));
  const { data: customers, refetch: refetchCustomers } = useAsyncData(() => customersService.list());

  const [activeBoardId, setActiveBoardId] = React.useState<string>("");
  const [columns, setColumns] = React.useState<KanbanColumn[]>([]);
  const [view, setView] = React.useState<LeadView>("board");

  // Dialog state
  const [boardDialog, setBoardDialog] = React.useState<"new" | "edit" | null>(null);
  const [columnDialog, setColumnDialog] = React.useState<{ mode: "new" | "edit"; column?: KanbanColumn } | null>(null);
  const [deleteBoard, setDeleteBoard] = React.useState(false);
  const [deleteColumn, setDeleteColumn] = React.useState<KanbanColumn | null>(null);
  const [leadDialog, setLeadDialog] = React.useState<{ columnId: string } | null>(null);

  // Drag state
  const [dragLeadId, setDragLeadId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);

  const tagColor = (name: string): string =>
    (tags ?? []).find((t) => t.name === name)?.color ?? "neutral";

  // Pick a default/active board.
  React.useEffect(() => {
    if (!boards) return;
    if (boards.length === 0) {
      setActiveBoardId("");
    } else if (!boards.some((b) => b.id === activeBoardId)) {
      // Restore the last board the user was on, else the first.
      const last = useLastBoardStore.getState().boards["leads"];
      setActiveBoardId((boards.find((b) => b.id === last) ?? boards[0]!).id);
    }
  }, [boards, activeBoardId]);

  // Remember the selected board for next time.
  React.useEffect(() => {
    if (activeBoardId) useLastBoardStore.getState().set("leads", activeBoardId);
  }, [activeBoardId]);

  // Load the active board's columns.
  const loadColumns = React.useCallback(() => {
    if (!activeBoardId) {
      setColumns([]);
      return;
    }
    kanbanService.listColumns(activeBoardId).then(setColumns);
  }, [activeBoardId]);

  React.useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  const activeBoard = (boards ?? []).find((b) => b.id === activeBoardId);
  const leads = (customers ?? []).filter((c) => c.kind === "lead" && c.board_id === activeBoardId);
  // List and calendar lenses span every funnel, not just the active board.
  const allLeads = (customers ?? []).filter((c) => c.kind === "lead");

  function cardsFor(column: KanbanColumn, index: number) {
    const columnIds = new Set(columns.map((c) => c.id));
    return leads.filter((l) => {
      if (l.column_id === column.id) return true;
      // Orphan leads (no/unknown column) fall into the first column.
      if (index === 0 && (!l.column_id || !columnIds.has(l.column_id))) return true;
      return false;
    });
  }

  async function moveTo(column: KanbanColumn) {
    const id = dragLeadId;
    setOverCol(null);
    setDragLeadId(null);
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.column_id === column.id) return;
    // Etapa coringa: dropping a lead here converts it into a contato (client).
    if (wildcardColumnId && column.id === wildcardColumnId && lead.kind === "lead") {
      try {
        await customersService.update(id, { kind: "client", board_id: null, column_id: null });
        toast.success(`${lead.name || "Lead"} virou um contato`);
        refetchCustomers();
      } catch {
        toast.error("Não foi possível converter o lead");
      }
      return;
    }
    try {
      await customersService.update(id, { column_id: column.id, board_id: activeBoardId });
      toast.success(`Lead movido para "${column.name}"`);
      refetchCustomers();
    } catch {
      toast.error("Não foi possível mover o lead");
    }
  }

  async function confirmDeleteBoard() {
    if (!activeBoard) return;
    try {
      await kanbanService.removeBoard(activeBoard.id);
      toast.success("Kanban excluído");
      setDeleteBoard(false);
      setActiveBoardId("");
      refetchBoards();
      refetchCustomers();
    } catch {
      toast.error("Não foi possível excluir o kanban");
    }
  }

  async function confirmDeleteColumn() {
    if (!deleteColumn) return;
    try {
      await kanbanService.removeColumn(deleteColumn.id);
      toast.success("Bloco excluído");
      setDeleteColumn(null);
      loadColumns();
      refetchCustomers();
    } catch {
      toast.error("Não foi possível excluir o bloco");
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <PageHeader
        title="Kanban"
        description="Funis de leads — arraste os cartões entre os blocos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
              <ViewButton active={view === "board"} onClick={() => setView("board")} icon={KanbanSquare} label="Kanban" />
              <ViewButton active={view === "list"} onClick={() => setView("list")} icon={List} label="Lista" />
              <ViewButton active={view === "calendar"} onClick={() => setView("calendar")} icon={CalendarDays} label="Calendário" />
            </div>
            {view === "board" && boards && boards.length > 0 && (
              <Select value={activeBoardId} onValueChange={setActiveBoardId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um kanban" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {view === "board" && activeBoard && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title="Opções do kanban">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setBoardDialog("edit")}>
                    <Pencil /> Editar kanban
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setColumnDialog({ mode: "new" })}>
                    <Plus /> Novo bloco
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteBoard(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 /> Excluir kanban
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {view === "board" && (
              <Button variant="outline" onClick={() => setBoardDialog("new")}>
                <Plus /> Novo kanban
              </Button>
            )}
            {view === "board" && activeBoard && columns.length > 0 && (
              <Button onClick={() => setLeadDialog({ columnId: columns[0]!.id })}>
                <Plus /> Novo lead
              </Button>
            )}
          </div>
        }
      />

      {view === "list" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <LeadsList leads={allLeads} loading={!customers} tagColor={tagColor} />
        </div>
      ) : view === "calendar" ? (
        <div className="min-h-0 flex-1">
          <LeadsCalendar leads={allLeads} />
        </div>
      ) : !boards || boards.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="Nenhum kanban ainda"
          description="Crie seu primeiro funil para começar a organizar os leads."
          className="flex-1"
        />
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
            {columns.map((column, index) => {
              const cards = cardsFor(column, index);
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
                  onDrop={() => moveTo(column)}
                  className={cn(
                    "flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-muted/30 transition-colors",
                    isOver && "border-primary/50 bg-accent/40",
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-3">
                    <span className={cn("size-2.5 rounded-full", TONE_DOT_CLASS[column.color])} />
                    <h3 className="truncate text-sm font-semibold">{column.name}</h3>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {cards.length}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="ml-auto">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLeadDialog({ columnId: column.id })}>
                          <Plus /> Adicionar lead
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setColumnDialog({ mode: "edit", column })}
                        >
                          <Pencil /> Editar bloco
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteColumn(column)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 /> Excluir bloco
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-3">
                    {cards.length === 0 ? (
                      <div className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">
                        Arraste leads para cá
                      </div>
                    ) : (
                      cards.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          tagColor={tagColor}
                          onOpen={() => router.push(`/clientes/${lead.id}`)}
                          onDragStart={() => setDragLeadId(lead.id)}
                          onDragEnd={() => {
                            setDragLeadId(null);
                            setOverCol(null);
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setColumnDialog({ mode: "new" })}
              className="flex h-12 w-[280px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30 hover:text-foreground"
            >
              <Plus className="size-4" /> Novo bloco
            </button>
        </div>
      )}

      {/* Dialogs */}
      <BoardDialog
        open={boardDialog !== null}
        onOpenChange={(o) => !o && setBoardDialog(null)}
        board={boardDialog === "edit" ? activeBoard : null}
        onSaved={(boardId) => {
          refetchBoards();
          if (boardId) setActiveBoardId(boardId);
        }}
      />

      {activeBoardId && (
        <ColumnDialog
          open={columnDialog !== null}
          onOpenChange={(o) => !o && setColumnDialog(null)}
          boardId={activeBoardId}
          column={columnDialog?.column ?? null}
          onSaved={loadColumns}
        />
      )}

      <CustomerFormDialog
        open={leadDialog !== null}
        onOpenChange={(o) => !o && setLeadDialog(null)}
        defaultKind="lead"
        lockKind
        defaultBoardId={activeBoardId}
        defaultColumnId={leadDialog?.columnId ?? null}
        onSaved={() => refetchCustomers()}
      />

      <ConfirmDialog
        open={deleteBoard}
        onOpenChange={setDeleteBoard}
        title="Excluir kanban"
        description={
          <>
            O kanban <strong>{activeBoard?.name}</strong> e seus blocos serão removidos. Os leads
            não serão excluídos, apenas desvinculados.
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDeleteBoard}
      />

      <ConfirmDialog
        open={deleteColumn !== null}
        onOpenChange={(o) => !o && setDeleteColumn(null)}
        title="Excluir bloco"
        description={
          <>
            O bloco <strong>{deleteColumn?.name}</strong> será removido. Os leads dele ficarão sem
            bloco (vão para o primeiro).
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDeleteColumn}
      />
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function LeadCard({
  lead,
  tagColor,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  lead: Customer;
  tagColor: (name: string) => string;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const owner = findUser(lead.owner_id);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="group w-full cursor-pointer rounded-xl border bg-card p-3 text-left shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
    >
      <p className="truncate text-sm font-medium">{lead.name || "Sem nome"}</p>
      {lead.phone && (
        <p className="mt-0.5 text-xs text-muted-foreground">{formatPhone(lead.phone)}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((t) => (
            <TagBadge key={t} name={t} color={tagColor(t)} />
          ))}
        </div>
        {owner && <UserAvatar name={owner.name} src={owner.avatar_url} className="size-6 shrink-0" />}
      </div>
    </div>
  );
}
