"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Info,
  Loader2,
  MessageCircle,
  Plug,
  QrCode,
  RefreshCw,
  Smartphone,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { companySettingsService } from "@/services/company-settings.service";
import type { WhatsAppIntegration as WhatsAppConfig, WhatsAppProvider } from "@/types/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ProviderField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  help?: string;
}

interface ProviderMeta {
  id: WhatsAppProvider;
  name: string;
  tagline: string;
  description: string;
  fields: ProviderField[];
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "evolution",
    name: "Evolution Go",
    tagline: "Open-source / não oficial",
    description: "Conecte lendo o QR Code do WhatsApp. Ideal para começar rápido e com baixo custo.",
    fields: [
      {
        key: "baseUrl",
        label: "URL do servidor",
        placeholder: "https://seuservidor.com",
        help: "Raiz do seu servidor Evolution Go (sem /manager ou caminho extra).",
      },
      {
        key: "apiKey",
        label: "API Key global (admin)",
        placeholder: "GLOBAL_API_KEY do servidor",
        secret: true,
        help: "Chave global definida no servidor (env GLOBAL_API_KEY). Usada para criar a instância.",
      },
      { key: "instance", label: "Nome da instância", placeholder: "corretora-principal" },
    ],
  },
  {
    id: "zapi",
    name: "Z-API",
    tagline: "Não oficial",
    description: "Plataforma brasileira via QR Code, com pagamento por instância conectada.",
    fields: [
      { key: "instanceId", label: "ID da instância", placeholder: "3X4XXXXXXXXXXXXX" },
      { key: "token", label: "Token da instância", placeholder: "ABCDEF...", secret: true },
      {
        key: "clientToken",
        label: "Client-Token (segurança da conta)",
        placeholder: "Fxxxxxxxxxxxxxxxxxxxx",
        secret: true,
        help: "Token de segurança da conta, encontrado no painel da Z-API.",
      },
    ],
  },
  {
    id: "meta",
    name: "API Oficial (Meta)",
    tagline: "Oficial — WhatsApp Cloud API",
    description: "Integração homologada pela Meta, com selo verificado e maior estabilidade.",
    fields: [
      { key: "phoneNumberId", label: "ID do número de telefone", placeholder: "1234567890" },
      { key: "wabaId", label: "ID da conta comercial (WABA)", placeholder: "0987654321" },
      {
        key: "accessToken",
        label: "Token de acesso permanente",
        placeholder: "EAA...",
        secret: true,
      },
      {
        key: "verifyToken",
        label: "Token de verificação do webhook",
        placeholder: "uma-frase-secreta",
        help: "Você define este valor e o informa também no painel da Meta.",
      },
    ],
  },
];

interface WhatsAppIntegrationProps {
  onBack: () => void;
}

