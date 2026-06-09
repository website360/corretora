"use client";

import * as React from "react";
import {
  ArrowRight,
  FileSignature,
  Globe,
  Instagram,
  LayoutTemplate,
  Mail,
  MessageCircle,
  Send,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/contexts/session-context";
import type {
  ClickSignIntegration as ClickSignConfig,
  WhatsAppIntegration as WhatsAppConfig,
  WordPressIntegration as WordPressConfig,
} from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WhatsAppIntegration } from "@/modules/settings/whatsapp-integration";
import { ClickSignIntegration } from "@/modules/settings/clicksign-integration";
import { WordPressIntegration } from "@/modules/settings/wordpress-integration";

type IntegrationId = "whatsapp" | "clicksign" | "wordpress";

interface IntegrationMeta {
  id: IntegrationId | string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  soon?: boolean;
}

const INTEGRATIONS: IntegrationMeta[] = [
  {
    id: "whatsapp",
    title: "WhatsApp",
    description: "Automatize mensagens e atendimentos. Evolution Go, Z-API ou API Oficial (Meta).",
    icon: MessageCircle,
    iconClass: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "clicksign",
    title: "ClickSign",
    description: "Envie orçamentos para assinatura digital e gere o contrato ao assinar.",
    icon: FileSignature,
    iconClass: "bg-primary/10 text-primary",
  },
  {
    id: "instagram",
    title: "Instagram Direct",
    description: "Receba e responda mensagens do Instagram no mesmo lugar.",
    icon: Instagram,
    iconClass: "bg-pink-500/10 text-pink-600",
    soon: true,
  },
  {
    id: "telegram",
    title: "Telegram",
    description: "Atendimento e notificações via bot do Telegram.",
    icon: Send,
    iconClass: "bg-sky-500/10 text-sky-600",
    soon: true,
  },
  {
    id: "email",
    title: "E-mail (SMTP)",
    description: "Envie e-mails transacionais pelo seu próprio servidor.",
    icon: Mail,
    iconClass: "bg-amber-500/10 text-amber-600",
    soon: true,
  },
  {
    id: "wordpress",
    title: "Site / WordPress",
    description: "Capture leads dos formulários do seu site (WordPress ou HTML) direto no funil.",
    icon: LayoutTemplate,
    iconClass: "bg-indigo-500/10 text-indigo-600",
  },
];

export function IntegrationsPanel() {
  const { user } = useSession();
  const [open, setOpen] = React.useState<IntegrationId | null>(null);

  const whatsapp = (user.company.settings?.integrations?.whatsapp ?? {}) as WhatsAppConfig;
  const whatsappStatus =
    whatsapp.status === "connected"
      ? { label: "Conectado", variant: "success" as const }
      : whatsapp.provider
        ? { label: "Configurado", variant: "secondary" as const }
        : null;

  const clicksign = (user.company.settings?.integrations?.clicksign ?? {}) as ClickSignConfig;
  const clicksignStatus = clicksign.apiToken
    ? { label: "Configurado", variant: "secondary" as const }
    : null;

  const wordpress = (user.company.settings?.integrations?.wordpress ?? {}) as WordPressConfig;
  const wordpressStatus = wordpress.apiKey
    ? { label: "Configurado", variant: "secondary" as const }
    : null;

  if (open === "whatsapp") {
    return <WhatsAppIntegration onBack={() => setOpen(null)} />;
  }
  if (open === "clicksign") {
    return <ClickSignIntegration onBack={() => setOpen(null)} />;
  }
  if (open === "wordpress") {
    return <WordPressIntegration onBack={() => setOpen(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">Integrações</p>
        <p className="text-sm text-muted-foreground">
          Conecte canais e serviços externos à sua corretora.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((it) => {
          const Icon = it.icon;
          const status =
            it.id === "whatsapp"
              ? whatsappStatus
              : it.id === "clicksign"
                ? clicksignStatus
                : it.id === "wordpress"
                  ? wordpressStatus
                  : null;
          return (
            <Card
              key={it.id}
              role={it.soon ? undefined : "button"}
              tabIndex={it.soon ? undefined : 0}
              onClick={() => !it.soon && setOpen(it.id as IntegrationId)}
              onKeyDown={(e) => {
                if (!it.soon && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setOpen(it.id as IntegrationId);
                }
              }}
              className={cn(
                "flex h-full flex-col gap-3 p-5 transition-colors",
                it.soon
                  ? "opacity-70"
                  : "cursor-pointer hover:border-primary/40 hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    it.iconClass,
                  )}
                >
                  <Icon className="size-5" />
                </span>
                {it.soon ? (
                  <Badge variant="secondary">Em breve</Badge>
                ) : status ? (
                  <Badge variant={status.variant}>{status.label}</Badge>
                ) : (
                  <ArrowRight className="size-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{it.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{it.description}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
