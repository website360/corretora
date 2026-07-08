"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  Package,
  Pencil,
  Percent,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { contractsService } from "@/services/contracts.service";
import { customersService } from "@/services/customers.service";
import { carriersService } from "@/services/carriers.service";
import { productsService } from "@/services/products.service";
import { usersService } from "@/services/users.service";
import { serviceRecordsService } from "@/services/service-records.service";
import { claimsService } from "@/services/claims.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { AtendimentoChat } from "@/modules/service/atendimento-chat";
import { ClaimFormDialog } from "@/modules/claims/claim-form-dialog";
import { CLAIM_STATUS_META, CONTRACT_STATUS_META, TONE_BADGE_CLASS } from "@/config/domain";
import { formatCurrency, formatShortDate } from "@/utils/format";
import type { Claim, Contract } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CarrierLogo } from "@/components/common/carrier-logo";
import { ContractFormDialog } from "@/modules/catalog/contract-form-dialog";
import { ContractAttachments } from "@/modules/catalog/contract-attachments";

export function ContractProfile({ id }: { id: string }) {
  const router = useRouter();
  const { data: contract, loading, refetch } = useAsyncData(() => contractsService.get(id), [id]);
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: carriers } = useAsyncData(() => carriersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: users } = useAsyncData(() => usersService.list());
  const { data: records, refetch: refetchRecords } = useAsyncData(
    () => serviceRecordsService.listByContract(id),
    [id],
  );
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!contract) {
    return (
      <div className="p-6">
        <EmptyState title="Contrato não encontrado" description="Ele pode ter sido removido." />
      </div>
    );
  }

  const customer = (customers ?? []).find((c) => c.id === contract.customer_id);
  const carrier = (carriers ?? []).find((c) => c.id === contract.carrier_id);
  const product = (products ?? []).find((p) => p.id === contract.product_id);
  const owner = (users ?? []).find((u) => u.id === contract.owner_id);
  const meta = CONTRACT_STATUS_META[contract.status];

  async function confirmDelete() {
    setDeleting(true);
    try {
      await contractsService.remove(contract!.id);
      toast.success("Contrato movido para a lixeira");
      router.push("/contratos");
    } catch {
      toast.error("Não foi possível excluir");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/contratos">
          <ArrowLeft /> Voltar para contratos
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              {contract.policy_number ? `Apólice ${contract.policy_number}` : "Contrato"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
                {meta.label}
              </Badge>
              {customer && (
                <Link
                  href={`/clientes/${customer.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {customer.name || "Cliente"}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 /> Excluir
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil /> Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Dados do contrato">
          <Field
            icon={User}
            label="Cliente"
            value={
              customer ? (
                <Link href={`/clientes/${customer.id}`} className="hover:underline">
                  {customer.name || "Sem nome"}
                </Link>
              ) : null
            }
          />
          <Field
            icon={ShieldCheck}
            label="Seguradora"
            value={
              carrier ? (
                <Link
                  href={`/companhias/${carrier.id}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <CarrierLogo src={carrier.logo_url} className="size-6" />
                  {carrier.name}
                </Link>
              ) : null
            }
          />
          <Field icon={Package} label="Produto" value={product?.name} />
          <Field icon={User} label="Responsável" value={owner?.name} />
          <Field icon={FileText} label="Número da apólice" value={contract.policy_number} />
        </SectionCard>

        <SectionCard title="Vigência e valores">
          <Field
            icon={CalendarClock}
            label="Vigência"
            value={
              contract.starts_at || contract.ends_at
                ? `${contract.starts_at ? formatShortDate(contract.starts_at) : "?"} → ${
                    contract.ends_at ? formatShortDate(contract.ends_at) : "?"
                  }`
                : null
            }
          />
          <Field
            icon={FileText}
            label="Prêmio"
            value={contract.premium_cents ? formatCurrency(contract.premium_cents / 100) : null}
          />
          <Field
            icon={Percent}
            label="Comissão"
            value={
              contract.commission_percent != null
                ? `${contract.commission_percent}%${
                    contract.premium_cents
                      ? ` · ${formatCurrency(
                          (contract.premium_cents * contract.commission_percent) / 100 / 100,
                        )}`
                      : ""
                  }`
                : null
            }
          />
        </SectionCard>
      </div>

      {contract.notes && (
        <SectionCard title="Observações">
          <div className="px-5 py-4 text-sm text-muted-foreground">{contract.notes}</div>
        </SectionCard>
      )}

      <ContractAttachments contractId={contract.id} />

      {/* Atendimentos desta apólice (chat) */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 px-1 font-semibold">
          <FileText className="size-4" /> Atendimentos desta apólice
        </h3>
        <AtendimentoChat
          records={records ?? []}
          fixedContractId={contract.id}
          onSend={async ({ channel, notes, mentions }) => {
            await serviceRecordsService.create({
              customer_id: contract.customer_id,
              contract_id: contract.id,
              product_id: contract.product_id,
              channel,
              notes,
              mentions,
            });
            refetchRecords();
          }}
        />
      </div>

      {/* Sinistros desta apólice */}
      <ContractClaimsSection contract={contract} />

      <ContractFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contract={contract}
        onSaved={refetch}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir contrato"
        description="O contrato será movido para a lixeira (restaurável por 5 dias)."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ContractClaimsSection({ contract }: { contract: Contract }) {
  const { data, loading, refetch } = useAsyncData(
    () => claimsService.listByContract(contract.id),
    [contract.id],
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Claim | null>(null);
  const claims = data ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="size-4" /> Sinistros desta apólice
        </h3>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus /> Novo sinistro
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={ShieldAlert}
            title="Sem sinistros"
            description="Nenhum sinistro registrado para esta apólice."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {claims.map((c) => {
            const meta = CLAIM_STATUS_META[c.status];
            return (
              <li
                key={c.id}
                className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                onClick={() => {
                  setEditing(c);
                  setDialogOpen(true);
                }}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldAlert className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    #{c.number} · {c.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.occurred_at ? formatShortDate(c.occurred_at) : "Sem data"}
                    {c.amount_cents ? ` · ${formatCurrency(c.amount_cents / 100)}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
                  {meta.label}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <ClaimFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        claim={editing}
        defaultCustomerId={contract.customer_id}
        defaultContractId={contract.id}
        lockCustomer
        onSaved={refetch}
      />
    </Card>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b px-5 py-3">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </Card>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
