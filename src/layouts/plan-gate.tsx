"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/contexts/session-context";

/**
 * Onboarding funnel for a brand-new company:
 *   1. no plan yet      → /escolher-plano
 *   2. plan, not set up → /onboarding (finish profile + company data)
 * Once both are done the gate is transparent. Existing companies (and mock
 * mode) have `onboarding_completed` undefined and are never forced — only an
 * explicit `false`, written by the DB for new sign-ups, triggers step 2.
 */
export function PlanGate() {
  const { user } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    // The SaaS owner (super_admin) manages the platform — never gated.
    if (user.role === "super_admin") return;

    // Step 1 — must pick a plan before anything else.
    if (!user.company.plan_id) {
      if (pathname !== "/escolher-plano") router.replace("/escolher-plano");
      return;
    }

    // Step 2 — plan chosen, but the initial cadastro isn't finished yet.
    if (user.company.onboarding_completed === false && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [
    user.role,
    user.company.plan_id,
    user.company.onboarding_completed,
    pathname,
    router,
  ]);

  return null;
}
