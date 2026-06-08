import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Configurações globais da plataforma (Resend, Asaas) persistidas em
 * `platform_settings`. O valor no banco SOBRESCREVE a variável de ambiente
 * correspondente; o env continua como fallback. Leitura cacheada por instância
 * (TTL curto) para não bater no banco a cada envio de e-mail / chamada Asaas.
 *
 * Acessível apenas via service-role (a tabela tem RLS sem policies).
 */

export const PLATFORM_SETTING_KEYS = [
  "resend_api_key",
  "email_from",
  "email_reply_to",
  "asaas_api_key",
  "asaas_base_url",
  "asaas_webhook_token",
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

/** Chaves cujo valor nunca deve ser devolvido ao browser. */
export const SECRET_SETTING_KEYS: PlatformSettingKey[] = [
  "resend_api_key",
  "asaas_api_key",
  "asaas_webhook_token",
];

const TTL_MS = 30_000;
let cache: { at: number; values: Record<string, string> } | null = null;

async function loadAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values;
  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin.from("platform_settings").select("key, value");
    const values: Record<string, string> = {};
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      values[row.key] = row.value;
    }
    cache = { at: Date.now(), values };
    return values;
  } catch {
    // Sem service role / banco indisponível: cai pro cache antigo ou vazio
    // (os consumidores então usam o fallback de env).
    return cache?.values ?? {};
  }
}

/** Valor efetivo de uma configuração: banco → env fallback → "". */
export async function getPlatformSetting(
  key: PlatformSettingKey,
  envFallback?: string,
): Promise<string> {
  const values = await loadAll();
  return values[key] ?? envFallback ?? "";
}

/** Mapa cru (apenas valores do banco) — para a API admin montar o status. */
export async function getStoredPlatformSettings(): Promise<Record<string, string>> {
  return { ...(await loadAll()) };
}

/** Invalida o cache após uma escrita no admin. */
export function invalidatePlatformSettingsCache() {
  cache = null;
}
