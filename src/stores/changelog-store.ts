import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Guarda a última versão do changelog que o usuário já visualizou, para
 * destacar as novidades ainda não vistas (na página e no indicador de Ajuda).
 */
interface ChangelogState {
  lastSeenVersion: string | null;
  markSeen: (version: string) => void;
}

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
      lastSeenVersion: null,
      markSeen: (version) => set({ lastSeenVersion: version }),
    }),
    { name: "changelog-seen-v1" },
  ),
);
