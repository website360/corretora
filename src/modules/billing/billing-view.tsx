"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CreditCard, ExternalLink, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { trialDaysLeft } from "@/services/billing.service";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardCheckoutForm } from "@/modules/billing/card-checkout-form";

interface Charge {
  id: string;
  value: number;
  status: string;
  dueDate: string;
  paymentDate: string | null;
  invoiceUrl: string | null;
}
interface Summary {
  plan: { id: string; code: string; name: string; price_cents: number } | null;
  status: string;
  trialEndsAt: string;
  billingLive: boolean;
  charges: Charge[];
}
interface PaymentCard {
  id: string;
  last4: string | null;
  brand: string | null;
  holder_name: string | null;
  is_default: boolean;
}

const SUB_STATUS: Record<string, { label: string; variant: "secondary" | "success" | "warning" | "destructive" }> = {
  trialing: { label: "Em teste", variant: "secondary" },
  active: { label: "Ativo", variant: "success" },
  past_due: { label: "Pagamento pendente", variant: "warning" },
  canceled: { label: "Cancelado", variant: "destructive" },
};

const CHARGE_STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Pendente", tone: "text-warning" },
  RECEIVED: { label: "Pago", tone: "text-success" },
  CONFIRMED: { label: "Confirmado", tone: "text-success" },
  RECEIVED_IN_CASH: { label: "Pago", tone: "text-success" },
  OVERDUE: { label: "Vencido", tone: "text-destructive" },
  REFUNDED: { label: "Estornado", tone: "text-muted-foreground" },
  CHARGEBACK_REQUESTED: { label: "Contestado", tone: "text-destructive" },
};

export function BillingView() {
  const { user, can } = useSession();
  const isAdmin = can(["admin", "super_admin"]);
  const [data, setData] = React.useState<Summary | null>(null);
  const [cards, setCards] = React.useState<PaymentCard[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cardOpen, setCardOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const loadSummary = React.useCallback(() => {
    fetch("/api/billing/summary")
      .then((r) => r.json())
      .then((j) => setData(j.error ? null : j))
      .catch(() => setData(null));
  }, []);
  const loadCards = React.useCallback(() => {
    fetch("/api/billing/cards")
      .then((r) => r.json())
      .then((j) => setCards(j.cards ?? []))
      .catch(() => setCards([]));
  }, []);

  React.useEffect(() => {
    Promise.all([loadSummary(), loadCards()]).finally(() => setLoading(false));
  }, [loadSummary, loadCards]);

  async function setDefault(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/billing/cards/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      toast.success("Cartão padrão atualizado");
      loadCards();
      loadSummary();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível atualizar.");
    } finally {
      setBusy(null);
    }
  }

  async function removeCard(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/billing/cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      toast.success("Cartão removido");
      loadCards();
      loadSummary();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível remover.");
    } finally {
      setBusy(null);
    }
  }

  const days = trialDaysLeft(user.company);
  const sub = data ? (SUB_STATUS[data.status] ?? SUB_STATUS.trialing) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
      <PageHeader title="Planos & Cobranças" description="Seu plano, formas de pagamento e histórico de cobranças." />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : !data ? (
        <EmptyState title="Não foi possível carregar" description="Tente novamente em instantes." />
      ) : (
        <>
          {/* Plano */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Plano atual</CardTitle>
              {sub && <Badge variant={sub.variant}>{sub.label}</Badge>}
            </CardHeader>
            <CardContent className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold">{data.plan?.name ?? "Sem plano"}</p>
                {data.plan && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(data.plan.price_cents / 100)}/mês
                  </p>
                )}
                {data.status === "trialing" && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-primary">
                    <Sparkles className="size-4" />
                    {days > 0
                      ? `${days} ${days === 1 ? "dia" : "dias"} de teste restantes`
                      : "Período de teste encerrado"}
                  </p>
                )}
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/escolher-plano">Trocar de plano</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Formas de pagamento */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Formas de pagamento</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setCardOpen(true)}>
                  <Plus className="size-4" /> Adicionar cartão
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {cards.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Nenhum cartão cadastrado. A cobrança começa após o teste — adicione um cartão para
                  ativar a assinatura.
                </p>
              ) : (
                cards.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CreditCard className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        {c.brand ?? "Cartão"} •••• {c.last4}
                        {c.is_default && (
                          <Badge variant="secondary" className="gap-1 text-primary">
                            <Check className="size-3" /> Padrão
                          </Badge>
                        )}
                      </p>
                      {c.holder_name && (
                        <p className="truncate text-xs text-muted-foreground">{c.holder_name}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <>
                        {!c.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busy === c.id}
                            onClick={() => setDefault(c.id)}
                          >
                            <Star className="size-3.5" /> Tornar padrão
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          title="Remover"
                          loading={busy === c.id}
                          onClick={() => removeCard(c.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Histórico de cobranças</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.charges.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {data.billingLive
                    ? "Nenhuma cobrança ainda. A primeira é gerada ao fim do período de teste."
                    : "Cobrança ainda não configurada no sistema."}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.charges.map((ch) => {
                    const st = CHARGE_STATUS[ch.status] ?? { label: ch.status, tone: "text-muted-foreground" };
                    return (
                      <li key={ch.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{formatCurrency(ch.value)}</p>
                          <p className="text-xs text-muted-foreground">
                            Venc. {formatShortDate(ch.dueDate)}
                            {ch.paymentDate ? ` · Pago em ${formatShortDate(ch.paymentDate)}` : ""}
                          </p>
                        </div>
                        <span className={cn("text-sm font-medium", st.tone)}>{st.label}</span>
                        {ch.invoiceUrl && (
                          <a
                            href={ch.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            title="Ver fatura"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar cartão</DialogTitle>
            <DialogDescription>
              O cartão é tokenizado com segurança. Cobrança só após o período de teste.
            </DialogDescription>
          </DialogHeader>
          <CardCheckoutForm
            submitLabel="Salvar cartão"
            onSubmit={async ({ card, holder }) => {
              const res = await fetch("/api/billing/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ card, holder, makeDefault: cards.length === 0 }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(json.error ?? "Não foi possível adicionar o cartão.");
              toast.success("Cartão adicionado");
              setCardOpen(false);
              loadCards();
              loadSummary();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
