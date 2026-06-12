"use client";

import * as React from "react";
import Link from "next/link";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCheck,
  CheckCircle2,
  CircleDashed,
  ListTodo,
} from "lucide-react";
import { ticketsService } from "@/services/tickets.service";
import { useViewCompanyStore } from "@/stores/view-company-store";
import { TONE_TEXT_CLASS, type Tone } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RangeKey = "today" | "week" | "month" | "last_month" | "year" | "all" | "custom";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  last_month: "Mês passado",
  year: "Este ano",
  all: "Tudo",
  custom: "Personalizado",
};

/** Tarefa ativa (ainda em aberto) — não resolvida nem fechada. */
const isOpen = (t: Ticket) =>
  t.status === "open" || t.status === "in_progress" || t.status === "waiting_customer";

function rangeFor(key: RangeKey, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_month": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "all":
      return { from: null, to: null };
    case "custom":
      return {
        from: customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : null,
        to: customTo ? endOfDay(new Date(`${customTo}T00:00:00`)) : null,
      };
  }
}

interface Metric {
  key: string;
  label: string;
  value: number;
  tone: Tone;
  icon: typeof ListTodo;
  /** Deep-link para a lista de tarefas já filtrada por este status. */
  href: string;
}

/** Tile do ícone — fundo tonalizado + anel. */
const TONE_ICON_TILE: Record<Tone, string> = {
  neutral: "bg-muted-foreground/10 text-muted-foreground ring-muted-foreground/15",
  primary: "bg-primary/10 text-primary ring-primary/15",
  success: "bg-success/10 text-success ring-success/15",
  warning: "bg-warning/10 text-warning ring-warning/15",
  destructive: "bg-destructive/10 text-destructive ring-destructive/15",
};

/** Faixa de destaque no topo do card + barra de proporção. */
const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

/** Brilho de fundo sutil no hover. */
const TONE_GLOW: Record<Tone, string> = {
  neutral: "from-muted-foreground/[0.07]",
  primary: "from-primary/[0.07]",
  success: "from-success/[0.07]",
  warning: "from-warning/[0.07]",
  destructive: "from-destructive/[0.07]",
};

function IndicatorCard({
  metric,
  total,
  loading,
}: {
  metric: Metric;
  total: number;
  loading: boolean;
}) {
  const Icon = metric.icon;
  const share = total > 0 ? Math.round((metric.value / total) * 100) : 0;
  return (
    <Link href={metric.href} className="group block">
      <Card className="relative overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg">
        {/* faixa superior tonalizada */}
        <span className={cn("absolute inset-x-0 top-0 h-1", TONE_BAR[metric.tone])} />
        {/* brilho no hover */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100",
            TONE_GLOW[metric.tone],
          )}
        />

        <div className="relative flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-200 group-hover:scale-105",
              TONE_ICON_TILE[metric.tone],
            )}
          >
            <Icon className="size-5" />
          </span>
          <ArrowUpRight className="size-4 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
        </div>

        <div className="relative mt-3">
          {loading ? (
            <Skeleton className="h-9 w-14" />
          ) : (
            <p className="text-[2rem] font-bold leading-none tabular-nums tracking-tight">
              {metric.value}
            </p>
          )}
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">{metric.label}</p>
        </div>

        {/* barra de proporção do total */}
        <div className="relative mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500", TONE_BAR[metric.tone])}
              style={{ width: loading ? "0%" : `${share}%` }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
            {loading ? "—" : `${share}%`}
          </span>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Indicadores de tarefas no dashboard. Padrão: mês atual; filtro de período
 * personalizado (hoje/semana/mês/mês passado/ano/tudo/intervalo). O período é
 * aplicado pela data de criação da tarefa; "em atraso" considera o vencimento.
 */
export function TaskIndicators() {
  const viewCompanyId = useViewCompanyStore((s) => s.companyId);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    ticketsService
      .list()
      .then((data) => {
        if (alive) setTickets(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // viewCompanyId: super_admin trocando a empresa do filtro refaz a busca.
  }, [viewCompanyId]);

  const metrics = React.useMemo<Metric[]>(() => {
    const { from, to } = rangeFor(range, customFrom, customTo);
    const now = new Date();
    const inRange = tickets.filter((t) => {
      const c = new Date(t.created_at);
      if (from && c < from) return false;
      if (to && c > to) return false;
      return true;
    });
    const open = inRange.filter(isOpen).length;
    const resolved = inRange.filter((t) => t.status === "resolved").length;
    const closed = inRange.filter((t) => t.status === "closed").length;
    const overdue = inRange.filter(
      (t) => isOpen(t) && t.due_at != null && new Date(t.due_at) < now,
    ).length;

    return [
      { key: "open", label: "Em aberto", value: open, tone: "primary", icon: CircleDashed, href: "/tickets?status=open" },
      { key: "overdue", label: "Em atraso", value: overdue, tone: "destructive", icon: AlertTriangle, href: "/tickets?status=overdue" },
      { key: "resolved", label: "Resolvidas", value: resolved, tone: "success", icon: CheckCircle2, href: "/tickets?status=resolved" },
      { key: "closed", label: "Concluídas", value: closed, tone: "neutral", icon: CheckCheck, href: "/tickets?status=closed" },
    ];
  }, [tickets, range, customFrom, customTo]);

  const total = metrics.reduce((s, m) => s + m.value, 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
            <ListTodo className="size-4" />
          </span>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold">Tarefas</h2>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando…" : `${total} ${total === 1 ? "tarefa" : "tarefas"} no período`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {range === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                aria-label="Data inicial"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                aria-label="Data final"
              />
            </>
          )}
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {RANGE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <IndicatorCard key={m.key} metric={m} total={total} loading={loading} />
        ))}
      </div>
    </section>
  );
}
