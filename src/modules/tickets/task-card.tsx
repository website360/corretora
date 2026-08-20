"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, ListChecks, MessageSquare } from "lucide-react";
import { findCarrier, findCustomer, findProduct, findUser } from "@/services/lookup";
import { TICKET_SUBJECT_META, TICKET_PRIORITY_META, TONE_TEXT_CLASS } from "@/config/domain";
import { formatShortDate, formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ChecklistProgress, Ticket } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { TagList } from "@/components/common/tag-list";
import { useOverdue } from "@/hooks/use-overdue";

interface TaskCardProps {
  ticket: Ticket;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  /** When provided, clicking opens this handler instead of navigating. */
  onOpen?: (ticket: Ticket) => void;
  /** Itens de checklist concluídos/total; omitido quando a tarefa não tem nenhum. */
  checklist?: ChecklistProgress;
  /** Cor das etiquetas — resolvida no board (useTagColor), não por card. */
  colorOf?: (name: string) => string;
}

/** Compact, draggable task card used on the Kanban board. */
export function TaskCard({
  ticket,
  draggable,
  onDragStart,
  onDragEnd,
  onOpen,
  checklist,
  colorOf,
}: TaskCardProps) {
  const router = useRouter();
  const { isTaskLate, taskTimeEnabled } = useOverdue();
  const late = isTaskLate(ticket);
  const customer = findCustomer(ticket.customer_id);
  const assignee = findUser(ticket.assignee_id);
  const priority = TICKET_PRIORITY_META[ticket.priority];
  const linkNames = [
    customer?.name,
    findCarrier(ticket.carrier_id)?.name,
    findProduct(ticket.product_id)?.name,
  ].filter(Boolean);

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => (onOpen ? onOpen(ticket) : router.push(`/tickets/${ticket.id}`))}
      className={cn(
        "group cursor-pointer rounded-xl border bg-card p-3 shadow-xs transition-all hover:shadow-md hover:border-primary/30",
        draggable && "active:cursor-grabbing active:opacity-60",
        late && "border-destructive/40 bg-destructive/5 hover:border-destructive/60",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <priority.icon className={cn("size-3.5 shrink-0", TONE_TEXT_CLASS[priority.tone])} />
        <span className="font-mono text-[11px] text-muted-foreground">#{ticket.number}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {TICKET_SUBJECT_META[ticket.subject_type].label}
        </Badge>
      </div>

      <p className="line-clamp-2 text-sm font-medium leading-snug">{ticket.title}</p>
      {linkNames.length > 0 && (
        <p className="mt-1 truncate text-xs text-muted-foreground">{linkNames.join(" · ")}</p>
      )}

      {ticket.tags.length > 0 && <TagList tags={ticket.tags} colorOf={colorOf} className="mt-2" />}

      <div className="mt-3 flex items-center gap-2">
        <Badge
          variant={
            priority.tone === "destructive"
              ? "destructive"
              : priority.tone === "warning"
                ? "warning"
                : "secondary"
          }
          className="text-[10px]"
        >
          <priority.icon className="size-2.5" />
          {priority.label}
        </Badge>
        {ticket.due_at && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              late ? "font-medium text-destructive" : "text-muted-foreground",
            )}
            title={late ? "Prazo em atraso" : undefined}
          >
            <CalendarClock className="size-3" />
            {formatShortDate(ticket.due_at)}
            {taskTimeEnabled ? ` ${formatTime(ticket.due_at)}` : ""}
          </span>
        )}
        {ticket.unread_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MessageSquare className="size-3" />
            {ticket.unread_count}
          </span>
        )}
        {checklist && checklist.total > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              checklist.done === checklist.total
                ? "font-medium text-success"
                : "text-muted-foreground",
            )}
            title="Itens de checklist concluídos"
          >
            <ListChecks className="size-3" />
            {checklist.done}/{checklist.total}
          </span>
        )}
        <UserAvatar
          name={assignee?.name}
          src={assignee?.avatar_url}
          className="ml-auto size-6"
        />
      </div>
    </article>
  );
}
