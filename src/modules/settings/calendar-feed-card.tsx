"use client";

import * as React from "react";
import { CalendarDays, Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { env } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Mostra o link de assinatura da agenda (feed iCalendar) do usuário, para
 * adicionar no Outlook, Google (Android) e Apple (iPhone). O link é secreto
 * (token) e pode ser regenerado para revogar o anterior.
 */
export function CalendarFeedCard() {
  const { user } = useSession();
  const [token, setToken] = React.useState<string | null>(user.calendar_token ?? null);
  const [copied, setCopied] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);

  const base = (env.appUrl || "").replace(/\/$/, "");
  const httpsUrl = token ? `${base}/api/calendar/feed/${token}` : "";
  // webcal:// abre direto o app de calendário no Apple/alguns clientes.
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  async function copy() {
    if (!httpsUrl) return;
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/calendar/regenerate", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Falha ao gerar novo link.");
      setToken(json.token as string);
      toast.success("Novo link gerado. O link anterior deixou de funcionar.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" /> Assinar a agenda
        </CardTitle>
        <CardDescription>
          Veja seus eventos e tarefas (com vencimento) no Outlook, Google (Android) e Apple
          (iPhone). Atualizam sozinhos. Este link é pessoal e secreto — não compartilhe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input readOnly value={httpsUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check className="text-success" /> : <Copy />} Copiar
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={webcalUrl}>Adicionar ao calendário</a>
          </Button>
          <Button variant="ghost" size="sm" onClick={regenerate} loading={regenerating}>
            <RefreshCw /> Gerar novo link
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Como assinar</p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              <strong>Google / Android:</strong> Google Agenda → Outros calendários → A partir
              de URL → cole o link.
            </li>
            <li>
              <strong>Apple / iPhone:</strong> Ajustes → Calendário → Contas → Adicionar conta →
              Outro → Adicionar calendário assinado → cole o link.
            </li>
            <li>
              <strong>Outlook:</strong> Calendário → Adicionar calendário → Assinar da Web → cole
              o link.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
