"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import { CHANGELOG, CHANGE_TYPE_META, CURRENT_VERSION } from "@/config/changelog";
import { useChangelogStore } from "@/stores/changelog-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function formatDate(iso: string): string {
  return format(new Date(`${iso}T00:00:00`), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Lista de versões/atualizações, destacando o que ainda não foi visto. */
export function ChangelogView() {
  const markSeen = useChangelogStore((s) => s.markSeen);

  // O destaque só é calculado após montar — o valor persistido vem do
  // localStorage, então lê-lo na renderização causaria divergência de hidratação.
  const [mounted, setMounted] = React.useState(false);
  const seenAtMount = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Captura a versão vista ANTES de marcar, para destacar as novidades da visita.
    seenAtMount.current = useChangelogStore.getState().lastSeenVersion;
    setMounted(true);
    markSeen(CURRENT_VERSION);
  }, [markSeen]);

  const cutoff = CHANGELOG.findIndex((e) => e.version === seenAtMount.current);
  const isNew = (index: number): boolean => {
    if (!mounted || seenAtMount.current == null) return false;
    if (cutoff === -1) return true; // versão vista não existe mais → tudo é novo
    return index < cutoff;
  };

  return (
    <ol className="relative space-y-8 border-l pl-6">
      {CHANGELOG.map((entry, i) => (
        <li key={entry.version} className="relative">
          <span className="absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full border bg-card">
            <span
              className={cn(
                "size-2 rounded-full",
                i === 0 ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{entry.title}</h2>
            <Badge variant="outline">v{entry.version}</Badge>
            {i === 0 && <Badge variant="secondary">Atual</Badge>}
            {isNew(i) && (
              <Badge variant="success" className="gap-1">
                <Sparkles /> Novo
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(entry.date)}</p>

          <ul className="mt-3 space-y-2">
            {entry.items.map((item, j) => {
              const meta = CHANGE_TYPE_META[item.type];
              return (
                <li key={j} className="flex items-start gap-2.5 text-sm">
                  <Badge variant={meta.tone} className="mt-0.5 shrink-0">
                    {meta.label}
                  </Badge>
                  <span className="leading-relaxed">{item.text}</span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
