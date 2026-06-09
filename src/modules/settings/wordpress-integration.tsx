"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Code2, Copy, Download, KeyRound, LayoutTemplate, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { companySettingsService } from "@/services/company-settings.service";
import { kanbanService } from "@/services/kanban.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { env } from "@/config/env";
import type { WordPressIntegration as WordPressConfig } from "@/types/domain";
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

function newApiKey() {
  const rnd = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(16).slice(2);
  return `wp_sk_${rnd()}${rnd()}`;
}

/** Snippet JS para capturar formulários em qualquer site (não-WordPress). */
function buildSnippet(apiUrl: string, apiKey: string) {
  return `<script>
(function(){
  var URL_=${JSON.stringify(apiUrl)}, KEY_=${JSON.stringify(apiKey)};
  function v(f,ns){for(var i=0;i<ns.length;i++){var e=f.querySelector('[name="'+ns[i]+'"]');if(e&&e.value)return e.value;}return "";}
  document.addEventListener("submit",function(ev){
    var f=ev.target;
    if(!(f.classList&&(f.classList.contains("crm-lead-capture")||f.getAttribute("data-crm-lead")==="true")))return;
    var d={name:v(f,["name","nome","seu-nome","fullname"]),email:v(f,["email","e-mail","seu-email"]),phone:v(f,["phone","telefone","whatsapp","tel"]),source:"site",metadata:{page:location.href}};
    if(!d.name||!d.email)return;
    fetch(URL_,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":KEY_},body:JSON.stringify(d)}).catch(function(){});
  });
})();
</script>`;
}

export function WordPressIntegration({ onBack }: { onBack: () => void }) {
  const { user, can } = useSession();
  const router = useRouter();
  const isAdmin = can(["admin", "super_admin"]);
  const initial = (user.company.settings?.integrations?.wordpress ?? {}) as WordPressConfig;

  const [apiKey, setApiKey] = React.useState(initial.apiKey ?? "");
  const [boardId, setBoardId] = React.useState<string>(initial.boardId ?? "");
  const [saving, setSaving] = React.useState(false);
  const { data: boards } = useAsyncData(() => kanbanService.listBoards());

  const apiUrl = `${env.appUrl.replace(/\/+$/, "")}/api/leads`;

  async function persist(patch: { apiKey?: string; boardId?: string }) {
    setSaving(true);
    try {
      const key = patch.apiKey !== undefined ? patch.apiKey : apiKey;
      const board = patch.boardId !== undefined ? patch.boardId : boardId;
      const wordpress: WordPressConfig = {
        apiKey: key || undefined,
        boardId: board || null,
        connectedAt: key ? new Date().toISOString() : null,
      };
      await companySettingsService.update(user.company.id, {
        integrations: { ...user.company.settings?.integrations, wordpress },
      });
      if (patch.apiKey !== undefined) setApiKey(key);
      if (patch.boardId !== undefined) setBoardId(board);
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
    if (await persist({ apiKey: newApiKey() })) toast.success("Chave gerada e salva.");
  }

  async function regenerate() {
    if (
      !window.confirm(
        "Gerar uma nova chave invalida a atual. Os sites que usam a chave antiga param de enviar leads até você atualizar a chave neles. Continuar?",
      )
    )
      return;
    if (await persist({ apiKey: newApiKey() }))
      toast.success("Nova chave gerada. Atualize-a no plugin/script do site.");
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
            Receba os leads dos formulários do seu site (WordPress ou qualquer HTML) direto no funil.
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

          {/* Kanban de destino */}
          <div className="space-y-2">
            <Label>Kanban de destino dos leads</Label>
            <Select
              value={boardId || "__none"}
              onValueChange={(v) => persist({ boardId: v === "__none" ? "" : v })}
              disabled={!isAdmin}
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Funil padrão (primeiro kanban)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Funil padrão (primeiro kanban)</SelectItem>
                {(boards ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Os leads capturados entram na primeira etapa deste kanban.
            </p>
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
          </div>

          {/* Download do plugin */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-2 flex items-center gap-2 font-medium">
              <Download className="size-4" /> WordPress (plugin)
            </p>
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
                .zip e <strong>Instalar agora</strong>.
              </li>
              <li>
                Clique em <strong>Ativar</strong>. A URL e a chave já vêm configuradas.
              </li>
              <li>
                Captura automática de Contact Form 7, WPForms, Gravity e Elementor. Para formulários
                HTML, adicione a classe <code>crm-lead-capture</code> ao <code>&lt;form&gt;</code>.
              </li>
            </ol>
          </div>

          {/* Script genérico (qualquer site) */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-2 flex items-center gap-2 font-medium">
              <Code2 className="size-4" /> Qualquer site (script)
            </p>
            {apiKey ? (
              <>
                <p className="mb-2 text-sm text-muted-foreground">
                  Cole este script antes de <code>&lt;/body&gt;</code> e adicione a classe{" "}
                  <code>crm-lead-capture</code> ao seu <code>&lt;form&gt;</code>. Os campos{" "}
                  <code>name</code>/<code>nome</code> e <code>email</code> são detectados
                  automaticamente.
                </p>
                <div className="relative">
                  <pre className="max-h-48 overflow-auto rounded-md border bg-background p-3 text-[11px] leading-relaxed">
                    {buildSnippet(apiUrl, apiKey)}
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => copy(buildSnippet(apiUrl, apiKey), "Script")}
                  >
                    <Copy className="size-3.5" /> Copiar
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Gere a chave de API para ver o script.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
