"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Link2, Pencil } from "lucide-react";
import { carriersService } from "@/services/carriers.service";
import { contractsService } from "@/services/contracts.service";
import { customersService } from "@/services/customers.service";
import { productsService } from "@/services/products.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { CONTRACT_STATUS_META, TONE_BADGE_CLASS } from "@/config/domain";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { CarrierLogo } from "@/components/common/carrier-logo";
import { CarrierFormDialog } from "@/modules/catalog/carrier-form-dialog";
import { CarrierLinksDialog } from "@/modules/catalog/carrier-links-dialog";
import { normalizeUrl } from "@/lib/utils";

export function CarrierProfile({ id }: { id: string }) {
  const router = useRouter();
  const { data: carrier, loading, refetch } = useAsyncData(() => carriersService.get(id), [id]);
  const { data: contracts } = useAsyncData(() => contractsService.list());
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const [editOpen, setEditOpen] = React.useState(false);
  const [linksOpen, setLinksOpen] = React.useState(false);

  const customerName = React.useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c.name || "Sem nome"])),
    [customers],
  );
  const productName = React.useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.name])),
    [products],
  );

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (!carrier) {
    return (
      <div className="p-6">
        <EmptyState title="Seguradora não encontrada" description="Ela pode ter sido removida." />
      </div>
    );
  }

  const carrierContracts = (contracts ?? []).filter((c) => c.carrier_id === carrier.id);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/companhias">
          <ArrowLeft /> Voltar para seguradoras
        </Link>
      </Button>

      {/* Header */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <CarrierLogo src={carrier.logo_url} className="size-16" />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{carrier.name}</h1>
            {carrier.status === "active" ? (
              <Badge variant="success">Ativa</Badge>
            ) : (
              <Badge variant="secondary">Inativa</Badge>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil /> Editar
        </Button>
      </Card>

      {/* Links úteis */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Link2 className="size-4" /> Links
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setLinksOpen(true)}>
            <Pencil className="size-3.5" /> Gerenciar
          </Button>
        </div>
        {carrier.links.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">
            Nenhum link cadastrado. Clique em <strong>Gerenciar</strong> para adicionar (portal do
            corretor, cotação, sinistro, 2ª via...).
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-4">
            {carrier.links.map((link, i) => (
              <a
                key={i}
                href={normalizeUrl(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <ExternalLink className="size-3.5 text-muted-foreground" />
                {link.label || link.url}
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* Contracts with this carrier */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <h3 className="font-semibold">Contratos com esta seguradora</h3>
          <Badge variant="secondary">{carrierContracts.length}</Badge>
        </div>
        {carrierContracts.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FileText}
              title="Nenhum contrato"
              description="Ainda não há apólices com esta seguradora."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {carrierContracts.map((c) => {
              const meta = CONTRACT_STATUS_META[c.status];
              return (
                <li
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  onClick={() => router.push(`/clientes/${c.customer_id}`)}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{customerName.get(c.customer_id) ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.product_id ? (productName.get(c.product_id) ?? "Produto") : "Produto"}
                      {c.policy_number ? ` · Apólice ${c.policy_number}` : ""}
                      {c.ends_at ? ` · vence ${formatShortDate(c.ends_at)}` : ""}
                    </p>
                  </div>
                  {c.premium_cents > 0 && (
                    <span className="whitespace-nowrap text-sm font-medium">
                      {formatCurrency(c.premium_cents / 100)}
                    </span>
                  )}
                  <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
                    {meta.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <CarrierFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        carrier={carrier}
        onSaved={refetch}
      />
      <CarrierLinksDialog
        open={linksOpen}
        onOpenChange={setLinksOpen}
        carrier={carrier}
        onSaved={refetch}
      />
    </div>
  );
}
