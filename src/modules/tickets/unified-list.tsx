"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  ListChecks,
  MoreHorizontal,
  RotateCcw,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import { findCarrier, findCustomer, findProduct, findTaskColumn } from "@/services/lookup";
import { ticketsService } from "@/services/tickets.service";
import { calendarService } from "@/services/calendar.service";
import { taskBoardsService } from "@/services/task-boards.service";
import { reopenEvent, reopenTask } from "@/services/finalize.service";
import { InlineSelect, type InlineOption } from "@/components/common/inline-select";
import { InlineDate } from "@/components/common/inline-date";
import {
  EVENT_MODALITY_META,
  TICKET_PRIORITY_META,
  TONE_BADGE_CLASS,
  TONE_DOT_CLASS,
} from "@/config/domain";
import { eventCode, formatShortDate, formatTime, taskCode } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent, StageColor, Ticket } from "@/types/domain";
import {
  LIST_COLUMNS,
  isLockedColumn,
  useListColumnsStore,
  type ListColumnId,
} from "@/stores/list-columns-store";
import { useDirectoryStore } from "@/stores/directory-store";
import { useSession } from "@/contexts/session-context";
import { makeComparator, resolveSettings, type SortableRow } from "@/config/sort";
import { DataTable } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/common/status-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { ListColumnsMenu } from "@/modules/tickets/list-columns-menu";

export type AgendaRow =
  | { kind: "task"; id: string; when: number; task: Ticket }
  | { kind: "event"; id: string; when: number; event: CalendarEvent };

