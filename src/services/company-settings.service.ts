import { companiesService } from "@/services/companies.service";
import type { CompanySettings } from "@/types/domain";

/**
 * Company-wide preferences. Persisted on `companies.settings` (admin-only by
 * RLS) so they apply to every member of the company.
 *
 * The whole `settings` jsonb is replaced on write, so we read-merge-write to
 * avoid wiping sibling keys (e.g. saving integrations must not clear sort rules).
 */
export const companySettingsService = {
  /** Reads the company's current settings fresh from the DB. */
  async get(companyId: string): Promise<CompanySettings> {
    const company = await companiesService.get(companyId);
    return (company?.settings ?? {}) as CompanySettings;
  },

  async update(companyId: string, patch: Partial<CompanySettings>): Promise<void> {
    const company = await companiesService.get(companyId);
    const merged: CompanySettings = { ...(company?.settings ?? {}), ...patch };
    await companiesService.update(companyId, { settings: merged });
  },
};
