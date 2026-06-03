"use client";

import Link from "next/link";
import { ArrowRight, FileText, Headset, Percent, UserPlus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReportLink {
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  soon?: boolean;
}

const REPORTS: ReportLink[] = [
  {
    title: "Contratos",
    description: "Apólices por cliente, situação, período e produto. Exporta CSV e PDF.",
    href: "/relatorios/contratos",
    icon: FileText,
  },
  {
    title: "Atendimentos",
    description: "Volume de atendimentos por canal, cliente e período.",
    icon: Headset,
    soon: true,
  },
  {
    title: "Comissões",
    description: "Comissão estimada por seguradora e produto.",
    icon: Percent,
    soon: true,
  },
  {
    title: "Leads",
    description: "Conversão de leads em clientes por etapa do funil.",
    icon: UserPlus,
    soon: true,
  },
];

export function ReportsHub() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title="Relatórios" description="Escolha um relatório para visualizar e exportar." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const content = (
            <Card
              className={cn(
                "flex h-full flex-col gap-3 p-5 transition-colors",
                r.soon
                  ? "opacity-70"
                  : "cursor-pointer hover:border-primary/40 hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                {r.soon ? (
                  <Badge variant="secondary">Em breve</Badge>
                ) : (
                  <ArrowRight className="size-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>
              </div>
            </Card>
          );
          return r.href && !r.soon ? (
            <Link key={r.title} href={r.href}>
              {content}
            </Link>
          ) : (
            <div key={r.title}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
