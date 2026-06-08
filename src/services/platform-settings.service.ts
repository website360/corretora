/** Configurações globais do sistema (Resend, Asaas) — super_admin only. */

export type PlatformSettingKey =
  | "resend_api_key"
  | "email_from"
  | "email_reply_to"
  | "asaas_api_key"
  | "asaas_base_url"
  | "asaas_webhook_token";

export interface PlatformSettingStatus {
  key: PlatformSettingKey;
  /** True quando o valor não deve ser exibido (campo secreto). */
  secret: boolean;
  /** Origem do valor efetivo. */
  source: "db" | "env" | "none";
  /** Há um valor efetivo configurado? */
  isSet: boolean;
  /** Valor atual — presente apenas para chaves não-secretas. */
  value?: string;
}

export const platformSettingsService = {
  /** Status de cada configuração (sem expor segredos). */
  async get(): Promise<PlatformSettingStatus[]> {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Falha ao carregar as configurações.");
    return (json.settings as PlatformSettingStatus[]) ?? [];
  },

  /**
   * Atualiza as configurações. Inclua apenas as chaves alteradas: valor vazio
   * remove o override (volta ao .env); valor preenchido grava no banco.
   */
  async update(patch: Partial<Record<PlatformSettingKey, string>>): Promise<void> {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Falha ao salvar as configurações.");
  },
};
