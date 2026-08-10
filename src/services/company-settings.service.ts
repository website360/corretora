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

  /**
   * A gravação passa pelo servidor (`POST /api/settings`), não mais direto pelo
   * Supabase. Motivo: o cliente recebe os segredos de integração mascarados, e
   * só o servidor sabe restaurá-los — gravar daqui apagaria as credenciais das
   * integrações que não estavam sendo editadas. As permissões não mudaram: a
   * rota grava com o cliente do próprio usuário, sob as mesmas policies de RLS.
   */
  async update(companyId: string, patch: Partial<CompanySettings>): Promise<void> {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, patch }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(json.error || "Não foi possível salvar as configurações.");
    }
  },
};
