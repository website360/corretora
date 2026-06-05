"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Customer } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Month calendar of leads, positioned by their "próximo contato" date. */
export function LeadsCalendar({ leads }: { leads: Customer[] }) {
  const router = useRouter();
  const [cursor, setCursor] = React.useState<Date>(() => new Date());

  const scheduled = React.useMemo(
    () => leads.filter((l) => l.next_contact_at),
    [leads],
  );

  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
      }),
    [cursor],
  );

  const leadsOn = React.useCallback(
    (day: Date) =>
      scheduled
        .filter((l) => isSameDay(new Date(l.next_contact_at as string), day))
        .sort(
          (a, b) =>
            +new Date(a.next_contact_at as string) - +new Date(b.next_contact_at as string),
        ),
    [scheduled],
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <CalendarDays className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold capitalize">
          {format(cursor, "MMMM yyyy", { locale: ptBR })}
        </span>
        <span className="ml-2 text-xs text-muted-foreground">
          {scheduled.length} lead(s) com próximo contato
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            title="Mês anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            title="Próximo mês"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid shrink-0 grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {days.map((day) => {
          const dayLeads = leadsOn(day);
          const inMonth = isSameMonth(day, cursor);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[96px] border-b border-r p-1.5 last:border-r-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    isToday(day) && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => router.push(`/clientes/${lead.id}`)}
                    className="block w-full truncate rounded-md border border-primary/30 bg-primary/5 px-1.5 py-1 text-left text-xs hover:bg-primary/10"
                    title={lead.name}
                  >
                    <span className="font-mono text-[0.65rem] text-muted-foreground">
                      {format(new Date(lead.next_contact_at as string), "HH:mm")}
                    </span>{" "}
                    <span className="truncate">{lead.name || "Sem nome"}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
