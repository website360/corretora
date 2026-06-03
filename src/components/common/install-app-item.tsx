"use client";

import * as React from "react";
import { MonitorDown } from "lucide-react";
import { toast } from "sonner";
import { usePwaInstall } from "@/stores/pwa-install-store";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/** "Instalar app" entry for the user menu — triggers the PWA install prompt. */
export function InstallAppItem() {
  const deferred = usePwaInstall((s) => s.deferred);
  const installed = usePwaInstall((s) => s.installed);

  if (installed) return null;

  async function install(e: Event | React.SyntheticEvent) {
    // Keep the dropdown from stealing focus before the native prompt opens.
    e.preventDefault();
    const evt = usePwaInstall.getState().deferred;
    if (evt) {
      await evt.prompt();
      const choice = await evt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") usePwaInstall.getState().setInstalled(true);
      else usePwaInstall.getState().setDeferred(null);
      return;
    }
    // No native prompt available (already-eligible elsewhere, iOS, etc.).
    toast.info(
      "No Chrome/Edge, clique no ícone de instalar na barra de endereço. No iPhone (Safari): Compartilhar → Adicionar à Tela de Início.",
    );
  }

  return (
    <DropdownMenuItem onSelect={(e) => install(e)}>
      <MonitorDown /> Instalar app{deferred ? "" : "…"}
    </DropdownMenuItem>
  );
}
