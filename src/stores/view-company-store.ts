import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Filtro GLOBAL de empresa do Super Admin. `null` = "Todas as empresas".
 * Persistido para sobreviver ao reload (a troca do filtro recarrega a página,
 * pois as listas leem o escopo via `getViewCompanyId()`).
 */
interface ViewCompanyState {
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
}

export const useViewCompanyStore = create<ViewCompanyState>()(
  persist(
    (set) => ({
      companyId: null,
      setCompanyId: (id) => set({ companyId: id }),
    }),
    { name: "corretora:view-company" },
  ),
);
