import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CURRENT_VERSION } from "@/config/changelog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChangelogView } from "@/modules/help/changelog-view";

export const metadata: Metadata = { title: "Novidades" };

export default function NovidadesPage() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" asChild className="mt-1 shrink-0 text-muted-foreground">
          <Link href="/ajuda" aria-label="Voltar para Ajuda">
            <ArrowLeft />
          </Link>
        </Button>
        <PageHeader
          title="Novidades"
          description="Veja o que mudou no sistema a cada atualização."
          actions={<Badge variant="secondary">Versão atual: v{CURRENT_VERSION}</Badge>}
          className="flex-1"
        />
      </div>

      <div className="max-w-3xl">
        <ChangelogView />
      </div>
    </div>
  );
}
