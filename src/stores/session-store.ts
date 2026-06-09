import { create } from "zustand";
import type { Role } from "@/types/domain";

/**
 * Holds the signed-in user/company ids for client-side reads (e.g. when a
 * service insert must stamp `company_id`/`author_id` under RLS). Populated by
 * SessionProvider once the session resolves.
 */
interface SessionStoreState {
  userId: string | null;
  companyId: string | null;
  role: Role | null;
  setSession: (userId: string, companyId: string, role: Role) => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  userId: null,
  companyId: null,
  role: null,
  setSession: (userId, companyId, role) => set({ userId, companyId, role }),
}));
