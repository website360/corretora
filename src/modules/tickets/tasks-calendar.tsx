"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";
import { findUser } from "@/services/lookup";
import {
  CALENDAR_EVENT_META,
  EVENT_MODALITY_META,
  TICKET_PRIORITY_META,
  TONE_BORDER_CLASS,
  TONE_TEXT_CLASS,
} from "@/config/domain";
import { formatTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Ticket } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { UserAvatar } from "@/components/common/user-avatar";

/** Shared time-window granularity (mirrors the page's period control). */
export type PeriodMode = "day" | "week" | "month" | "range";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_RANGE_DAYS = 62;

interface DayBucket {
  events: CalendarEvent[];
  tasks: Ticket[];
}

export function TasksCalendar({
  tickets,
  events,
  mode,
  cursor,
  rangeFrom,
  rangeTo,
  onOpenTask,
  onOpenEvent,
}: {
  tickets: Ticket[];
  events: CalendarEvent[];
  mode: PeriodMode;
  cursor: Date;
  rangeFrom: string;
  rangeTo: string;
  onOpenTask?: (task: Ticket) => void;
  onOpenEvent?: (event: CalendarEvent) => void;
}) {
  const router = useRouter();
  const openTask = (id: string) => {
    const t = tickets.find((x) => x.id === id);
    if (t && onOpenTask) onOpenTask(t);
    else router.push(`/tickets/${id}`);
  };

  const bucketFor = React.useCallback(
    (date: Date): DayBucket => ({
      events: events
        .filter((e) => isSameDay(new Date(e.starts_at), date))
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
      tasks: tickets.filter((t) => t.due_at && isSameDay(new Date(t.due_at), date)),
    }),
    [events, tickets],
  );

  if (mode === "day") {
    return (
      <div className="h-full overflow-auto">
        <DayView date={cursor} bucket={bucketFor(cursor)} onOpenTask={openTask} onOpenEvent={onOpenEvent} />
      </div>
    );
  }

  if (mode === "month") {
    return (
      <div className="h-full overflow-auto">
        <MonthView
          cursor={cursor}
          bucketFor={bucketFor}
          onOpenTask={openTask}
          onOpenEvent={onOpenEvent}
        />
      </div>
    );
  }

  // week / range → a grid of day cards.
  let days: Date[] = [];
  if (mode === "week") {
    days = eachDayOfInterval({
      start: startOfWeek(cursor, { weekStartsOn: 0 }),
      end: endOfWeek(cursor, { weekStartsOn: 0 }),
    });
  } else if (rangeFrom && rangeTo) {
    const start = new Date(`${rangeFrom}T00:00:00`);
    const end = new Date(`${rangeTo}T00:00:00`);
    if (+end >= +start) days = eachDayOfInterval({ start, end }).slice(0, MAX_RANGE_DAYS);
  }

  if (days.length === 0) {
    return (
      <div className="h-full overflow-auto">
        <EmptyState
          icon={CalendarDays}
          title="Selecione um intervalo"
          description="Escolha a data inicial e final para ver os dias."
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <DaysGrid days={days} bucketFor={bucketFor} onOpenTask={openTask} onOpenEvent={onOpenEvent} />
    </div>
  );
}

/* ───────────────────────────────── Month ───────────────────────────────── */

function MonthView({
  cursor,
  bucketFor,
  onOpenTask,
  onOpenEvent,
}: {
  cursor: Date;
  bucketFor: (d: Date) => DayBucket;
  onOpenTask: (id: string) => void;
  onOpenEvent?: (event: CalendarEvent) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
  });
  const weeks = days.length / 7;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const { events, tasks } = bucketFor(day);
          const chips = [
            ...events.map((e) => ({
              id: e.id,
              title: e.title,
              tone: CALENDAR_EVENT_META[e.type].tone,
              task: false,
              time: e.all_day ? null : formatTime(e.starts_at),
              event: e,
            })),
            ...tasks.map((t) => ({
              id: t.id,
              title: t.title,
              tone: TICKET_PRIORITY_META[t.priority].tone,
              task: true,
              time: null as string | null,
              event: undefined as CalendarEvent | undefined,
            })),
          ];
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-0 flex-col overflow-hidden border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
                !isSameMonth(day, cursor) && "bg-muted/20 text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {chips.slice(0, 3).map((chip) => (
                  <button
                    key={chip.id}
                    title={`${chip.task ? "Tarefa" : "Evento"}: ${chip.title}`}
                    onClick={() =>
                      chip.task ? onOpenTask(chip.id) : chip.event && onOpenEvent?.(chip.event)
                    }
                    className={cn(
                      "flex w-full items-center gap-1 truncate rounded border-l-2 bg-card px-1 py-0.5 text-left text-[10px] shadow-xs hover:bg-accent",
                      TONE_BORDER_CLASS[chip.tone],
                    )}
                  >
                    {chip.task ? (
                      <CheckCircle2 className={cn("size-2.5 shrink-0", TONE_TEXT_CLASS[chip.tone])} />
                    ) : (
                      <CalendarDays className={cn("size-2.5 shrink-0", TONE_TEXT_CLASS[chip.tone])} />
                    )}
                    {chip.time && (
                      <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                        {chip.time}
                      </span>
                    )}
                    <span className="truncate">{chip.title}</span>
                  </button>
                ))}
                {chips.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">+{chips.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ──────────────────────────── Week / Range grid ─────────────────────────── */

function DaysGrid({
  days,
  bucketFor,
  onOpenTask,
  onOpenEvent,
}: {
  days: Date[];
  bucketFor: (d: Date) => DayBucket;
  onOpenTask: (id: string) => void;
  onOpenEvent?: (event: CalendarEvent) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const { events, tasks } = bucketFor(day);
        return (
          <Card key={day.toISOString()} className={cn("flex min-h-[160px] flex-col", isToday(day) && "border-primary/40")}>
            <div
              className={cn(
                "flex items-center justify-between border-b px-2.5 py-2 text-xs font-medium",
                isToday(day) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="uppercase">{WEEKDAYS[day.getDay()]}</span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d/MM")}
              </span>
            </div>
            <div className="flex-1 space-y-1 p-1.5">
              {events.length === 0 && tasks.length === 0 && (
                <p className="px-1 py-2 text-center text-[11px] text-muted-foreground/60">—</p>
              )}
              {events.map((e) => (
                <button
                  key={e.id}
                  title={`Evento: ${e.title}`}
                  onClick={() => onOpenEvent?.(e)}
                  className={cn(
                    "flex w-full items-center gap-1.5 truncate rounded-md border-l-2 bg-muted/50 px-1.5 py-1 text-left text-[11px] hover:bg-accent",
                    TONE_BORDER_CLASS[CALENDAR_EVENT_META[e.type].tone],
                  )}
                >
                  <CalendarDays
                    className={cn("size-3 shrink-0", TONE_TEXT_CLASS[CALENDAR_EVENT_META[e.type].tone])}
                  />
                  {!e.all_day && (
                    <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                      {formatTime(e.starts_at)}
                    </span>
                  )}
                  <span className="truncate">{e.title}</span>
                </button>
              ))}
              {tasks.map((t) => (
                <button
                  key={t.id}
                  title={`Tarefa: ${t.title}`}
                  onClick={() => onOpenTask(t.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 truncate rounded-md border border-l-2 px-1.5 py-1 text-left text-[11px] hover:bg-accent",
                    TONE_BORDER_CLASS[TICKET_PRIORITY_META[t.priority].tone],
                  )}
                >
                  <CheckCircle2
                    className={cn("size-3 shrink-0", TONE_TEXT_CLASS[TICKET_PRIORITY_META[t.priority].tone])}
                  />
                  <span className="truncate">{t.title}</span>
                </button>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────── Day ────────────────────────────────── */

function DayView({
  date,
  bucket,
  onOpenTask,
  onOpenEvent,
}: {
  date: Date;
  bucket: DayBucket;
  onOpenTask: (id: string) => void;
  onOpenEvent?: (event: CalendarEvent) => void;
}) {
  const { events, tasks } = bucket;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardContent className="min-h-0 flex-1 space-y-5 overflow-auto p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {format(date, "EEEE", { locale: ptBR })}
          </p>
          <h3 className="text-xl font-semibold capitalize">
            {format(date, "d 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>

        {events.length === 0 && tasks.length === 0 ? (
          <EmptyState icon={Clock} title="Nada agendado" description="Sem eventos ou tarefas neste dia." />
        ) : (
          <div className="space-y-5">
            {events.length > 0 && (
              <ul className="space-y-3">
                {events.map((e) => {
                  const meta = CALENDAR_EVENT_META[e.type];
                  const owner = findUser(e.owner_id);
                  const involved = (e.participant_ids ?? []).map((id) => findUser(id)).filter(Boolean);
                  return (
                    <li
                      key={e.id}
                      onClick={() => onOpenEvent?.(e)}
                      className="cursor-pointer rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-accent/40"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="gap-1">
                          <meta.icon className="size-3" /> {meta.label}
                        </Badge>
                        <Badge variant="secondary">
                          {EVENT_MODALITY_META[e.modality ?? "not_applicable"].label}
                        </Badge>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {e.all_day ? "Dia todo" : `${formatTime(e.starts_at)} – ${formatTime(e.ends_at)}`}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                      {e.location && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {e.location}
                        </p>
                      )}
                      {(e.tags ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(e.tags ?? []).map((tag) => (
                            <Badge key={tag} variant="outline" className="capitalize">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {owner && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <UserAvatar name={owner.name} src={owner.avatar_url} className="size-5" />
                          <span className="text-xs text-muted-foreground">
                            {owner.name}
                            {involved.length > 0 ? ` +${involved.length} envolvido(s)` : ""}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {tasks.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CheckCircle2 className="size-3.5" /> Tarefas com prazo
                </p>
                <ul className="space-y-2">
                  {tasks.map((t) => {
                    const meta = TICKET_PRIORITY_META[t.priority];
                    const assignee = findUser(t.assignee_id);
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => onOpenTask(t.id)}
                          className="flex w-full items-start gap-2 rounded-xl border p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/40"
                        >
                          <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT_CLASS[meta.tone])} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              <span className="font-mono text-xs text-muted-foreground">#{t.number}</span> {t.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Prioridade {meta.label}
                              {assignee ? ` · ${assignee.name}` : ""}
                            </p>
                          </div>
                        </button>
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
  );
}
