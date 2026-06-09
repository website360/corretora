"use client";

import * as React from "react";
import { useSession } from "@/contexts/session-context";
import { usersService } from "@/services/users.service";

/**
 * Marca o usuário atual como "visto agora" (users.last_seen_at) ao abrir o app,
 * periodicamente e ao voltar o foco — alimentando o indicador de equipe online.
 * Não renderiza nada.
 */
export function PresenceHeartbeat() {
  const { user } = useSession();

  React.useEffect(() => {
    if (!user?.id) return;
    let active = true;

    const beat = () => {
      if (!active || (typeof document !== "undefined" && document.visibilityState === "hidden")) {
        return;
      }
      usersService.update(user.id, { last_seen_at: new Date().toISOString() }).catch(() => {});
    };

    beat();
    const interval = setInterval(beat, 60_000);
    const onVisible = () => document.visibilityState === "visible" && beat();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", beat);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", beat);
    };
  }, [user?.id]);

  return null;
}
