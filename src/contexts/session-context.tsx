"use client";

import * as React from "react";
import { useSessionStore } from "@/stores/session-store";
import type { Role, SessionUser } from "@/types/domain";

interface SessionContextValue {
  user: SessionUser;
  /** RBAC helper — true when the current role is in the allowed list. */
  can: (roles: Role[]) => boolean;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  // Expose the ids to the client-side stores so service inserts can stamp
  // company_id / author_id under RLS.
  React.useEffect(() => {
    useSessionStore.getState().setSession(user.id, user.company_id, user.role);
  }, [user.id, user.company_id, user.role]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      user,
      can: (roles) => roles.length === 0 || roles.includes(user.role),
    }),
    [user],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession deve ser usado dentro de <SessionProvider>");
  return ctx;
}
