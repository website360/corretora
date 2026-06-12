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
  CheckCheck,
  CheckCircle2,
  CircleDashed,
  ListTodo,
} from "lucide-react";
import { ticketsService } from "@/services/tickets.service";
import { useViewCompanyStore } from "@/stores/view-company-store";
import { TONE_DOT_CLASS, TONE_TEXT_CLASS, type Tone } from "@/config/domain";
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
  /** Card de total (denominador) — barra cheia e legenda "no período". */
  isTotal?: boolean;
}

/** Traço fino colorido (rodapé do card). */
const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
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
      <Card className="relative overflow-hidden p-5 pr-7 transition-all duration-200 hover:border-foreground/15 hover:shadow-md">
        {/* barra colorida vertical na borda direita */}
        <div className={cn("absolute inset-y-0 right-0 w-1", TONE_BAR[metric.tone])} />

        {/* ícone grande como marca d'água, cortado no canto inferior direito */}
        <Icon
          aria-hidden
          className={cn(
            "pointer-events-none absolute -bottom-5 right-1 size-28 opacity-[0.06]",
            TONE_TEXT_CLASS[metric.tone],
          )}
        />

        <div className="relative">
          {/* rótulo + ponto colorido do status / ícone no canto */}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <span className={cn("size-2 rounded-full", TONE_DOT_CLASS[metric.tone])} />
              {metric.label}
            </span>
            <Icon className={cn("size-[18px]", TONE_TEXT_CLASS[metric.tone])} />
          </div>

          {/* número gigante (herói) */}
          {loading ? (
            <Skeleton className="mt-4 h-12 w-20" />
          ) : (
            <p className="mt-4 text-5xl font-bold leading-none tracking-tight tabular-nums">
              {metric.value}
            </p>
          )}

          <p className="mt-3 text-[11px] tabular-nums text-muted-foreground/70">
            {loading ? "—" : metric.isTotal ? "no período" : `${share}% do total`}
          </p>
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

  const { metrics, total } = React.useMemo(() => {
    const { from, to } = rangeFor(range, customFrom, customTo);
    const now = new Date();
    const inRange = tickets.filter((t) => {
      const c = new Date(t.created_at);
      if (from && c < from) return false;
      if (to && c > to) return false;
      return true;
    });
    const all = inRange.length;
    const open = inRange.filter(isOpen).length;
    const resolved = inRange.filter((t) => t.status === "resolved").length;
    const closed = inRange.filter((t) => t.status === "closed").length;
    const overdue = inRange.filter(
      (t) => isOpen(t) && t.due_at != null && new Date(t.due_at) < now,
    ).length;

    const list: Metric[] = [
      { key: "total", label: "Total", value: all, tone: "primary", icon: ListTodo, href: "/tickets", isTotal: true },
      { key: "open", label: "Em aberto", value: open, tone: "warning", icon: CircleDashed, href: "/tickets?status=open" },
      { key: "overdue", label: "Em atraso", value: overdue, tone: "destructive", icon: AlertTriangle, href: "/tickets?status=overdue" },
      { key: "resolved", label: "Resolvidas", value: resolved, tone: "success", icon: CheckCircle2, href: "/tickets?status=resolved" },
      { key: "closed", label: "Concluídas", value: closed, tone: "neutral", icon: CheckCheck, href: "/tickets?status=closed" },
    ];
    return { metrics: list, total: all };
  }, [tickets, range, customFrom, customTo]);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <IndicatorCard key={m.key} metric={m} total={total} loading={loading} />
        ))}
      </div>
    </section>
  );
}
