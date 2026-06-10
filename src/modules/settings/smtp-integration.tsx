"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { companySettingsService } from "@/services/company-settings.service";
import type { SmtpIntegration as SmtpConfig } from "@/types/domain";
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

export function SmtpIntegration({ onBack }: { onBack: () => void }) {
  const { user, can } = useSession();
  const router = useRouter();
  const isAdmin = can(["admin", "super_admin"]);
  const initial = (user.company.settings?.integrations?.smtp ?? {}) as SmtpConfig;

  const [host, setHost] = React.useState(initial.host ?? "");
  const [port, setPort] = React.useState(String(initial.port ?? 587));
  const [secure, setSecure] = React.useState(initial.secure ? "ssl" : "starttls");
  const [username, setUsername] = React.useState(initial.username ?? "");
  const [password, setPassword] = React.useState(initial.password ?? "");
  const [fromName, setFromName] = React.useState(initial.fromName ?? user.company.trade_name ?? "");
  const [fromEmail, setFromEmail] = React.useState(initial.fromEmail ?? "");
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const smtp: SmtpConfig = {
        host: host.trim() || undefined,
        port: Number(port) || 587,
        secure: secure === "ssl",
        username: username.trim() || undefined,
        password: password || undefined,
        fromName: fromName.trim() || undefined,
        fromEmail: fromEmail.trim() || undefined,
        status: host && username && fromEmail ? "configured" : "disconnected",
      };
      await companySettingsService.update(user.company.id, {
        integrations: { ...user.company.settings?.integrations, smtp },
      });
      toast.success("SMTP salvo");
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar. Apenas administradores podem alterar.");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/smtp/test", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; to?: string };
      if (json.ok) toast.success(`E-mail de teste enviado para ${json.to}.`);
      else toast.error(json.error || "Falha ao enviar o teste.");
    } catch {
      toast.error("Falha de rede ao testar.");
    } finally {
      setTesting(false);
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
            <Mail className="size-5 text-primary" /> E-mail (SMTP)
          </CardTitle>
          <CardDescription>
            E-mails enviados aos seus <strong>clientes</strong> (ex.: convite do portal) saem pelo
            seu próprio servidor SMTP, do seu domínio. E-mails do sistema (cobrança, recuperação de
            senha) continuam pela plataforma. Sem SMTP, tudo usa o envio padrão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground/80">
            <p>
              Alguns provedores de hospedagem (ex.: <strong>DigitalOcean App Platform</strong>)
              bloqueiam as portas de saída SMTP <strong>465/587</strong>. Se o teste falhar por
              tempo esgotado, tente a porta <strong>2525</strong> (Brevo, SendGrid, Mailgun e outros
              aceitam) com segurança <strong>STARTTLS</strong>.
            </p>
          </div>

          <fieldset disabled={!isAdmin} className="space-y-4 disabled:opacity-70">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Servidor (host)</Label>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.seudominio.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input
                    inputMode="numeric"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Segurança</Label>
                  <Select value={secure} onValueChange={setSecure}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starttls">STARTTLS (587)</SelectItem>
                      <SelectItem value="ssl">SSL/TLS (465)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario@seudominio.com"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do remetente</Label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail do remetente</Label>
                <Input
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="nao-responda@seudominio.com"
                />
              </div>
            </div>
          </fieldset>

          {isAdmin && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={test} loading={testing}>
                Testar envio
              </Button>
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
