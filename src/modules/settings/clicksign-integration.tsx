"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { companySettingsService } from "@/services/company-settings.service";
import { env } from "@/config/env";
import type { ClickSignIntegration as ClickSignConfig } from "@/types/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClickSignIntegration({ onBack }: { onBack: () => void }) {
  const { user, can } = useSession();
  const router = useRouter();
  const isAdmin = can(["admin", "super_admin"]);
  const initial = (user.company.settings?.integrations?.clicksign ?? {}) as ClickSignConfig;

  const [environment, setEnvironment] = React.useState<"sandbox" | "production">(
    initial.environment ?? "sandbox",
  );
  const [apiToken, setApiToken] = React.useState(initial.apiToken ?? "");
  const [webhookSecret, setWebhookSecret] = React.useState(initial.webhookSecret ?? "");
  const [saving, setSaving] = React.useState(false);

  const webhookUrl = `${env.appUrl}/api/integrations/clicksign/webhook`;

  async function save() {
    setSaving(true);
    try {
      const clicksign: ClickSignConfig = {
        status: apiToken ? "configured" : "disconnected",
        environment,
        apiToken: apiToken || undefined,
        webhookSecret: webhookSecret || undefined,
        connectedAt: apiToken ? new Date().toISOString() : null,
      };
      await companySettingsService.update(user.company.id, {
        integrations: { ...user.company.settings?.integrations, clicksign },
      });
      toast.success("ClickSign salvo");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar. Apenas administradores podem alterar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft /> Voltar para integrações
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="size-5 text-primary" /> ClickSign — Assinatura digital
          </CardTitle>
          <CardDescription>
            Conecte a conta ClickSign da sua corretora para enviar orçamentos para assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!isAdmin} className="space-y-4 disabled:opacity-70">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select
                  value={environment}
                  onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Token da API ClickSign"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Segredo do webhook (HMAC)</Label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="HMAC secret configurado no ClickSign"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Em Conta → Webhooks no ClickSign, cadastre a URL abaixo e gere um HMAC; cole-o aqui.
              </p>
            </div>

            <div className="space-y-2">
              <Label>URL do webhook (cadastre no ClickSign)</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Copiar"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookUrl);
                    toast.success("URL copiada");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          </fieldset>

          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={save} loading={saving}>
                Salvar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
