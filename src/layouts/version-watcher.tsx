"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Detecta quando há uma nova versão no ar (o build id do servidor mudou em
 * relação ao que o cliente carregou) e oferece um botão para atualizar — sem
 * o usuário precisar apertar F5 nem ficar na dúvida se está na última versão.
 */
export function VersionWatcher() {
  const initial = React.useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (!alive || !data.version) return;
        if (initial.current == null) initial.current = data.version;
        else if (data.version !== initial.current) setUpdateAvailable(true);
      } catch {
        /* offline/transient — tenta de novo no próximo ciclo */
      }
    }
    check();
    const id = setInterval(check, 90_000); // a cada 1,5 min
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 px-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/30 bg-card px-4 py-2.5 shadow-lg">
        <Sparkles className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-medium">Nova versão disponível.</span>
        <Link
          href="/ajuda/novidades"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Ver o que mudou
        </Link>
        <Button size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" /> Atualizar agora
        </Button>
      </div>
    </div>
  );
}

/** Botão manual de atualizar (recarrega para garantir a última versão). */
export function UpdateButton() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title="Atualizar sistema (buscar a última versão)"
      onClick={() => window.location.reload()}
    >
      <RefreshCw className="size-4" />
    </Button>
  );
}
