"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CURRENT_VERSION } from "@/config/changelog";
import { useChangelogStore } from "@/stores/changelog-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Card de "Novidades" com indicador de atualização ainda não vista. */
export function NovidadesCard() {
  const lastSeenVersion = useChangelogStore((s) => s.lastSeenVersion);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Só sinaliza depois de hidratar (o valor persistido vem do localStorage).
  const hasUnseen = mounted && lastSeenVersion !== CURRENT_VERSION;

  return (
    <Link href="/ajuda/novidades" className="block">
      <Card className="cursor-pointer border-primary/30 transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-5">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
            {hasUnseen && (
              <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-card bg-primary" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">Novidades do sistema</p>
              {hasUnseen ? (
                <Badge variant="success">Atualizado</Badge>
              ) : (
                <Badge variant="secondary">v{CURRENT_VERSION}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Veja as versões, melhorias e correções feitas na plataforma.
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
