"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Flag,
  Layers,
  LayoutGrid,
  Link2,
  List,
  Plus,
  Search,
  Shapes,
  Tag as TagIcon,
  UserCheck,
  Users,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ticketsService,
  type AttributionRelation,
  type TicketFilters,
} from "@/services/tickets.service";
import { usersService } from "@/services/users.service";
import { calendarService } from "@/services/calendar.service";
import { tagsService } from "@/services/tags.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory, useDirectoryStore } from "@/stores/directory-store";
import { useUIStore } from "@/stores/ui-store";
import { TICKET_PRIORITY_META, TICKET_SUBJECT_META } from "@/config/domain";
import { eventCode } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Ticket, TicketPriority, TicketSubjectType } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { finalizeEvent, finalizeTask } from "@/services/finalize.service";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TasksBoard } from "@/modules/tickets/tasks-board";
import { UnifiedList, type AgendaRow } from "@/modules/tickets/unified-list";
import { TasksCalendar, type PeriodMode } from "@/modules/tickets/tasks-calendar";
import { TicketFormDialog } from "@/modules/tickets/ticket-form-dialog";
import { TaskDrawer } from "@/modules/tickets/task-drawer";
import { NewEventDialog } from "@/modules/calendar/new-event-dialog";
import { EventDrawer } from "@/modules/calendar/event-drawer";

type EntryType = "tasks" | "events";

const PERIOD_LABEL: Record<PeriodMode, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  range: "Intervalo",
};

const TYPE_OPTIONS = [
  { value: "tasks", label: "Tarefas" },
  { value: "events", label: "Eventos" },
];

const RELATION_LABEL: Record<AttributionRelation, string> = {
  assignee: "Responsável",
  participant: "Envolvidos",
  creator: "Quem criou",
};

const RELATION_OPTIONS = (Object.keys(RELATION_LABEL) as AttributionRelation[]).map((r) => ({
  value: r,
  label: RELATION_LABEL[r],
}));

const PRIORITY_OPTIONS = Object.entries(TICKET_PRIORITY_META).map(([value, m]) => ({
  value,
  label: m.label,
}));

const SUBJECT_OPTIONS = Object.entries(TICKET_SUBJECT_META).map(([value, m]) => ({
  value,
  label: m.label,
}));

