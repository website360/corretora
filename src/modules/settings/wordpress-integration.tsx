"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Download, KeyRound, LayoutTemplate, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { companySettingsService } from "@/services/company-settings.service";
import { env } from "@/config/env";
import type { WordPressIntegration as WordPressConfig } from "@/types/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function newApiKey() {
  const rnd = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(16).slice(2);
  return `wp_sk_${rnd()}${rnd()}`;
}

export function WordPressIntegration({ onBack }: { onBack: () => void }) {
  const { user, can } = useSession();
  const router = useRouter();
  const isAdmin = can(["admin", "super_admin"]);
  const initial = (user.company.settings?.integrations?.wordpress ?? {}) as WordPressConfig;

  const [apiKey, setApiKey] = React.useState(initial.apiKey ?? "");
  const [saving, setSaving] = React.useState(false);

  const apiUrl = `${env.appUrl.replace(/\/+$/, "")}/api/leads`;

  async function persist(key: string) {
    setSaving(true);
    try {
      const wordpress: WordPressConfig = {
        apiKey: key || undefined,
        connectedAt: key ? new Date().toISOString() : null,
      };
      await companySettingsService.update(user.company.id, {
        integrations: { ...user.company.settings?.integrations, wordpress },
      });
      setApiKey(key);
      router.refresh();
      return true;
    } catch {
      toast.error("Não foi possível salvar. Apenas administradores podem alterar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    const key = newApiKey();
    if (await persist(key)) toast.success("Chave gerada e salva.");
  }

  async function regenerate() {
    if (
      !window.confirm(
        "Gerar uma nova chave invalida a atual. Os sites que usam a chave antiga param de enviar leads até você atualizar a chave neles. Continuar?",
      )
    )
      return;
    const key = newApiKey();
    if (await persist(key)) toast.success("Nova chave gerada. Atualize-a no plugin do site.");
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copiado`);
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft /> Voltar para integrações
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-primary" /> Site / WordPress — Captura de leads
          </CardTitle>
          <CardDescription>
            Instale o plugin no seu WordPress para enviar os leads dos formulários (Contact Form 7,
            WPForms, Gravity, Elementor e formulários HTML) direto para o funil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Chave de API */}
          <div className="space-y-2">
            <Label>Chave de API</Label>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <Input readOnly value={apiKey} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Copiar chave"
                  onClick={() => copy(apiKey, "Chave")}
                >
                  <Copy className="size-4" />
                </Button>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Gerar nova chave"
                    onClick={regenerate}
                    loading={saving}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                )}
              </div>
            ) : isAdmin ? (
              <div>
                <Button onClick={generate} loading={saving}>
                  <KeyRound /> Gerar chave de API
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  A chave identifica a sua corretora. Mantenha-a em sigilo.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma chave gerada. Peça a um administrador para gerar.
              </p>
            )}
          </div>

          {/* URL da API */}
          <div className="space-y-2">
            <Label>URL da API</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={apiUrl} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Copiar URL"
                onClick={() => copy(apiUrl, "URL")}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O plugin já vem com a URL e a chave preenchidas — você não precisa configurar nada no
              WordPress.
            </p>
          </div>

          {/* Download do plugin */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-2 font-medium">Plugin do WordPress</p>
            {apiKey ? (
              <Button asChild variant="default">
                <a href="/api/integrations/wordpress/plugin" download>
                  <Download /> Baixar plugin (.zip)
                </a>
              </Button>
            ) : (
              <Button disabled>
                <Download /> Baixar plugin (.zip)
              </Button>
            )}
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Gere a chave acima e baixe o .zip do plugin.</li>
              <li>
                No WordPress: <strong>Plugins → Adicionar novo → Enviar plugin</strong>, escolha o
                .zip e clique em <strong>Instalar agora</strong>.
              </li>
              <li>
                Clique em <strong>Ativar</strong>. Pronto — a URL e a chave já vêm configuradas.
              </li>
              <li>
                Para formulários HTML próprios (sem plugin de formulário), adicione a classe{" "}
                <code>crm-lead-capture</code> à tag <code>&lt;form&gt;</code>.
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
