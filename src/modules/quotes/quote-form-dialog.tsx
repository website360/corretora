"use client";

import * as React from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { quotesService } from "@/services/quotes.service";
import { customersService } from "@/services/customers.service";
import { usersService } from "@/services/users.service";
import { carriersService } from "@/services/carriers.service";
import { productsService } from "@/services/products.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import { cn } from "@/lib/utils";
import { formatMoneyInput, moneyToCents } from "@/utils/format";
import type { Quote } from "@/types/domain";
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

interface OptionRow {
  id?: string;
  carrier_id: string;
  product_id: string;
  premium: string;
  commission: string;
}

const emptyRow = (): OptionRow => ({ carrier_id: "", product_id: "", premium: "", commission: "" });
const toCents = (v: string) => moneyToCents(v);

export function QuoteFormDialog({
  open,
  onOpenChange,
  quote,
  defaultCustomerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: Quote | null;
  defaultCustomerId?: string;
  onSaved?: () => void;
}) {
  const editing = Boolean(quote);
  const { user } = useSession();
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: users } = useAsyncData(() => usersService.list());
  const { data: carriers } = useAsyncData(() => carriersService.list());
  const { data: products } = useAsyncData(() => productsService.list());

  const [customerId, setCustomerId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [rows, setRows] = React.useState<OptionRow[]>([emptyRow()]);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTitle(quote?.title ?? "");
    setNotes(quote?.notes ?? "");
    setOwnerId(quote?.owner_id ?? user.id);
    setCustomerId(quote?.customer_id ?? defaultCustomerId ?? "");
    if (quote) {
      quotesService.listOptions(quote.id).then((opts) => {
        if (opts.length === 0) {
          setRows([emptyRow()]);
          setSelectedIdx(0);
          return;
        }
        setRows(
          opts.map((o) => ({
            id: o.id,
            carrier_id: o.carrier_id ?? "",
            product_id: o.product_id ?? "",
            premium: o.premium_cents ? formatMoneyInput(String(o.premium_cents)) : "",
            commission: o.commission_percent?.toString() ?? "",
          })),
        );
        setSelectedIdx(Math.max(0, opts.findIndex((o) => o.is_selected)));
      });
    } else {
      setRows([emptyRow()]);
      setSelectedIdx(0);
    }
  }, [open, quote, defaultCustomerId, user.id]);

  function setRow(i: number, patch: Partial<OptionRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!customerId) {
      toast.error("Selecione o cliente.");
      return;
    }
    const filled = rows.filter((r) => r.carrier_id || r.product_id || r.premium);
    if (filled.length === 0) {
      toast.error("Adicione ao menos uma opção (seguradora/produto/prêmio).");
      return;
    }
    setSaving(true);
    try {
      let quoteId = quote?.id;
      if (editing) {
        await quotesService.update(quote!.id, {
          customer_id: customerId,
          owner_id: ownerId || null,
          title: title || null,
          notes: notes || null,
        });
      } else {
        const created = await quotesService.create({
          customer_id: customerId,
          owner_id: ownerId || null,
          title: title || null,
          notes: notes || null,
        });
        quoteId = created.id;
      }
      if (!quoteId) throw new Error("Falha ao salvar orçamento.");

      // Reconcile options: remove deleted, update existing, add new.
      const existing = editing ? await quotesService.listOptions(quoteId) : [];
      const keptIds = new Set(rows.map((r) => r.id).filter(Boolean) as string[]);
      await Promise.all(
        existing.filter((o) => !keptIds.has(o.id)).map((o) => quotesService.removeOption(o.id)),
      );
      const finalIds: string[] = [];
      for (const r of rows) {
        const payload = {
          carrier_id: r.carrier_id || null,
          product_id: r.product_id || null,
          premium_cents: toCents(r.premium),
          commission_percent: r.commission ? parseFloat(r.commission.replace(",", ".")) : null,
        };
        if (r.id) {
          await quotesService.updateOption(r.id, payload);
          finalIds.push(r.id);
        } else {
          const created = await quotesService.addOption(quoteId, payload);
          finalIds.push(created.id);
        }
      }
      const chosen = finalIds[selectedIdx] ?? finalIds[0];
      if (chosen) await quotesService.selectOption(quoteId, chosen);

      toast.success(editing ? "Orçamento atualizado" : "Orçamento criado");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message ?? "Não foi possível salvar o orçamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>
            Compare opções de seguradoras/produtos. A opção marcada vira o contrato ao fechar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Combobox
                options={(customers ?? []).map((c) => ({ value: c.id, label: c.name || "Sem nome" }))}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Selecione"
                searchPlaceholder="Buscar cliente..."
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Combobox
                options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
                value={ownerId}
                onChange={setOwnerId}
                placeholder="Selecione"
                searchPlaceholder="Buscar usuário..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Seguro auto — Civic 2022"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Opções (cotações)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
              >
                <Plus className="size-3.5" /> Adicionar opção
              </Button>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3",
                    selectedIdx === i ? "border-primary bg-primary/5" : "bg-card",
                  )}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Combobox
                      options={(carriers ?? []).map((c) => ({ value: c.id, label: c.name }))}
                      value={r.carrier_id}
                      onChange={(v) => setRow(i, { carrier_id: v })}
                      placeholder="Seguradora"
                      searchPlaceholder="Buscar seguradora..."
                    />
                    <Combobox
                      options={(products ?? [])
                        .filter((p) => !r.carrier_id || !p.carrier_id || p.carrier_id === r.carrier_id)
                        .map((p) => ({ value: p.id, label: p.name }))}
                      value={r.product_id}
                      onChange={(v) => setRow(i, { product_id: v })}
                      placeholder="Produto"
                      searchPlaceholder="Buscar produto..."
                    />
                    <Input
                      inputMode="numeric"
                      placeholder="Prêmio (R$)"
                      value={r.premium}
                      onChange={(e) => setRow(i, { premium: formatMoneyInput(e.target.value) })}
                    />
                    <Input
                      inputMode="decimal"
                      placeholder="Comissão (%)"
                      value={r.commission}
                      onChange={(e) => setRow(i, { commission: e.target.value })}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Button
                      type="button"
                      variant={selectedIdx === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedIdx(i)}
                    >
                      <Check className="size-3.5" /> {selectedIdx === i ? "Selecionada" : "Selecionar"}
                    </Button>
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setRows((prev) => prev.filter((_, idx) => idx !== i));
                          setSelectedIdx((s) => (s >= i && s > 0 ? s - 1 : s));
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving} disabled={!customerId}>
            {editing ? "Salvar alterações" : "Criar orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
