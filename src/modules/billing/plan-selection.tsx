"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { PLAN_MODULES } from "@/config/domain";
import { plansService } from "@/services/plans.service";
import { billingService, trialDaysLeft } from "@/services/billing.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CardCheckoutForm } from "@/modules/billing/card-checkout-form";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function planFeatures(plan: Plan): string[] {
  return [
    plan.max_users == null ? "Usuários ilimitados" : `Até ${plan.max_users} usuários`,
    plan.max_contacts == null
      ? "Contatos ilimitados"
      : `Até ${plan.max_contacts.toLocaleString("pt-BR")} contatos`,
    "Tarefas, agenda e kanban de leads",
    "Suporte por e-mail",
  ];
}

export function PlanSelection() {
  const { user } = useSession();
  const { data: plans, loading } = useAsyncData(() => plansService.list());
  const [selected, setSelected] = React.useState<Plan | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const days = trialDaysLeft(user.company);
  const currentPlanId = user.company.plan_id;

  if (selected) {
    return <Checkout plan={selected} days={days} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
      {currentPlanId && (
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/cobrancas">
            <ArrowLeft /> Voltar para cobranças
          </Link>
        </Button>
      )}
      <div className="space-y-2 text-center">
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="size-3.5" /> {days} dias grátis · cobrança só após o teste
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Escolha seu plano</h1>
        <p className="text-muted-foreground">
          Você cadastra o cartão agora, aproveita {days} dias grátis e só é cobrado quando o teste
          terminar. Cancele quando quiser.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {loading || !plans
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)
          : plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                    plan.highlight && "border-primary/40 shadow-md",
                    isCurrent && "border-border bg-muted/30",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <Check className="size-3" /> Plano atual
                      </span>
                    ) : (
                      plan.highlight && (
                        <Badge variant="secondary" className="text-primary">
                          Mais popular
                        </Badge>
                      )
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-3xl font-bold tracking-tight">
                      {formatPrice(plan.price_cents)}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">/mês</span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {planFeatures(plan).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {expanded && (
                    <div className="mt-5 space-y-2.5 border-t pt-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Módulos incluídos
                      </p>
                      <ul className="space-y-2">
                        {PLAN_MODULES.map((m) => {
                          const included = (plan.modules ?? []).includes(m.key);
                          return (
                            <li
                              key={m.key}
                              className={cn(
                                "flex items-start gap-2 text-sm",
                                !included && "text-muted-foreground/60",
                              )}
                            >
                              {included ? (
                                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                              ) : (
                                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                              )}
                              <span className={cn(!included && "line-through")}>{m.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpanded((s) => !s)}
                    className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {expanded ? "Ver menos" : "Ver mais"}
                    <ChevronDown
                      className={cn("size-4 transition-transform", expanded && "rotate-180")}
                    />
                  </button>

                  <Button
                    className="mt-4 w-full"
                    variant={isCurrent ? "outline" : "default"}
                    onClick={() => setSelected(plan)}
                  >
                    {isCurrent ? "Atualizar pagamento" : `Escolher ${plan.name}`}
                  </Button>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function Checkout({ plan, days, onBack }: { plan: Plan; days: number; onBack: () => void }) {
  const router = useRouter();
  const { user } = useSession();

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6 lg:p-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Trocar de plano
      </button>

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatPrice(plan.price_cents)}/mês após o teste
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3.5" /> {days} dias grátis
          </Badge>
        </div>
      </div>

      <CardCheckoutForm
        submitLabel={`Iniciar teste de ${days} dias`}
        onSubmit={async ({ card, holder }) => {
          const res = await fetch("/api/billing/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId: plan.id, card, holder }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error ?? "Não foi possível concluir a assinatura.");
          if (json.live) {
            toast.success(`Assinatura ${plan.name} criada! Cobrança após o período de teste.`);
          } else {
            await billingService.selectPlan(user.company.id, plan.id);
            toast.success(`Plano ${plan.name} ativado em modo teste.`);
          }
          router.push("/dashboard");
          router.refresh();
        }}
      />
    </div>
  );
}
