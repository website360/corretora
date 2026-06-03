import { companiesService } from "@/services/companies.service";
import type { Company, Plan } from "@/types/domain";

/** Whole days remaining in the trial (0 when expired). */
export function trialDaysLeft(company: Pick<Company, "trial_ends_at">): number {
  const ms = new Date(company.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function isTrialing(company: Pick<Company, "subscription_status">): boolean {
  return company.subscription_status === "trialing";
}

export function isTrialExpired(
  company: Pick<Company, "subscription_status" | "trial_ends_at">,
): boolean {
  return isTrialing(company) && trialDaysLeft(company) <= 0;
}

/** Resolves the company's active plan from the catalog (null when none chosen). */
export function planFor(company: Pick<Company, "plan_id">, plans: Plan[]): Plan | null {
  return plans.find((p) => p.id === company.plan_id) ?? null;
}

export interface PlanLimits {
  maxUsers: number | null;
  maxContacts: number | null;
}

/** Effective limits for a company; falls back to Professional during an
 *  unconfigured trial so the app stays usable until a plan is picked. */
export function effectiveLimits(company: Pick<Company, "plan_id">, plans: Plan[]): PlanLimits {
  const plan = planFor(company, plans) ?? plans.find((p) => p.code === "professional") ?? null;
  return { maxUsers: plan?.max_users ?? null, maxContacts: plan?.max_contacts ?? null };
}

/** True when a new record can be created given the limit (null = unlimited). */
export function withinLimit(used: number, limit: number | null): boolean {
  return limit == null || used < limit;
}

export const billingService = {
  /** Sets the company's chosen plan (keeps it in trial until charged). */
  async selectPlan(companyId: string, planId: string): Promise<void> {
    await companiesService.update(companyId, { plan_id: planId });
  },
};
