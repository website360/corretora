"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, Plus } from "lucide-react";
import { calendarService } from "@/services/calendar.service";
import { ticketsService } from "@/services/tickets.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory } from "@/stores/directory-store";
import { findUser } from "@/services/lookup";
import { CALENDAR_EVENT_META, TICKET_PRIORITY_META, TONE_DOT_CLASS } from "@/config/domain";
import { formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Ticket } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { NewEventDialog } from "@/modules/calendar/new-event-dialog";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TONE_TEXT: Record<string, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function CalendarView() {
  useDirectory();
  const { data: events, refetch } = useAsyncData(() => calendarService.list());
  const { data: tickets } = useAsyncData(() => ticketsService.list());
  const [cursor, setCursor] = React.useState(() => new Date());
  const [selectedDay, setSelectedDay] = React.useState(() => new Date());
  const [newOpen, setNewOpen] = React.useState(false);

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (events ?? []).forEach((e) => {
      const key = format(new Date(e.starts_at), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return map;
  }, [events]);

  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, Ticket[]>();
    (tickets ?? [])
      .filter((t) => t.due_at)
      .forEach((t) => {
        const key = format(new Date(t.due_at!), "yyyy-MM-dd");
        map.set(key, [...(map.get(key) ?? []), t]);
      });
    return map;
  }, [tickets]);

  const dayEvents = (d: Date) => eventsByDay.get(format(d, "yyyy-MM-dd")) ?? [];
  const dayTasks = (d: Date) => tasksByDay.get(format(d, "yyyy-MM-dd")) ?? [];
  const selectedEvents = dayEvents(selectedDay);
  const selectedTasks = dayTasks(selectedDay);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Agenda"
        description="Reuniões, lembretes, renovações e tarefas da equipe."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus /> Novo evento
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar grid */}
        <Card>
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold capitalize">
              {format(cursor, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setCursor(subMonths(cursor, 1))}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setCursor(addMonths(cursor, 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const evts = dayEvents(day);
              const tsks = dayTasks(day);
              const chips = [
                ...evts.map((e) => ({
                  id: e.id,
                  title: e.title,
                  tone: CALENDAR_EVENT_META[e.type].tone,
                  task: false,
                })),
                ...tsks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  tone: TICKET_PRIORITY_META[t.priority].tone,
                  task: true,
                })),
              ];
              const isCurrentMonth = isSameMonth(day, cursor);
              const selected = isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex min-h-[92px] flex-col items-stretch gap-1 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 [&:nth-child(7n)]:border-r-0",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground/50",
                    selected && "bg-accent/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center self-end rounded-full text-xs font-medium",
                      isToday(day) && "bg-primary text-primary-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {chips.slice(0, 2).map((chip) => (
                      <div
                        key={chip.id}
                        className="flex items-center gap-1 truncate rounded bg-card px-1 py-0.5 text-[10px] shadow-xs"
                      >
                        {chip.task ? (
                          <CheckCircle2 className={cn("size-2.5 shrink-0", TONE_TEXT[chip.tone])} />
                        ) : (
                          <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT_CLASS[chip.tone])} />
                        )}
                        <span className="truncate">{chip.title}</span>
                      </div>
                    ))}
                    {chips.length > 2 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{chips.length - 2} mais
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Day detail */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {format(selectedDay, "EEEE", { locale: ptBR })}
              </p>
              <h3 className="text-xl font-semibold capitalize">
                {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>

            {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Nada agendado"
                description="Sem eventos ou tarefas com prazo neste dia."
              />
            ) : (
              <div className="space-y-5">
                {selectedEvents.length > 0 && (
                  <ul className="space-y-3">
                    {selectedEvents.map((e) => {
                      const meta = CALENDAR_EVENT_META[e.type];
                      const owner = findUser(e.owner_id);
                      return (
                        <li key={e.id} className="rounded-xl border p-3">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <meta.icon className="size-3" /> {meta.label}
                            </Badge>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {e.all_day ? "Dia todo" : formatTime(e.starts_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{e.title}</p>
                          {e.description && (
                            <p className="text-xs text-muted-foreground">{e.description}</p>
                          )}
                          {e.location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" /> {e.location}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-1.5">
                            <UserAvatar name={owner?.name} src={owner?.avatar_url} className="size-5" />
                            <span className="text-xs text-muted-foreground">{owner?.name}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selectedTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CheckCircle2 className="size-3.5" /> Tarefas com prazo
                    </p>
                    <ul className="space-y-2">
                      {selectedTasks.map((t) => {
                        const meta = TICKET_PRIORITY_META[t.priority];
                        const assignee = findUser(t.assignee_id);
                        return (
                          <li key={t.id}>
                            <Link
                              href={`/tickets/${t.id}`}
                              className="flex items-start gap-2 rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-accent/40"
                            >
                              <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[meta.tone])} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    #{t.number}
                                  </span>{" "}
                                  {t.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Prioridade {meta.label}
                                  {assignee ? ` · ${assignee.name}` : ""}
                                </p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewEventDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultDate={selectedDay}
        onSaved={() => refetch()}
      />
    </div>
  );
}
