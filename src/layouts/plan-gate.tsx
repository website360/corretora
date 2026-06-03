"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/contexts/session-context";

/**
 * Forces a brand-new company (no plan chosen yet) to the plan-selection step
 * right after sign-up. Once a plan is selected the gate is transparent.
 */
export function PlanGate() {
  const { user } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    // The SaaS owner (super_admin) manages the platform — never gated by a plan.
    if (user.role === "super_admin") return;
    if (!user.company.plan_id && pathname !== "/escolher-plano") {
      router.replace("/escolher-plano");
    }
  }, [user.role, user.company.plan_id, pathname, router]);

  return null;
}
