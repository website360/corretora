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
  // Sync the server session into the client store DURING render, before any
  // child renders or effects run. Service reads (e.g. getViewCompanyId) execute
  // inside child effects — which fire BEFORE this component's own effect — so
  // doing this in a useEffect would be too late: the first list fetch after each
  // load/reload would run with role=null, skip the company scope, and leak every
  // company's rows to the super admin. Guarded so it only writes when changed.
  if (typeof window !== "undefined") {
    const s = useSessionStore.getState();
    if (s.userId !== user.id || s.companyId !== user.company_id || s.role !== user.role) {
      s.setSession(user.id, user.company_id, user.role);
    }
  }

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
