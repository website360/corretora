import type { Metadata } from "next";
import { BookOpen, LifeBuoy, MessageCircle, Rocket } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ajuda & Suporte" };

const RESOURCES = [
  {
    icon: Rocket,
    title: "Primeiros passos",
    description: "Configure sua corretora, convide a equipe e cadastre clientes.",
  },
  {
    icon: BookOpen,
    title: "Documentação",
    description: "Guias completos de cada módulo da plataforma.",
  },
  {
    icon: MessageCircle,
    title: "Fale com o suporte",
    description: "Nossa equipe responde em até 1 dia útil.",
  },
  {
    icon: LifeBuoy,
    title: "Central de status",
    description: "Acompanhe a disponibilidade dos serviços em tempo real.",
  },
];

export default function AjudaPage() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader title="Ajuda & Suporte" description="Tudo o que você precisa para tirar o máximo da plataforma." />
      <div className="grid gap-4 sm:grid-cols-2">
        {RESOURCES.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.title} className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
