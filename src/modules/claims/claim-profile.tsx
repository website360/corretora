"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  MessageSquarePlus,
  Pencil,
  ShieldAlert,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { claimsService } from "@/services/claims.service";
import { contractsService } from "@/services/contracts.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory } from "@/stores/directory-store";
import { findCustomer, findProduct, findUser } from "@/services/lookup";
import { CLAIM_STATUS_META, CLAIM_STATUS_ORDER, TONE_BADGE_CLASS } from "@/config/domain";
import { formatCurrency, formatShortDate, formatSmartDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ClaimStatus } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClaimFormDialog } from "@/modules/claims/claim-form-dialog";

export function ClaimProfile({ id }: { id: string }) {
  useDirectory();
  const router = useRouter();
  const { data: claim, loading, refetch } = useAsyncData(() => claimsService.get(id), [id]);
  const { data: updates, refetch: refetchUpdates } = useAsyncData(
    () => claimsService.updates(id),
    [id],
  );
  const { data: contract } = useAsyncData(
    () => (claim?.contract_id ? contractsService.get(claim.contract_id) : Promise.resolve(null)),
    [claim?.contract_id],
  );

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [savingStatus, setSavingStatus] = React.useState(false);

  async function addNote() {
    const text = note.trim();
    if (!text) return;
    setSending(true);
    try {
      await claimsService.addUpdate(id, text);
      setNote("");
      refetchUpdates();
    } catch {
      toast.error("Não foi possível registrar o acompanhamento.");
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(v: ClaimStatus) {
    if (!claim || v === claim.status) return;
    setSavingStatus(true);
    try {
      await claimsService.setStatus(id, v);
      // Deixa registrado no histórico a mudança de status.
      await claimsService.addUpdate(id, `Status alterado para “${CLAIM_STATUS_META[v].label}”.`);
      refetch();
      refetchUpdates();
    } catch {
      toast.error("Não foi possível alterar o status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await claimsService.remove(id);
      toast.success("Sinistro movido para a lixeira");
      router.replace("/sinistros");
    } catch {
      toast.error("Não foi possível excluir.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-6">
        <EmptyState title="Sinistro não encontrado" description="Ele pode ter sido removido." />
      </div>
    );
  }

  const meta = CLAIM_STATUS_META[claim.status];
  const customer = findCustomer(claim.customer_id);
  const owner = findUser(claim.owner_id);
  const product = findProduct(claim.product_id);
  const contractLabel = contract
    ? contract.policy_number
      ? `Apólice ${contract.policy_number}`
      : (product?.name ?? "Contrato")
    : null;

  return (
    <div className="space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" asChild className="mt-1.5 shrink-0 text-muted-foreground">
            <Link href="/sinistros" aria-label="Voltar">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldAlert className="size-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">{claim.title}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sinistro #{claim.number}
              {claim.source === "portal" ? " · solicitado pelo cliente" : ""}
              {customer ? " · " : ""}
              {customer && (
                <Link href={`/clientes/${customer.id}?tab=sinistros`} className="hover:underline">
                  {customer.name || "Cliente"}
                </Link>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select value={claim.status} onValueChange={(v) => changeStatus(v as ClaimStatus)} disabled={savingStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {CLAIM_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Editar
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 /> Excluir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Dados do sinistro */}
        <Card className="h-fit overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="font-semibold">Dados do sinistro</h3>
            <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
              {meta.label}
            </Badge>
          </div>
          <div className="divide-y divide-border/60">
            <Field icon={UserIcon} label="Cliente" value={customer?.name || "—"} />
            <Field
              icon={FileText}
              label="Apólice"
              value={
                contract ? (
                  <Link href={`/contratos/${contract.id}`} className="hover:underline">
                    {contractLabel}
                  </Link>
                ) : (
                  "Sem vínculo"
                )
              }
            />
            <Field
              icon={CalendarClock}
              label="Data da ocorrência"
              value={claim.occurred_at ? formatShortDate(claim.occurred_at) : "—"}
            />
            <Field
              icon={FileText}
              label="Valor estimado"
              value={claim.amount_cents ? formatCurrency(claim.amount_cents / 100) : "—"}
            />
            <Field
              icon={UserIcon}
              label="Responsável"
              value={
                owner ? (
                  <span className="flex items-center gap-2">
                    <UserAvatar name={owner.name} src={owner.avatar_url} className="size-6" />
                    {owner.name}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            {claim.description && (
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{claim.description}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Acompanhamentos */}
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-3">
            <h3 className="font-semibold">Acompanhamentos</h3>
          </div>

          <div className="space-y-3 border-b p-5">
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Registre um acompanhamento: contato com a seguradora, envio de documentos, vistoria agendada..."
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote();
              }}
            />
            <div className="flex justify-end">
              <Button onClick={addNote} loading={sending} disabled={!note.trim()}>
                <MessageSquarePlus /> Registrar acompanhamento
              </Button>
            </div>
          </div>

          <div className="p-5">
            {!updates ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : updates.length === 0 ? (
              <EmptyState
                title="Sem acompanhamentos"
                description="Registre o andamento do sinistro acima."
              />
            ) : (
              <ol className="relative space-y-5">
                <span className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-border" />
                {[...updates].reverse().map((u) => {
                  const author = findUser(u.author_id);
                  return (
                    <li key={u.id} className="relative flex gap-4">
                      <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
                        <MessageSquarePlus className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="whitespace-pre-wrap text-sm">{u.note}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {author?.name ? `${author.name} · ` : ""}
                          {formatSmartDate(u.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Card>
      </div>

      <ClaimFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        claim={claim}
        onSaved={refetch}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir sinistro"
        description="O sinistro será movido para a lixeira (restaurável por 5 dias)."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
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
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
