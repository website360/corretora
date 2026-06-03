import { create } from "zustand";

/**
 * Holds the signed-in user/company ids for client-side reads (e.g. when a
 * service insert must stamp `company_id`/`author_id` under RLS). Populated by
 * SessionProvider once the session resolves.
 */
interface SessionStoreState {
  userId: string | null;
  companyId: string | null;
  setSession: (userId: string, companyId: string) => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  userId: null,
  companyId: null,
  setSession: (userId, companyId) => set({ userId, companyId }),
}));
