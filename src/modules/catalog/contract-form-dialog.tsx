"use client";

import * as React from "react";
import { FileText, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { contractsService } from "@/services/contracts.service";
import { contractAttachmentsService } from "@/services/contract-attachments.service";
import { customersService } from "@/services/customers.service";
import { productsService } from "@/services/products.service";
import { carriersService } from "@/services/carriers.service";
import { usersService } from "@/services/users.service";
import { ticketsService } from "@/services/tickets.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import { formatMoneyInput, moneyToCents } from "@/utils/format";
import type { Contract, ContractStatus } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS: { value: ContractStatus; label: string }[] = [
  { value: "active", label: "Ativo" },
  { value: "renewal", label: "Em renovação" },
  { value: "canceled", label: "Cancelado" },
  { value: "expired", label: "Vencido" },
];

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  defaultCustomerId,
  lockCustomer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
  defaultCustomerId?: string;
  lockCustomer?: boolean;
  onSaved?: () => void;
}) {
  const editing = Boolean(contract);
  const { user } = useSession();
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: carriers } = useAsyncData(() => carriersService.list());
  const { data: users } = useAsyncData(() => usersService.list());

  const [customerId, setCustomerId] = React.useState("");
  const [carrierId, setCarrierId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");
  const [policy, setPolicy] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [premium, setPremium] = React.useState("");
  const [commission, setCommission] = React.useState("");
  const [status, setStatus] = React.useState<ContractStatus>("active");
  const [notes, setNotes] = React.useState("");
  const [reminder, setReminder] = React.useState(true);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    const ok = picked.filter((f) => {
      const valid = f.type.startsWith("image/") || f.type === "application/pdf";
      if (!valid) {
        toast.error(`${f.name}: envie imagem ou PDF.`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: máximo 10MB.`);
        return false;
      }
      return true;
    });
    if (ok.length) setPendingFiles((prev) => [...prev, ...ok]);
  }

  React.useEffect(() => {
    if (!open) return;
    setPendingFiles([]);
    if (contract) {
      setCustomerId(contract.customer_id);
      setCarrierId(contract.carrier_id ?? "");
      setProductId(contract.product_id ?? "");
      setOwnerId(contract.owner_id ?? "");
      setPolicy(contract.policy_number ?? "");
      setStartsAt(contract.starts_at ?? "");
      setEndsAt(contract.ends_at ?? "");
      setPremium(contract.premium_cents ? formatMoneyInput(String(contract.premium_cents)) : "");
      setCommission(contract.commission_percent?.toString() ?? "");
      setStatus(contract.status);
      setNotes(contract.notes ?? "");
      setReminder(false);
    } else {
      setCustomerId(defaultCustomerId ?? "");
      setCarrierId("");
      setProductId("");
      // New contracts default the responsável to the current user (changeable).
      setOwnerId(user.id);
      setPolicy("");
      setStartsAt("");
      setEndsAt("");
      setPremium("");
      setCommission("");
      setStatus("active");
      setNotes("");
      setReminder(true);
    }
  }, [open, contract, defaultCustomerId, user.id]);

  async function save() {
    if (!customerId) {
      toast.error("Selecione o cliente.");
      return;
    }
    setSaving(true);
    const product = (products ?? []).find((p) => p.id === productId);
    const payload = {
      customer_id: customerId,
      product_id: productId || null,
      carrier_id: carrierId || null,
      owner_id: ownerId || null,
      policy_number: policy || null,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      premium_cents: moneyToCents(premium),
      commission_percent: commission ? parseFloat(commission.replace(",", ".")) : null,
      status,
      notes: notes || null,
    };
    try {
      let contractId = contract?.id;
      if (editing) {
        await contractsService.update(contract!.id, payload);
      } else {
        const created = await contractsService.create(payload);
        contractId = created.id;
        // Renewal reminder: task due 30 days before the policy ends.
        if (reminder && endsAt) {
          const due = new Date(`${endsAt}T09:00:00`);
          due.setDate(due.getDate() - 30);
          const custName = (customers ?? []).find((c) => c.id === customerId)?.name ?? "Cliente";
          const prodName = product?.name ?? "Apólice";
          try {
            await ticketsService.create({
              title: `Renovação: ${prodName}${policy ? ` (Apólice ${policy})` : ""} — ${custName}`,
              description: "Lembrete automático de renovação de contrato.",
              priority: "medium",
              category: "renewal",
              subject_type: "customer",
              customer_id: customerId,
              carrier_id: carrierId || undefined,
              product_id: product?.id,
              contract_id: contractId,
              assignee_id: ownerId || undefined,
              due_at: due.toISOString(),
              tags: ["renovação"],
            });
          } catch {
            // não bloqueia o salvamento do contrato
          }
        }
      }
      // Commit any staged attachments now that we have a contract id.
      if (contractId && pendingFiles.length) {
        for (const f of pendingFiles) {
          try {
            await contractAttachmentsService.add(contractId, f);
          } catch (e) {
            toast.error(`Falha no anexo ${f.name}: ${(e as Error).message}`);
          }
        }
      }
      toast.success(editing ? "Contrato atualizado" : "Contrato criado");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o contrato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar contrato" : "Novo contrato"}</DialogTitle>
          <DialogDescription>Apólice de um cliente, vinculada a um produto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Combobox
              options={(customers ?? []).map((c) => ({ value: c.id, label: c.name || "Sem nome" }))}
              value={customerId}
              onChange={setCustomerId}
              placeholder="Selecione"
              searchPlaceholder="Buscar cliente..."
              disabled={lockCustomer}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Seguradora</Label>
              <Combobox
                options={(carriers ?? []).map((c) => ({ value: c.id, label: c.name }))}
                value={carrierId}
                onChange={setCarrierId}
                placeholder="Selecione"
                searchPlaceholder="Buscar seguradora..."
              />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Combobox
                options={(products ?? []).map((p) => ({ value: p.id, label: p.name }))}
                value={productId}
                onChange={setProductId}
                placeholder="Selecione"
                searchPlaceholder="Buscar produto..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Número da apólice</Label>
              <Input
                value={policy}
                onChange={(e) => setPolicy(e.target.value.replace(/[.\s]/g, ""))}
                placeholder="Sem pontos ou espaços"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Combobox
              options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
              value={ownerId}
              onChange={setOwnerId}
              placeholder="Opcional"
              searchPlaceholder="Buscar usuário..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Início da vigência</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim da vigência</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prêmio (R$)</Label>
              <Input
                inputMode="numeric"
                placeholder="0,00"
                value={premium}
                onChange={(e) => setPremium(formatMoneyInput(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Comissão (%)</Label>
              <Input
                inputMode="decimal"
                placeholder="0"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Documentos</Label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={addFiles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" /> Anexar documento
            </Button>
            {pendingFiles.length > 0 && (
              <ul className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                  >
                    {f.type === "application/pdf" ? (
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <button
                      type="button"
                      title="Remover"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Proposta assinada, apólice, endossos e outros — PDF ou imagem (JPG, PNG, WEBP), até
              10MB.{" "}
              {editing ? "Serão enviados ao salvar." : "Serão enviados após criar o contrato."}
            </p>
          </div>

          {!editing && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <div className="pr-3">
                <p className="text-sm font-medium">Criar lembrete de renovação</p>
                <p className="text-xs text-muted-foreground">
                  Gera uma tarefa 30 dias antes do fim da vigência (requer data de fim).
                </p>
              </div>
              <Switch checked={reminder} onCheckedChange={setReminder} disabled={!endsAt} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!customerId}>
            {editing ? "Salvar alterações" : "Criar contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
