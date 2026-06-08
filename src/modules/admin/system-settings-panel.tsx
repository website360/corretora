"use client";

import * as React from "react";
import { CreditCard, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  platformSettingsService,
  type PlatformSettingKey,
  type PlatformSettingStatus,
} from "@/services/platform-settings.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type FieldDef = {
  key: PlatformSettingKey;
  label: string;
  placeholder: string;
  help?: string;
};

const RESEND_FIELDS: FieldDef[] = [
  { key: "resend_api_key", label: "API Key do Resend", placeholder: "re_...", help: "Chave em resend.com/api-keys." },
  { key: "email_from", label: "Remetente (From)", placeholder: "Corretora <nao-responda@seudominio.com>", help: "Use um domínio verificado no Resend em produção." },
  { key: "email_reply_to", label: "Reply-to (opcional)", placeholder: "suporte@seudominio.com" },
];

const ASAAS_FIELDS: FieldDef[] = [
  { key: "asaas_api_key", label: "API Key do Asaas", placeholder: "$aact_...", help: "Chave do painel do Asaas." },
  { key: "asaas_base_url", label: "URL base", placeholder: "https://sandbox.asaas.com/api/v3", help: "Sandbox por padrão; troque pela URL de produção quando for ao ar." },
  { key: "asaas_webhook_token", label: "Token do webhook", placeholder: "Token configurado no Asaas" },
];

export function SystemSettingsPanel() {
  const { data, loading, refetch } = useAsyncData(() => platformSettingsService.get());
  const byKey = React.useMemo(() => {
    const map = new Map<PlatformSettingKey, PlatformSettingStatus>();
    for (const s of data ?? []) map.set(s.key, s);
    return map;
  }, [data]);

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Chaves de integração da <strong>plataforma</strong> (valem para todas as corretoras).
        O que você salvar aqui sobrescreve as variáveis de ambiente; deixe um campo em branco
        para voltar a usar o valor do ambiente. Chaves de cada corretora (ClickSign, WhatsApp)
        ficam nas Configurações dela.
      </p>

      {loading ? (
        <>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </>
      ) : (
        <>
          <SettingsCard
            icon={<Mail className="size-5 text-amber-600" />}
            title="E-mail (Resend)"
            description="Envio de e-mails transacionais (convites, cobrança)."
            fields={RESEND_FIELDS}
            byKey={byKey}
            onSaved={refetch}
          />
          <SettingsCard
            icon={<CreditCard className="size-5 text-emerald-600" />}
            title="Pagamentos (Asaas)"
            description="Cobrança de assinaturas e validação do webhook."
            fields={ASAAS_FIELDS}
            byKey={byKey}
            onSaved={refetch}
          />
        </>
      )}
    </div>
  );
}

function SourceBadge({ status }: { status?: PlatformSettingStatus }) {
  if (!status) return null;
  if (status.source === "db") return <Badge variant="success">Configurado</Badge>;
  if (status.source === "env") return <Badge variant="secondary">Via ambiente</Badge>;
  return <Badge variant="warning">Não configurado</Badge>;
}

function SettingsCard({
  icon,
  title,
  description,
  fields,
  byKey,
  onSaved,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  fields: FieldDef[];
  byKey: Map<PlatformSettingKey, PlatformSettingStatus>;
  onSaved: () => void;
}) {
  // Valores digitados (apenas os preenchidos são enviados no save).
  const [values, setValues] = React.useState<Partial<Record<PlatformSettingKey, string>>>({});
  const [saving, setSaving] = React.useState(false);

  // Pré-preenche campos não-secretos com o valor efetivo vindo do GET.
  React.useEffect(() => {
    const seed: Partial<Record<PlatformSettingKey, string>> = {};
    for (const f of fields) {
      const s = byKey.get(f.key);
      if (s && !s.secret && s.value) seed[f.key] = s.value;
    }
    setValues(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byKey]);

  async function save() {
    setSaving(true);
    try {
      const patch: Partial<Record<PlatformSettingKey, string>> = {};
      for (const f of fields) {
        const status = byKey.get(f.key);
        const typed = values[f.key];
        if (typed === undefined) continue;
        if (status && !status.secret) {
          // Campo texto: envia sempre (permite editar/limpar o valor atual).
          patch[f.key] = typed;
        } else if (typed.trim() !== "") {
          // Campo secreto: só envia quando preenchido (branco = manter).
          patch[f.key] = typed;
        }
      }
      if (Object.keys(patch).length === 0) {
        toast.info("Nada para salvar.");
        return;
      }
      await platformSettingsService.update(patch);
      toast.success(`${title} salvo`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f) => {
          const status = byKey.get(f.key);
          const secret = status?.secret ?? false;
          return (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <SourceBadge status={status} />
              </div>
              <Input
                id={f.key}
                type={secret ? "password" : "text"}
                autoComplete="off"
                placeholder={secret && status?.isSet ? "•••••••• (deixe em branco para manter)" : f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
              {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
            </div>
          );
        })}
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
