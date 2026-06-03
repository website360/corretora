"use client";

import * as React from "react";
import { CalendarDays, CalendarClock, CircleSlash, Sun, Sunrise } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatShortDate } from "@/utils/format";
import { cn } from "@/lib/utils";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function nextMonday(base: Date): Date {
  const day = base.getDay(); // 0 = Sun … 6 = Sat
  let offset = (8 - day) % 7;
  if (offset === 0) offset = 7;
  return addDays(base, offset);
}

/**
 * A list-cell date that opens a quick-reschedule popover: Hoje / Amanhã /
 * Próxima semana / (Algum dia) plus a calendar to pick any date.
 */
export function InlineDate({
  children,
  onPick,
  onClear,
  title,
  align = "start",
}: {
  children: React.ReactNode;
  /** Receives the chosen day at local midnight; caller merges the time. */
  onPick: (day: Date) => Promise<void> | void;
  /** When provided, shows "Algum dia (sem prazo)" to clear the date. */
  onClear?: () => Promise<void> | void;
  title?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function run(fn: () => Promise<void> | void) {
    setSaving(true);
    try {
      await fn();
      setOpen(false);
    } catch {
      toast.error("Não foi possível reagendar.");
    } finally {
      setSaving(false);
    }
  }

  const today = startOfToday();
  const quick = [
    { label: "Reagendar para hoje", icon: Sun, day: today },
    { label: "Reagendar para amanhã", icon: Sunrise, day: addDays(today, 1) },
    { label: "Reagendar para próxima semana", icon: CalendarDays, day: nextMonday(today) },
  ];

  const itemClass =
    "flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent disabled:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground";

  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={title ?? "Reagendar"}
            disabled={saving}
            className="group/inline -mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent disabled:opacity-60"
          >
            {children}
            <CalendarClock className="size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover/inline:text-muted-foreground/70" />
          </button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-max min-w-[15rem] max-w-[22rem] p-1.5">
          {quick.map((q) => (
            <button key={q.label} className={itemClass} onClick={() => run(() => onPick(q.day))}>
              <q.icon />
              <span className="flex-1">{q.label}</span>
              <span className="text-xs text-muted-foreground">{formatShortDate(q.day)}</span>
            </button>
          ))}
          {onClear && (
            <button className={itemClass} onClick={() => run(() => onClear())}>
              <CircleSlash />
              <span className="flex-1">Algum dia (sem prazo)</span>
            </button>
          )}
          <div className="my-1 h-px bg-border" />
          <div className="px-2 py-1">
            <span className="mb-1 flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" /> Escolher data
            </span>
            <input
              type="date"
              className="w-full cursor-pointer rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => {
                if (e.target.value) run(() => onPick(new Date(`${e.target.value}T00:00:00`)));
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}
