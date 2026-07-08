"use client";

import * as React from "react";
import { toast } from "sonner";
import { claimsService } from "@/services/claims.service";
import { customersService } from "@/services/customers.service";
import { contractsService } from "@/services/contracts.service";
import { usersService } from "@/services/users.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import { formatMoneyInput, moneyToCents } from "@/utils/format";
import { CLAIM_STATUS_META, CLAIM_STATUS_ORDER } from "@/config/domain";
import type { Claim, ClaimStatus } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function ClaimFormDialog({
  open,
  onOpenChange,
  claim,
  defaultCustomerId,
  defaultContractId,
  lockCustomer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim?: Claim | null;
  defaultCustomerId?: string;
  defaultContractId?: string;
  lockCustomer?: boolean;
  onSaved?: () => void;
}) {
  const editing = Boolean(claim);
  const { user } = useSession();
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: contracts } = useAsyncData(() => contractsService.list());
  const { data: users } = useAsyncData(() => usersService.list());

  const [customerId, setCustomerId] = React.useState("");
  const [contractId, setContractId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");
  const [status, setStatus] = React.useState<ClaimStatus>("analysis");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (claim) {
      setCustomerId(claim.customer_id);
      setContractId(claim.contract_id ?? "");
      setTitle(claim.title);
      setOccurredAt(claim.occurred_at ?? "");
      setAmount(claim.amount_cents ? formatMoneyInput(String(claim.amount_cents)) : "");
      setOwnerId(claim.owner_id ?? "");
      setStatus(claim.status);
      setDescription(claim.description ?? "");
    } else {
      setCustomerId(defaultCustomerId ?? "");
      setContractId(defaultContractId ?? "");
      setTitle("");
      setOccurredAt("");
      setAmount("");
      setOwnerId(user.id);
      setStatus("analysis");
      setDescription("");
    }
  }, [open, claim, defaultCustomerId, defaultContractId, user.id]);

  // Contratos do cliente selecionado (para o vínculo opcional).
  const contractOptions = (contracts ?? [])
    .filter((c) => !customerId || c.customer_id === customerId)
    .map((c) => ({
      value: c.id,
      label: c.policy_number ? `Apólice ${c.policy_number}` : "Contrato",
    }));

  async function save() {
    if (!customerId) {
      toast.error("Selecione o cliente.");
      return;
    }
    if (!title.trim()) {
      toast.error("Descreva o sinistro no título.");
      return;
    }
    setSaving(true);
    const contract = (contracts ?? []).find((c) => c.id === contractId);
    const payload = {
      customer_id: customerId,
      contract_id: contractId || null,
      product_id: contract?.product_id ?? null,
      owner_id: ownerId || null,
      status,
      title: title.trim(),
      description: description || null,
      occurred_at: occurredAt || null,
      amount_cents: moneyToCents(amount),
    };
    try {
      if (editing) {
        await claimsService.update(claim!.id, payload);
      } else {
        await claimsService.create(payload);
      }
      toast.success(editing ? "Sinistro atualizado" : "Sinistro registrado");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o sinistro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar sinistro" : "Novo sinistro"}</DialogTitle>
          <DialogDescription>Ocorrência de um cliente, opcionalmente ligada a uma apólice.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Combobox
              options={(customers ?? []).map((c) => ({ value: c.id, label: c.name || "Sem nome" }))}
              value={customerId}
              onChange={(v) => {
                setCustomerId(v);
                setContractId("");
              }}
              placeholder="Selecione"
              searchPlaceholder="Buscar cliente..."
              disabled={lockCustomer}
            />
          </div>

          <div className="space-y-2">
            <Label>Título / resumo *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Colisão traseira, roubo do veículo..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Apólice (opcional)</Label>
              <Combobox
                options={contractOptions}
                value={contractId}
                onChange={setContractId}
                placeholder="Sem vínculo"
                searchPlaceholder="Buscar apólice..."
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClaimStatus)}>
                <SelectTrigger>
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data da ocorrência</Label>
              <Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor estimado (R$)</Label>
              <Input
                inputMode="numeric"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
              />
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

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do sinistro, o que aconteceu, documentos etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!customerId || !title.trim()}>
            {editing ? "Salvar alterações" : "Registrar sinistro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