export function WhatsAppIntegration({ onBack }: WhatsAppIntegrationProps) {
  const { user, can } = useSession();
  const router = useRouter();
  const isAdmin = can(["admin", "super_admin"]);
  const initial = (user.company.settings?.integrations?.whatsapp ?? {}) as WhatsAppConfig;

  const [provider, setProvider] = React.useState<WhatsAppProvider | null>(
    initial.provider ?? null,
  );
  const [values, setValues] = React.useState<Record<string, Record<string, string>>>({
    evolution: { ...initial.evolution },
    zapi: { ...initial.zapi },
    meta: { ...initial.meta },
  });
  const [saving, setSaving] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [qr, setQr] = React.useState<{ base64: string | null; pairingCode: string | null } | null>(
    null,
  );
  const [connState, setConnState] = React.useState<"idle" | "connecting" | "open">(
    initial.status === "connected" ? "open" : "idle",
  );
  const pollRef = React.useRef<number | null>(null);
  const tickRef = React.useRef(0);

  const meta = PROVIDERS.find((p) => p.id === provider) ?? null;
  const connected = connState === "open" && initial.provider === provider;

  const stopPolling = React.useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);
  React.useEffect(() => stopPolling, [stopPolling]);

  function setField(key: string, value: string) {
    if (!provider) return;
    setValues((prev) => ({ ...prev, [provider]: { ...prev[provider], [key]: value } }));
  }

  /** Validates and writes the current provider config. Returns false on failure. */
  async function persist(silent = false): Promise<boolean> {
    if (!provider || !meta) return false;
    const missing = meta.fields.filter((f) => !values[provider]?.[f.key]?.trim());
    if (missing.length) {
      toast.error(`Preencha: ${missing.map((f) => f.label).join(", ")}`);
      return false;
    }
    const whatsapp: WhatsAppConfig = {
      provider,
      status: initial.provider === provider ? initial.status ?? "disconnected" : "disconnected",
      connectedNumber: initial.provider === provider ? initial.connectedNumber ?? null : null,
      [provider]: values[provider],
    };
    try {
      await companySettingsService.update(user.company.id, {
        integrations: { ...user.company.settings?.integrations, whatsapp },
      });
      if (!silent) {
        toast.success("Configuração do WhatsApp salva");
        router.refresh();
      }
      return true;
    } catch {
      toast.error("Não foi possível salvar. Apenas administradores podem alterar.");
      return false;
    }
  }

  async function save() {
    setSaving(true);
    try {
      await persist();
    } finally {
      setSaving(false);
    }
  }

  function startPolling() {
    stopPolling();
    tickRef.current = 0;
    pollRef.current = window.setInterval(async () => {
      tickRef.current += 1;
      try {
        const r = await fetch("/api/integrations/whatsapp/status");
        const j = await r.json();
        if (j.state === "open") {
          stopPolling();
          setConnState("open");
          setQr(null);
          toast.success(`WhatsApp conectado!${j.number ? ` (${j.number})` : ""}`);
          router.refresh();
          return;
        }
        // The QR expires; refresh it roughly every 21s while we wait.
        if (tickRef.current % 7 === 0) {
          const cr = await fetch("/api/integrations/whatsapp/connect", { method: "POST" });
          const cj = await cr.json();
          if (cr.ok && cj.connected) {
            stopPolling();
            setConnState("open");
            setQr(null);
            toast.success("WhatsApp conectado!");
            router.refresh();
          } else if (cr.ok && cj.qr) {
            setQr(cj.qr);
          }
        }
      } catch {
        /* transient network error — keep polling */
      }
    }, 3000);
  }

  /** Saves the config, asks Evolution to create/connect the instance and shows the QR. */
  async function generateQr() {
    setConnecting(true);
    try {
      const ok = await persist(true);
      if (!ok) return;
      const res = await fetch("/api/integrations/whatsapp/connect", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Não foi possível conectar.");
        return;
      }
      if (json.connected) {
        setConnState("open");
        toast.success("WhatsApp já está conectado.");
        router.refresh();
        return;
      }
      setQr(json.qr);
      setConnState("connecting");
      startPolling();
    } catch {
      toast.error("Falha ao falar com o servidor da Evolution.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    setSaving(true);
    stopPolling();
    try {
      await companySettingsService.update(user.company.id, {
        integrations: { ...user.company.settings?.integrations, whatsapp: {} },
      });
      setProvider(null);
      setQr(null);
      setConnState("idle");
      toast.success("WhatsApp desconectado");
      router.refresh();
    } catch {
      toast.error("Não foi possível desconectar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Voltar para integrações
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <MessageCircle className="size-6" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">WhatsApp</h2>
            {connected ? (
              <Badge variant="success" className="gap-1">
                <Check className="size-3" /> Conectado
              </Badge>
            ) : initial.provider ? (
              <Badge variant="secondary">Configurado</Badge>
            ) : (
              <Badge variant="outline">Não conectado</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Conecte um número para automatizar o envio de mensagens e centralizar os atendimentos.
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Apenas administradores podem configurar integrações.
        </div>
      )}

      <fieldset disabled={!isAdmin} className="space-y-6 disabled:opacity-70">
        {/* Provider selection */}
        <div className="space-y-3">
          <div>
            <p className="font-medium">Escolha o provedor</p>
            <p className="text-sm text-muted-foreground">
              Cada provedor tem custos e formas de conexão diferentes.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-accent/40 ring-1 ring-primary"
                      : "hover:border-primary/40 hover:bg-accent/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    {active && <Check className="size-4 text-primary" />}
                  </div>
                  <Badge
                    variant={p.id === "meta" ? "success" : "outline"}
                    className="w-fit text-[10px]"
                  >
                    {p.tagline}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Credentials */}
        {meta && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credenciais — {meta.name}</CardTitle>
              <CardDescription>
                Informe os dados de acesso. Eles ficam disponíveis apenas para a sua corretora.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {meta.fields.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    <Input
                      id={f.key}
                      type={f.secret ? "password" : "text"}
                      autoComplete="off"
                      placeholder={f.placeholder}
                      value={values[meta.id]?.[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                    />
                    {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>
                  {meta.id === "meta"
                    ? "Após salvar, configure o webhook no painel da Meta usando o token de verificação acima para começar a receber mensagens."
                    : "Após salvar, a conexão é estabelecida lendo o QR Code do WhatsApp no aparelho que terá o número."}
                </span>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {initial.provider && (
                  <Button variant="outline" onClick={disconnect} disabled={saving}>
                    <Unplug className="size-4" /> Desconectar
                  </Button>
                )}
                <Button variant={meta.id === "evolution" ? "outline" : "default"} onClick={save} loading={saving}>
                  <Plug className="size-4" /> Salvar configuração
                </Button>
                {meta.id === "evolution" && (
                  <Button onClick={generateQr} loading={connecting}>
                    <QrCode className="size-4" /> Gerar QR Code
                  </Button>
                )}
              </div>

              {/* Evolution connection panel */}
              {meta.id === "evolution" && (connState !== "idle" || qr) && (
                <div className="rounded-xl border p-4">
                  {connected ? (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
                        <Check className="size-5" />
                      </span>
                      <div>
                        <p className="font-medium">WhatsApp conectado</p>
                        {initial.connectedNumber && (
                          <p className="text-muted-foreground">
                            Número: {initial.connectedNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm font-medium">
                        Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e escaneie:
                      </p>
                      {qr?.base64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qr.base64}
                          alt="QR Code do WhatsApp"
                          className="size-56 rounded-lg border bg-white p-2"
                        />
                      ) : (
                        <div className="flex size-56 items-center justify-center rounded-lg border bg-muted/30">
                          <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {qr?.pairingCode && (
                        <p className="text-sm">
                          Ou use o código de pareamento:{" "}
                          <span className="font-mono font-semibold tracking-wider">
                            {qr.pairingCode}
                          </span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Smartphone className="size-3.5" />
                        <span>Aguardando leitura…</span>
                        <Loader2 className="size-3.5 animate-spin" />
                      </div>
                      <Button variant="ghost" size="sm" onClick={generateQr} loading={connecting}>
                        <RefreshCw className="size-3.5" /> Gerar novo QR
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </fieldset>
    </div>
  );
}
