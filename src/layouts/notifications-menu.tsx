"use client";

import * as React from "react";
import Link from "next/link";
import { AtSign, Bell, Calendar, CheckCheck, MessageSquare, Ticket } from "lucide-react";
import { notificationsService } from "@/services/notifications.service";
import { formatRelative } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/common/empty-state";

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  mention: AtSign,
  ticket_message: MessageSquare,
  ticket_assigned: Ticket,
  task_due: CheckCheck,
  event_reminder: Calendar,
  system: Bell,
};

export function NotificationsMenu() {
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [open, setOpen] = React.useState(false);
  const unread = items.filter((n) => !n.read).length;

  const refresh = React.useCallback(() => {
    notificationsService.list().then(setItems);
  }, []);

  // Carrega ao montar e revalida periodicamente (novas notificações aparecem
  // sem precisar recarregar a página).
  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function markAll() {
    await notificationsService.markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleItemClick(n: AppNotification) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      void notificationsService.markAsRead(n.id);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) refresh();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Marcar todas como lidas
            </button>
          )}
        </div>
        <Separator />
        {items.length === 0 ? (
          <EmptyState title="Tudo em dia" description="Você não tem novas notificações." />
        ) : (
          <ScrollArea className="max-h-[360px]">
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = ICONS[n.type];
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href ?? "#"}
                      onClick={() => handleItemClick(n)}
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                        !n.read && "bg-accent/40",
                      )}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {formatRelative(n.created_at)}
                        </p>
                      </div>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
