"use client";

import * as React from "react";
import { usePwaInstall, type BeforeInstallPromptEvent } from "@/stores/pwa-install-store";

/** Registers the service worker and captures the install prompt (PWA). */
export function PwaRegister() {
  React.useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — registration is best-effort */
      });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it so our menu button can trigger it later
      usePwaInstall.getState().setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => usePwaInstall.getState().setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Already running as an installed app?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) usePwaInstall.getState().setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
