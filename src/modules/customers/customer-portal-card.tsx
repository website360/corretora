"use client";

import * as React from "react";
import { Check, Copy, KeyRound, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { env } from "@/config/env";
import type { Customer } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card">{children}</div>;
}

export function CustomerPortalCard({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [confirmDisable, setConfirmDisable] = React.useState(false);
  const [password, setPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const enabled = Boolean(customer.portal_enabled);
  const loginUrl = `${(env.appUrl || "").replace(/\/$/, "")}/portal/login`;

  async function enable() {
    setBusy(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/portal`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Falha ao habilitar.");
      setPassword(json.password as string);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/portal`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Falha ao desabilitar.");
      toast.success("Acesso ao portal desativado.");
      setConfirmDisable(false);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <SectionCard>
      <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" /> Portal do cliente
          {enabled && <Badge variant="success">Ativo</Badge>}
        </h3>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Dê ao cliente acesso a uma área logada para ver as próprias apólices, documentos e dados.
        </p>

        {!customer.email ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            Cadastre um <strong>e-mail</strong> no cliente para habilitar o portal (o login é por
            e-mail).
          </p>
        ) : enabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={enable} loading={busy}>
              <KeyRound className="size-4" /> Gerar nova senha
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDisable(true)}
            >
              Desabilitar acesso
            </Button>
          </div>
        ) : (
          <Button onClick={enable} loading={busy}>
            <UserCheck className="size-4" /> Habilitar acesso ao portal
          </Button>
        )}
      </div>

      {/* Senha gerada */}
      <Dialog open={Boolean(password)} onOpenChange={(o) => !o && setPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso criado</DialogTitle>
            <DialogDescription>
              Repasse estes dados ao cliente. Também enviamos um e-mail com um link para ele definir
              a senha. No primeiro acesso, a troca de senha é obrigatória.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Endereço de acesso</Label>
              <Input readOnly value={loginUrl} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input readOnly value={customer.email ?? ""} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha temporária</Label>
              <div className="flex gap-2">
                <Input readOnly value={password ?? ""} className="font-mono" />
                <Button variant="outline" onClick={copy} className="shrink-0">
                  {copied ? <Check className="text-success" /> : <Copy />} Copiar
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPassword(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="Desabilitar acesso ao portal"
        description="O cliente deixará de conseguir entrar no portal. Você pode reativar depois (uma nova senha será gerada)."
        confirmLabel="Desabilitar"
        variant="destructive"
        loading={busy}
        onConfirm={disable}
      />
    </SectionCard>
  );
}