export function TasksView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  useDirectory();
  const taskBoards = useDirectoryStore((s) => s.taskBoards);
  const taskColumns = useDirectoryStore((s) => s.taskColumns);
  const { taskView, setTaskView } = useUIStore();
  const isCalendar = taskView === "calendar";

  const [search, setSearch] = React.useState("");
  const [priorities, setPriorities] = React.useState<TicketPriority[]>([]);
  const [relations, setRelations] = React.useState<AttributionRelation[]>(["assignee"]);
  const [personIds, setPersonIds] = React.useState<string[]>([]);
  const [tagFilter, setTagFilter] = React.useState<string[]>([]);
  const [boardFilter, setBoardFilter] = React.useState<string[]>([]);
  const [hideClosed, setHideClosed] = React.useState(false);
  const [subjectFilter, setSubjectFilter] = React.useState<string[]>([]);
  const [entryTypes, setEntryTypes] = React.useState<EntryType[]>(["tasks", "events"]);

  // Shared time window (Dia/Semana/Mês/Intervalo) used by all three views.
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>("month");
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [rangeFrom, setRangeFrom] = React.useState("");
  const [rangeTo, setRangeTo] = React.useState("");
  const [newTaskOpen, setNewTaskOpen] = React.useState(false);
  const [newTaskType, setNewTaskType] = React.useState<TicketSubjectType>("internal");
  const [newEventOpen, setNewEventOpen] = React.useState(false);
  const [newEventType, setNewEventType] = React.useState<TicketSubjectType>("internal");

  const openNewTask = (type: TicketSubjectType) => {
    setNewTaskType(type);
    setNewTaskOpen(true);
  };
  const openNewEvent = (type: TicketSubjectType) => {
    setNewEventType(type);
    setNewEventOpen(true);
  };
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<Ticket | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<AgendaRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [bulkDelete, setBulkDelete] = React.useState<{
    rows: AgendaRow[];
    clear: () => void;
  } | null>(null);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [finalizeRow, setFinalizeRow] = React.useState<AgendaRow | null>(null);
  const [finalizing, setFinalizing] = React.useState(false);

  function handleView(row: AgendaRow) {
    if (row.kind === "task") setSelectedTask(row.task);
    else setSelectedEvent(row.event);
  }
  function handleOpenSingle(row: AgendaRow) {
    // Tasks have a dedicated single page; events use the quick-view drawer.
    if (row.kind === "task") router.push(`/tickets/${row.task.id}`);
    else setSelectedEvent(row.event);
  }
  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      if (deleteRow.kind === "task") {
        await ticketsService.remove(deleteRow.task.id);
        refetch();
      } else {
        await calendarService.remove(deleteRow.event.id);
        refetchEvents();
      }
      toast.success("Movido para a lixeira");
      setDeleteRow(null);
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  }
  async function confirmBulkDelete() {
    if (!bulkDelete) return;
    setBulkDeleting(true);
    let ok = 0;
    let fail = 0;
    let touchedTask = false;
    let touchedEvent = false;
    for (const row of bulkDelete.rows) {
      try {
        if (row.kind === "task") {
          await ticketsService.remove(row.task.id);
          touchedTask = true;
        } else {
          await calendarService.remove(row.event.id);
          touchedEvent = true;
        }
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkDeleting(false);
    toast.success(`${ok} item(ns) movido(s) para a lixeira${fail ? `, ${fail} com erro` : ""}.`);
    bulkDelete.clear();
    setBulkDelete(null);
    if (touchedTask) refetch();
    if (touchedEvent) refetchEvents();
  }

  async function confirmFinalize() {
    if (!finalizeRow) return;
    setFinalizing(true);
    try {
      if (finalizeRow.kind === "task") {
        await finalizeTask(finalizeRow.task);
        refetch();
      } else {
        await finalizeEvent(finalizeRow.event);
        refetchEvents();
      }
      toast.success("Finalizado com sucesso");
      setFinalizeRow(null);
    } catch {
      toast.error("Não foi possível finalizar");
    } finally {
      setFinalizing(false);
    }
  }

  // Empty selection = show both.
  const showTasks = entryTypes.length === 0 || entryTypes.includes("tasks");
  const showEvents = entryTypes.length === 0 || entryTypes.includes("events");

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setNewTaskOpen(true);
  }, [searchParams]);

  const { data: users } = useAsyncData(() => usersService.list());
  const { data: allTags } = useAsyncData(() => tagsService.list());
  // Tag filter options that apply to tasks or events (both are listed here).
  const tags = (allTags ?? []).filter(
    (t) => t.modules.length === 0 || t.modules.includes("tasks") || t.modules.includes("events"),
  );

  const filters: TicketFilters = { search, priorities, relations, personIds, tags: tagFilter };
  const { data, loading, refetch } = useAsyncData(
    () => ticketsService.list(filters),
    [search, priorities.join(","), relations.join(","), personIds.join(","), tagFilter.join(",")],
  );
  const { data: eventsData, refetch: refetchEvents } = useAsyncData(() => calendarService.list());

  // Local mirrors of the fetched lists. A freshly-created task/event is the
  // fully-populated object returned by the service (tags/stage/responsável
  // included), so we prepend it right away instead of waiting on the refetch
  // round-trip — which is what caused new rows to render with blank
  // etiqueta/etapa/responsável until a manual reload.
  const [localTickets, setLocalTickets] = React.useState<Ticket[]>([]);
  const [localEvents, setLocalEvents] = React.useState<CalendarEvent[]>([]);
  React.useEffect(() => {
    if (data) setLocalTickets(data);
  }, [data]);
  React.useEffect(() => {
    if (eventsData) setLocalEvents(eventsData);
  }, [eventsData]);

  const handleTaskCreated = (created?: Ticket) => {
    if (created) setLocalTickets((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
    refetch();
  };
  const handleEventCreated = (created?: CalendarEvent) => {
    if (created) setLocalEvents((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
    refetchEvents();
  };

  // Deep-link from global search: ?event=<id> opens the event drawer.
  React.useEffect(() => {
    const eventId = searchParams.get("event");
    if (!eventId || !eventsData) return;
    const found = eventsData.find((e) => e.id === eventId);
    if (found) setSelectedEvent(found);
  }, [searchParams, eventsData]);

  const boardOk = (boardId?: string | null) =>
    boardFilter.length === 0 || (!!boardId && boardFilter.includes(boardId));
  const subjectOk = (subject?: string | null) =>
    subjectFilter.length === 0 || (!!subject && subjectFilter.includes(subject));
  const terminalColumnIds = React.useMemo(
    () => new Set(taskColumns.filter((c) => c.is_terminal).map((c) => c.id)),
    [taskColumns],
  );
  const closedOk = (columnId?: string | null) =>
    !hideClosed || !columnId || !terminalColumnIds.has(columnId);

  // The active time window. `null` while a custom range is incomplete (= no filter).
  const periodWindow = React.useMemo<{ from: Date; to: Date } | null>(() => {
    if (periodMode === "range") {
      if (!rangeFrom || !rangeTo) return null;
      return {
        from: startOfDay(new Date(`${rangeFrom}T00:00:00`)),
        to: endOfDay(new Date(`${rangeTo}T00:00:00`)),
      };
    }
    if (periodMode === "day") return { from: startOfDay(cursor), to: endOfDay(cursor) };
    if (periodMode === "week")
      return {
        from: startOfWeek(cursor, { weekStartsOn: 0 }),
        to: endOfWeek(cursor, { weekStartsOn: 0 }),
      };
    return { from: startOfMonth(cursor), to: endOfMonth(cursor) };
  }, [periodMode, cursor, rangeFrom, rangeTo]);

  const inWindow = React.useCallback(
    (iso?: string | null) => {
      if (!periodWindow || !iso) return false;
      const t = +new Date(iso);
      return t >= +periodWindow.from && t <= +periodWindow.to;
    },
    [periodWindow],
  );
  // Tasks: keep undated ones always visible; date the rest to the window.
  const taskInWindow = (t: Ticket) => !periodWindow || !t.due_at || inWindow(t.due_at);

  const navigatePeriod = (dir: -1 | 1) =>
    setCursor((c) =>
      periodMode === "day" ? addDays(c, dir) : periodMode === "week" ? addWeeks(c, dir) : addMonths(c, dir),
    );

  const periodLabel =
    periodMode === "day"
      ? format(cursor, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      : periodMode === "week" && periodWindow
        ? `${format(periodWindow.from, "d MMM", { locale: ptBR })} – ${format(periodWindow.to, "d MMM", { locale: ptBR })}`
        : format(cursor, "MMMM yyyy", { locale: ptBR });

  const tickets = (showTasks ? localTickets : []).filter(
    (t) => boardOk(t.board_id) && subjectOk(t.subject_type) && closedOk(t.column_id) && taskInWindow(t),
  );

  // Apply the same people/attribution/tags/search filters to events.
  const filteredEvents = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const rels = relations.length ? relations : (["assignee", "participant", "creator"] as const);
    return localEvents.filter((e) => {
      if (q) {
        const hit =
          e.title.toLowerCase().includes(q) ||
          eventCode(e.number).toLowerCase().includes(q) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (personIds.length) {
        const match = rels.some((rel) =>
          rel === "creator"
            ? !!e.created_by && personIds.includes(e.created_by)
            : rel === "participant"
              ? (e.participant_ids ?? []).some((id) => personIds.includes(id))
              : !!e.owner_id && personIds.includes(e.owner_id),
        );
        if (!match) return false;
      }
      if (tagFilter.length && !(e.tags ?? []).some((t) => tagFilter.includes(t))) return false;
      if (subjectFilter.length && !subjectFilter.includes(e.subject_type)) return false;
      if (!boardOk(e.board_id)) return false;
      if (!closedOk(e.column_id)) return false;
      if (periodWindow && !inWindow(e.starts_at)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localEvents, search, relations, personIds, tagFilter, subjectFilter, boardFilter, hideClosed, terminalColumnIds, periodWindow, inWindow]);

  const events = showEvents ? filteredEvents : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <PageHeader
        title="Tarefas & Agenda"
        description="Quadro, lista e calendário das tarefas e compromissos da equipe."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus /> Criar <ChevronDown className="opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Plus /> Nova tarefa
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {(Object.keys(TICKET_SUBJECT_META) as TicketSubjectType[]).map((type) => {
                    const { label, icon: Icon } = TICKET_SUBJECT_META[type];
                    return (
                      <DropdownMenuItem key={type} onClick={() => openNewTask(type)}>
                        <Icon /> {label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CalendarPlus /> Novo evento
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {(Object.keys(TICKET_SUBJECT_META) as TicketSubjectType[]).map((type) => {
                    const { label, icon: Icon } = TICKET_SUBJECT_META[type];
                    return (
                      <DropdownMenuItem key={type} onClick={() => openNewEvent(type)}>
                        <Icon /> {label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Pesquisar por palavra..."
            startIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <MultiSelect
          icon={<Shapes />}
          options={TYPE_OPTIONS}
          values={entryTypes}
          onChange={(v) => setEntryTypes(v as EntryType[])}
          placeholder="Tarefas e eventos"
          searchPlaceholder="Tipo..."
        />

        <MultiSelect
          icon={<Flag />}
          options={PRIORITY_OPTIONS}
          values={priorities}
          onChange={(v) => setPriorities(v as TicketPriority[])}
          placeholder="Toda prioridade"
          searchPlaceholder="Buscar prioridade..."
        />

        <MultiSelect
          icon={<Link2 />}
          options={SUBJECT_OPTIONS}
          values={subjectFilter}
          onChange={setSubjectFilter}
          placeholder="Todo tipo"
          searchPlaceholder="Buscar tipo..."
        />

        {/* Attribution dimension (multiple) + people */}
        <MultiSelect
          icon={<UserCheck />}
          options={RELATION_OPTIONS}
          values={relations}
          onChange={(v) => setRelations(v as AttributionRelation[])}
          placeholder="Atribuição"
          searchPlaceholder="Atribuição..."
        />

        <MultiSelect
          icon={<Users />}
          options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
          values={personIds}
          onChange={setPersonIds}
          placeholder="Todas as pessoas"
          searchPlaceholder="Buscar pessoa..."
          allLabel="Todos"
        />

        <MultiSelect
          icon={<TagIcon />}
          options={(tags ?? []).map((t) => ({ value: t.name, label: t.name }))}
          values={tagFilter}
          onChange={setTagFilter}
          placeholder="Todas as tags"
          searchPlaceholder="Buscar tag..."
          emptyText="Nenhuma tag."
          allLabel="Todas"
        />

        <MultiSelect
          icon={<Layers />}
          options={taskBoards.map((b) => ({ value: b.id, label: b.name }))}
          values={boardFilter}
          onChange={setBoardFilter}
          placeholder="Todos os kanbans"
          searchPlaceholder="Buscar kanban..."
          allLabel="Todos"
          allMode="selectAll"
        />

        <Button
          variant={hideClosed ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setHideClosed((v) => !v)}
        >
          <EyeOff /> Ocultar concluídos
        </Button>

        {/* View switcher — Lista, Quadro, Calendário */}
        <div className="ml-auto inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
          <ViewButton active={taskView === "list"} onClick={() => setTaskView("list")} icon={List} label="Lista" />
          <ViewButton active={taskView === "board"} onClick={() => setTaskView("board")} icon={LayoutGrid} label="Quadro" />
          <ViewButton active={isCalendar} onClick={() => setTaskView("calendar")} icon={CalendarDays} label="Calendário" />
        </div>
      </div>

      {/* Period control — shared by Lista, Quadro and Calendário */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
          {(Object.keys(PERIOD_LABEL) as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setPeriodMode(m)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                periodMode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIOD_LABEL[m]}
            </button>
          ))}
        </div>

        {periodMode === "range" ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="h-9 w-[150px]"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="h-9 w-[150px]"
            />
            {(!rangeFrom || !rangeTo) && (
              <span className="text-xs text-muted-foreground">Selecione início e fim</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => navigatePeriod(-1)}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => navigatePeriod(1)}>
              <ChevronRight />
            </Button>
            <span className="ml-1 text-sm font-medium capitalize">{periodLabel}</span>
          </div>
        )}
      </div>

      {/* Views */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {taskView === "board" && (
          <TasksBoard
            tickets={tickets}
            loading={loading}
            onChanged={refetch}
            showTasks={showTasks}
            showEvents={showEvents}
            events={events}
            onOpenEvent={setSelectedEvent}
            onOpenTask={(t) => router.push(`/tickets/${t.id}`)}
          />
        )}
        {taskView === "list" && (
          <div className="h-full overflow-y-auto">
            <UnifiedList
              tickets={tickets}
              events={events}
              loading={loading}
              onView={handleView}
              onOpenSingle={handleOpenSingle}
              onFinalize={setFinalizeRow}
              onDelete={setDeleteRow}
              onBulkDelete={(rows, clear) => setBulkDelete({ rows, clear })}
              onChanged={() => {
                refetch();
                refetchEvents();
              }}
            />
          </div>
        )}
        {isCalendar && (
          <TasksCalendar
            tickets={tickets}
            events={events}
            mode={periodMode}
            cursor={cursor}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onOpenTask={(t) => router.push(`/tickets/${t.id}`)}
            onOpenEvent={setSelectedEvent}
          />
        )}
      </div>

      <TicketFormDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        initialSubjectType={newTaskType}
        onSaved={handleTaskCreated}
      />
      <NewEventDialog
        open={newEventOpen}
        onOpenChange={setNewEventOpen}
        defaultDate={new Date()}
        initialSubjectType={newEventType}
        onSaved={handleEventCreated}
      />
      <EventDrawer
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(o) => !o && setSelectedEvent(null)}
        onChanged={refetchEvents}
      />
      <TaskDrawer
        ticket={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(o) => !o && setSelectedTask(null)}
        onChanged={refetch}
      />

      <ConfirmDialog
        open={Boolean(finalizeRow)}
        onOpenChange={(o) => !o && setFinalizeRow(null)}
        title={`Finalizar ${finalizeRow?.kind === "event" ? "evento" : "tarefa"}`}
        description={
          finalizeRow?.kind === "event"
            ? "O evento será marcado como finalizado."
            : 'A tarefa será movida para a etapa "Fechado".'
        }
        confirmLabel="Finalizar"
        loading={finalizing}
        onConfirm={confirmFinalize}
      />

      <Dialog open={Boolean(deleteRow)} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir {deleteRow?.kind === "event" ? "evento" : "tarefa"}
            </DialogTitle>
            <DialogDescription>
              {deleteRow?.kind === "event" ? "O evento" : "A tarefa"}{" "}
              <strong>
                {deleteRow?.kind === "event" ? deleteRow.event.title : deleteRow?.task.title}
              </strong>{" "}
              será removido permanentemente. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRow(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} loading={deleting}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(bulkDelete)} onOpenChange={(o) => !o && setBulkDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir selecionados</DialogTitle>
            <DialogDescription>
              <strong>{bulkDelete?.rows.length}</strong> item(ns) (tarefas e/ou eventos) serão
              movidos para a lixeira.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete} loading={bulkDeleting}>
              Excluir selecionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
