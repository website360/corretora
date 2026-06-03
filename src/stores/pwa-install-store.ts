import { create } from "zustand";

/** The (non-standard) beforeinstallprompt event Chromium fires when installable. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaInstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  setDeferred: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (v: boolean) => void;
}

export const usePwaInstall = create<PwaInstallState>((set) => ({
  deferred: null,
  installed: false,
  setDeferred: (e) => set({ deferred: e }),
  setInstalled: (v) => set({ installed: v, deferred: null }),
}));
