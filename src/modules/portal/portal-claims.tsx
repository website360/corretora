"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Claim, ClaimStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const STATUS: Record<
  ClaimStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  requested: { label: "Solicitado", variant: "warning" },
  analysis: { label: "Em análise", variant: "secondary" },
  approved: { label: "Aprovado", variant: "success" },
  denied: { label: "Negado", variant: "destructive" },
  paid: { label: "Pago", variant: "success" },
  closed: { label: "Encerrado", variant: "secondary" },
};

function fmtDate(d: string | null) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR") : null;
}

export function PortalClaims({
  claims,
  contracts,
}: {
  claims: Claim[];
  contracts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [contractId, setContractId] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    if (!title.trim()) {
      toast.error("Descreva o sinistro.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          contract_id: contractId || null,
          occurred_at: occurredAt || null,
          description: description || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Sinistro solicitado! Nossa equipe vai analisar.");
      setOpen(false);
      setTitle("");
      setContractId("");
      setOccurredAt("");
      setDescription("");
      router.refresh();
    } catch {
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldAlert className="size-4" /> Meus sinistros
        </h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Solicitar sinistro
        </Button>
      </div>

      {claims.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Você ainda não abriu nenhum sinistro. Precisa acionar seu seguro? Clique em “Solicitar
          sinistro”.
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => {
            const meta = STATUS[c.status] ?? STATUS.requested;
            const d = fmtDate(c.occurred_at);
            return (
              <div key={c.id} className="rounded-2xl border bg-card p-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      #{c.number}
                      {d ? ` · ${d}` : ""}
                    </p>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                {c.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar sinistro</DialogTitle>
            <DialogDescription>
              Conte o que aconteceu. Nossa equipe vai analisar e entrar em contato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>O que aconteceu? *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Colisão, roubo, avaria..."
                autoFocus
              />
            </div>
            {contracts.length > 0 && (
              <div className="space-y-2">
                <Label>Apólice relacionada</Label>
                <Select
                  value={contractId || "none"}
                  onValueChange={(v) => setContractId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem apólice</SelectItem>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Data da ocorrência</Label>
              <Input
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Detalhes</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva com detalhes o que ocorreu."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} loading={saving} disabled={!title.trim()}>
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
