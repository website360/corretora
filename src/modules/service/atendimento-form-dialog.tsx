"use client";

import * as React from "react";
import { toast } from "sonner";
import { serviceRecordsService } from "@/services/service-records.service";
import { customersService } from "@/services/customers.service";
import { productsService } from "@/services/products.service";
import { contractsService } from "@/services/contracts.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { SERVICE_CHANNEL_META } from "@/config/domain";
import type { ServiceChannel, ServiceRecord } from "@/types/domain";
import { Button } from "@/components/ui/button";
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

const NONE = "__none";
const CHANNELS = Object.keys(SERVICE_CHANNEL_META) as ServiceChannel[];

export function AtendimentoFormDialog({
  open,
  onOpenChange,
  record,
  defaultCustomerId,
  lockCustomer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ServiceRecord | null;
  defaultCustomerId?: string;
  lockCustomer?: boolean;
  onSaved?: () => void;
}) {
  const editing = Boolean(record);
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: contracts } = useAsyncData(() => contractsService.list());

  const [customerId, setCustomerId] = React.useState("");
  const [productId, setProductId] = React.useState(NONE);
  const [contractId, setContractId] = React.useState(NONE);
  const [channel, setChannel] = React.useState<ServiceChannel>("whatsapp");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (record) {
      setCustomerId(record.customer_id);
      setProductId(record.product_id ?? NONE);
      setContractId(record.contract_id ?? NONE);
      setChannel(record.channel);
      setNotes(record.notes);
    } else {
      setCustomerId(defaultCustomerId ?? "");
      setProductId(NONE);
      setContractId(NONE);
      setChannel("whatsapp");
      setNotes("");
    }
  }, [open, record, defaultCustomerId]);

  // Apólices do cliente selecionado.
  const customerContracts = (contracts ?? []).filter((c) => c.customer_id === customerId);
  React.useEffect(() => {
    if (contractId !== NONE && !customerContracts.some((c) => c.id === contractId)) {
      setContractId(NONE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function save() {
    if (!customerId) {
      toast.error("Selecione o cliente.");
      return;
    }
    if (!notes.trim()) {
      toast.error("Descreva o atendimento.");
      return;
    }
    setSaving(true);
    const payload = {
      customer_id: customerId,
      product_id: productId === NONE ? null : productId,
      contract_id: contractId === NONE ? null : contractId,
      channel,
      notes: notes.trim(),
    };
    try {
      if (editing) await serviceRecordsService.update(record!.id, payload);
      else await serviceRecordsService.create(payload);
      toast.success(editing ? "Atendimento atualizado" : "Atendimento registrado");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar o atendimento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar atendimento" : "Novo atendimento"}</DialogTitle>
          <DialogDescription>Registre um atendimento ao cliente.</DialogDescription>
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
              <Label>Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as ServiceChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {SERVICE_CHANNEL_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Combobox
                options={[
                  { value: NONE, label: "Nenhum" },
                  ...(products ?? []).map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={productId}
                onChange={(v) => setProductId(v || NONE)}
                placeholder="Nenhum"
                searchPlaceholder="Buscar produto..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Apólice (opcional)</Label>
            <Combobox
              options={[
                { value: NONE, label: "Genérico (sem apólice)" },
                ...customerContracts.map((c) => ({
                  value: c.id,
                  label: c.policy_number ? `Apólice ${c.policy_number}` : "Contrato",
                })),
              ]}
              value={contractId}
              onChange={(v) => setContractId(v || NONE)}
              placeholder="Genérico (sem apólice)"
              searchPlaceholder="Buscar apólice..."
              disabled={!customerId}
            />
          </div>

          <div className="space-y-2">
            <Label>Atendimento *</Label>
            <Textarea
              rows={4}
              placeholder="Ex.: Atendi o cliente por WhatsApp e informei os dados do seguro de vida."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!customerId || !notes.trim()}>
            {editing ? "Salvar alterações" : "Registrar atendimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
