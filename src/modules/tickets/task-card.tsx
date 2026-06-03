"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, MessageSquare } from "lucide-react";
import { findCarrier, findCustomer, findProduct, findUser } from "@/services/lookup";
import { TICKET_SUBJECT_META, TICKET_PRIORITY_META, TONE_DOT_CLASS } from "@/config/domain";
import { formatShortDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/user-avatar";

interface TaskCardProps {
  ticket: Ticket;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  /** When provided, clicking opens this handler instead of navigating. */
  onOpen?: (ticket: Ticket) => void;
}

/** Compact, draggable task card used on the Kanban board. */
export function TaskCard({ ticket, draggable, onDragStart, onDragEnd, onOpen }: TaskCardProps) {
  const router = useRouter();
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
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("size-2 rounded-full", TONE_DOT_CLASS[priority.tone])} />
        <span className="font-mono text-[11px] text-muted-foreground">#{ticket.number}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {TICKET_SUBJECT_META[ticket.subject_type].label}
        </Badge>
      </div>

      <p className="line-clamp-2 text-sm font-medium leading-snug">{ticket.title}</p>
      {linkNames.length > 0 && (
        <p className="mt-1 truncate text-xs text-muted-foreground">{linkNames.join(" · ")}</p>
      )}

      {ticket.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ticket.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] capitalize">
              {t}
            </Badge>
          ))}
        </div>
      )}

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
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarClock className="size-3" />
            {formatShortDate(ticket.due_at)}
          </span>
        )}
        {ticket.unread_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MessageSquare className="size-3" />
            {ticket.unread_count}
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