export function UnifiedList({
  tickets,
  events,
  loading,
  onView,
  onOpenSingle,
  onFinalize,
  onDelete,
  onBulkDelete,
  onChanged,
}: {
  tickets: Ticket[];
  events: CalendarEvent[];
  loading?: boolean;
  onView: (row: AgendaRow) => void;
  onOpenSingle: (row: AgendaRow) => void;
  onFinalize: (row: AgendaRow) => void;
  onDelete: (row: AgendaRow) => void;
  onBulkDelete: (rows: AgendaRow[], clear: () => void) => void;
  /** Called after an inline edit persists, so the parent can refetch. */
  onChanged?: () => void;
}) {
  const { user } = useSession();
  const { sortRules, taskTimeEnabled } = resolveSettings(user.company);

  const sortValues = (r: AgendaRow): SortableRow =>
    r.kind === "task"
      ? {
          createdAt: +new Date(r.task.created_at),
          dueAt: r.task.due_at ? +new Date(r.task.due_at) : null,
          priority: r.task.priority,
        }
      : {
          createdAt: +new Date(r.event.created_at),
          dueAt: +new Date(r.event.starts_at),
          priority: null,
        };

  const comparator = makeComparator(sortRules);

  const rows: AgendaRow[] = [
    ...tickets.map<AgendaRow>((t) => ({
      kind: "task",
      id: t.id,
      when: +new Date(t.due_at ?? t.updated_at),
      task: t,
    })),
    ...events.map<AgendaRow>((e) => ({
      kind: "event",
      id: e.id,
      when: +new Date(e.starts_at),
      event: e,
    })),
  ].sort((a, b) => comparator(sortValues(a), sortValues(b)));

  // Directory data for the inline editors (also keeps cells reactive on load).
  const taskColumns = useDirectoryStore((s) => s.taskColumns);
  const users = useDirectoryStore((s) => s.users);

  const priorityOptions: InlineOption[] = Object.entries(TICKET_PRIORITY_META).map(([value, m]) => ({
    value,
    label: m.label,
    leading: <span className={cn("size-2 rounded-full", TONE_DOT_CLASS[m.tone])} />,
  }));
  const modalityOptions: InlineOption[] = Object.entries(EVENT_MODALITY_META).map(([value, m]) => ({
    value,
    label: m.label,
  }));
  const userOptions: InlineOption[] = users.map((u) => ({
    value: u.id,
    label: u.name,
    leading: <UserAvatar name={u.name} src={u.avatar_url} className="size-5" />,
  }));
  const columnOptionsFor = (boardId?: string | null): InlineOption[] =>
    taskColumns
      .filter((c) => c.board_id === boardId)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        value: c.id,
        label: c.name,
        leading: <span className={cn("size-2 rounded-full", TONE_DOT_CLASS[c.color])} />,
      }));

  const columnDefs: Record<ListColumnId, ColumnDef<AgendaRow>> = {
    type: {
      id: "type",
      header: "Tipo",
      meta: { cellClassName: "w-px pr-1", headClassName: "pr-1" },
      cell: ({ row }) => {
        const isTask = row.original.kind === "task";
        const Icon = isTask ? ListChecks : CalendarDays;
        return (
          <span
            title={isTask ? "Tarefa" : "Evento"}
            className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Icon className="size-4" />
          </span>
        );
      },
    },
    id: {
      id: "id",
      header: "ID",
      meta: { cellClassName: "pl-1", headClassName: "pl-1" },
      cell: ({ row }) => {
        const r = row.original;
        const code = r.kind === "task" ? taskCode(r.task.number) : eventCode(r.event.number);
        return <span className="font-mono text-xs text-muted-foreground">{code}</span>;
      },
    },
    title: {
      id: "title",
      header: "Título",
      cell: ({ row }) => {
        const r = row.original;
        const title = r.kind === "task" ? r.task.title : r.event.title;
        const finalized = r.kind === "task" ? r.task.status === "closed" : Boolean(r.event.finished);
        return (
          <span className="flex items-center gap-2">
            <span className={cn("truncate font-medium", finalized && "text-muted-foreground line-through")}>
              {title}
            </span>
            {finalized && (
              <Badge
                variant="outline"
                className="shrink-0 border-success/30 bg-success/10 text-success"
              >
                Finalizada
              </Badge>
            )}
          </span>
        );
      },
    },
    when: {
      accessorKey: "when",
      header: "Data",
      cell: ({ row }) => {
        const r = row.original;
        const date = r.kind === "task" ? r.task.due_at : r.event.starts_at;
        // Events always show time; tasks show time only when the feature is on.
        const showTime = r.kind === "event" || taskTimeEnabled;
        const display = date ? (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatShortDate(date)}
            {showTime ? ` ${formatTime(date)}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">Sem prazo</span>
        );
        return (
          <InlineDate
            title="Reagendar"
            onClear={
              r.kind === "task"
                ? async () => {
                    await ticketsService.update(r.task.id, { due_at: null });
                    onChanged?.();
                  }
                : undefined
            }
            onPick={async (day) => {
              if (r.kind === "task") {
                const due = mergeDay(day, taskTimeEnabled ? r.task.due_at : null);
                await ticketsService.update(r.task.id, { due_at: due });
              } else {
                const startIso = mergeDay(day, r.event.starts_at);
                const dur = +new Date(r.event.ends_at) - +new Date(r.event.starts_at);
                const endIso = new Date(+new Date(startIso) + dur).toISOString();
                await calendarService.update(r.event.id, { starts_at: startIso, ends_at: endIso });
              }
              onChanged?.();
            }}
          >
            {display}
          </InlineDate>
        );
      },
    },
    owner: {
      id: "owner",
      header: "Responsável",
      cell: ({ row }) => {
        const r = row.original;
        const principal = r.kind === "task" ? r.task.assignee_id : r.event.owner_id;
        const others = (r.kind === "task" ? r.task.participant_ids : r.event.participant_ids) ?? [];
        // Count distinct envolvidos that aren't the responsável (for the "+N").
        const extra = others.filter((id, i, arr) => id && id !== principal && arr.indexOf(id) === i)
          .length;
        const principalOpt = userOptions.find((o) => o.value === principal);
        return (
          <InlineSelect
            value={principal ?? ""}
            options={userOptions}
            title="Trocar responsável"
            onChange={async (v) => {
              if (r.kind === "task") await ticketsService.assign(r.task.id, v);
              else await calendarService.update(r.event.id, { owner_id: v });
              onChanged?.();
            }}
          >
            {principalOpt ? (
              <span className="flex items-center gap-1.5">
                {principalOpt.leading}
                <span className="truncate text-sm">{principalOpt.label}</span>
                {extra > 0 && (
                  <span
                    className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
                    title={`+${extra} envolvido(s)`}
                  >
                    +{extra}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Atribuir</span>
            )}
          </InlineSelect>
        );
      },
    },
    priority: {
      id: "priority",
      header: "Prioridade",
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "task") {
          return (
            <InlineSelect
              value={r.task.priority}
              options={priorityOptions}
              title="Trocar prioridade"
              onChange={async (v) => {
                await ticketsService.setPriority(r.task.id, v as Ticket["priority"]);
                onChanged?.();
              }}
            >
              <StatusBadge meta={TICKET_PRIORITY_META[r.task.priority]} />
            </InlineSelect>
          );
        }
        return (
          <InlineSelect
            value={r.event.modality ?? "not_applicable"}
            options={modalityOptions}
            title="Trocar modalidade"
            onChange={async (v) => {
              await calendarService.update(r.event.id, {
                modality: v as NonNullable<CalendarEvent["modality"]>,
              });
              onChanged?.();
            }}
          >
            <Badge variant="secondary">
              {EVENT_MODALITY_META[r.event.modality ?? "not_applicable"].label}
            </Badge>
          </InlineSelect>
        );
      },
    },
    link: {
      id: "link",
      header: "Categorias",
      cell: ({ row }) => {
        const r = row.original;
        const t = r.kind === "task" ? r.task : null;
        const e = r.kind === "event" ? r.event : null;
        const customer = findCustomer(t?.customer_id ?? e?.customer_id)?.name;
        const carrier = findCarrier(t?.carrier_id ?? e?.carrier_id)?.name;
        const product = findProduct(t?.product_id ?? e?.product_id)?.name;
        const items: { title: string }[] = [
          customer ? { title: `Cliente: ${customer}` } : null,
          carrier ? { title: `Seguradora: ${carrier}` } : null,
          product ? { title: `Produto: ${product}` } : null,
          (t?.contract_id ?? e?.contract_id) ? { title: "Contrato" } : null,
          (t?.quote_id ?? e?.quote_id) ? { title: "Orçamento" } : null,
        ].filter(Boolean) as { title: string }[];
        if (items.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {items.map((item, i) => {
              // Inicial = 1ª letra do nome (ignora o prefixo "Tipo: ").
              const name = item.title.includes(": ")
                ? item.title.split(": ")[1]!
                : item.title;
              return (
                <span
                  key={i}
                  title={item.title}
                  className="inline-flex size-6 cursor-default items-center justify-center rounded-full border bg-muted text-[11px] font-medium uppercase text-muted-foreground"
                >
                  {name.charAt(0)}
                </span>
              );
            })}
          </div>
        );
      },
    },
    tags: {
      id: "tags",
      header: "Etiquetas",
      cell: ({ row }) => {
        const r = row.original;
        const tags = (r.kind === "task" ? r.task.tags : (r.event.tags ?? [])) ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="outline" className="capitalize">
                {t}
              </Badge>
            ))}
          </div>
        );
      },
    },
    stage: {
      id: "stage",
      header: "Etapa",
      cell: ({ row }) => {
        const r = row.original;
        const boardId = r.kind === "task" ? r.task.board_id : r.event.board_id;
        const columnId = r.kind === "task" ? r.task.column_id : r.event.column_id;
        const col = findTaskColumn(columnId);
        const options = columnOptionsFor(boardId);
        if (options.length === 0) {
          return col ? (
            <StageBadge stage={col} />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        }
        return (
          <InlineSelect
            value={columnId ?? ""}
            options={options}
            title="Trocar etapa"
            onChange={async (v) => {
              if (boardId) await taskBoardsService.moveCard(r.kind, r.id, boardId, v);
              onChanged?.();
            }}
          >
            {col ? (
              <StageBadge stage={col} />
            ) : (
              <span className="text-sm text-muted-foreground">Definir</span>
            )}
          </InlineSelect>
        );
      },
    },
  };

  const order = useListColumnsStore((s) => s.order);
  const hidden = useListColumnsStore((s) => s.hidden);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const actionsColumn: ColumnDef<AgendaRow> = {
    id: "actions",
    header: "Ações",
    meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
    cell: ({ row }) => {
      const r = row.original;
      // Finalização vem do STATUS, não da etapa/coluna.
      const finalized =
        r.kind === "task" ? r.task.status === "closed" : Boolean(r.event.finished);
      return (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Ações">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {r.kind === "task" && (
                <DropdownMenuItem onClick={() => onOpenSingle(r)}>
                  <SquareArrowOutUpRight /> Abrir
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onView(r)}>
                <Eye /> Visualização rápida
              </DropdownMenuItem>
              {!finalized ? (
                <DropdownMenuItem onClick={() => onFinalize(r)}>
                  <CheckCircle2 /> Finalizar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={async () => {
                    if (r.kind === "task") await reopenTask(r.task);
                    else await reopenEvent(r.event);
                    onChanged?.();
                  }}
                >
                  <RotateCcw /> Reabrir
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(r)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  };

  // Before mount use defaults (matches SSR), then apply the saved preference.
  const effOrder = mounted ? order : (LIST_COLUMNS.map((c) => c.id) as ListColumnId[]);
  const effHidden = mounted ? hidden : [];
  // Locked columns (Tipo/ID) are always shown and pinned first.
  const visible = effOrder.filter((id) => isLockedColumn(id) || !effHidden.includes(id));
  const columns = [...visible.map((id) => columnDefs[id]), actionsColumn];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ListColumnsMenu />
      </div>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        onRowClick={(r) => onOpenSingle(r)}
        emptyIcon={ListChecks}
        emptyTitle="Nada por aqui"
        emptyDescription="Crie uma tarefa ou um evento para começar."
        storageKey="tasks-list"
        enableSelection
        getRowId={(r) => r.id}
        bulkActions={(selected, clear) => (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onBulkDelete(selected, clear)}
          >
            <Trash2 className="size-4" /> Excluir
          </Button>
        )}
      />
    </div>
  );
}

/** Returns an ISO datetime for `day` (local midnight), keeping the time-of-day
 *  from `timeFrom` if given, else defaulting to 09:00. */
function mergeDay(day: Date, timeFrom?: string | null): string {
  const d = new Date(day);
  if (timeFrom) {
    const t = new Date(timeFrom);
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d.toISOString();
}

function StageBadge({ stage }: { stage: { name: string; color: StageColor } }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE_BADGE_CLASS[stage.color],
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_DOT_CLASS[stage.color])} />
      {stage.name}
    </span>
  );
}
