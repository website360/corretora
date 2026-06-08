import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEmailFrom, getEmailReplyTo, getResendApiKey } from "@/config/env";
import {
  PLATFORM_SETTING_KEYS,
  SECRET_SETTING_KEYS,
  getStoredPlatformSettings,
  invalidatePlatformSettingsCache,
  type PlatformSettingKey,
} from "@/lib/platform-settings/server";

/** Valor de ambiente que serve de fallback para cada configuração. */
function envFallbacks(): Record<PlatformSettingKey, string> {
  return {
    resend_api_key: getResendApiKey(),
    email_from: getEmailFrom(),
    email_reply_to: getEmailReplyTo() ?? "",
    asaas_api_key: process.env.ASAAS_API_KEY ?? "",
    asaas_base_url: process.env.ASAAS_BASE_URL ?? "",
    asaas_webhook_token: process.env.ASAAS_WEBHOOK_TOKEN ?? "",
  };
}

function isSecret(key: PlatformSettingKey) {
  return SECRET_SETTING_KEYS.includes(key);
}

async function requireSuperAdmin() {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Não autenticado.", status: 401 as const };
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "super_admin") {
    return { error: "Apenas o administrador do SaaS.", status: 403 as const };
  }
  return { userId: user.id };
}

/**
 * GET /api/admin/settings — status de cada configuração do sistema.
 * Nunca devolve o valor de chaves secretas (apenas se está definido e a origem).
 */
export async function GET() {
  const guard = await requireSuperAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let stored: Record<string, string>;
  try {
    stored = await getStoredPlatformSettings();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  const fallbacks = envFallbacks();

  const settings = PLATFORM_SETTING_KEYS.map((key) => {
    const inDb = key in stored && stored[key] !== "";
    const effective = inDb ? stored[key] : fallbacks[key];
    const secret = isSecret(key);
    return {
      key,
      secret,
      source: inDb ? "db" : effective ? "env" : "none",
      isSet: Boolean(effective),
      // Só expõe o valor de chaves NÃO secretas (para pré-preencher o campo).
      value: secret ? undefined : effective,
    };
  });

  return NextResponse.json({ settings });
}

/**
 * PATCH /api/admin/settings — atualiza configurações do sistema.
 * Body: { patch: Record<chaveConhecida, string> }. Valor vazio remove o
 * override (volta a usar o env); valor preenchido faz upsert.
 */
export async function PATCH(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = (await req.json().catch(() => null)) as {
    patch?: Record<string, unknown>;
  } | null;
  if (!body?.patch || typeof body.patch !== "object") {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const toUpsert: { key: string; value: string; updated_at: string; updated_by: string }[] = [];
  const toDelete: string[] = [];

  for (const key of PLATFORM_SETTING_KEYS) {
    if (!(key in body.patch)) continue;
    const value = String(body.patch[key] ?? "").trim();
    if (value === "") toDelete.push(key);
    else toUpsert.push({ key, value, updated_at: now, updated_by: guard.userId });
  }

  if (toUpsert.length) {
    const { error } = await admin
      .from("platform_settings")
      .upsert(toUpsert, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (toDelete.length) {
    const { error } = await admin.from("platform_settings").delete().in("key", toDelete);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  invalidatePlatformSettingsCache();
  return NextResponse.json({ ok: true });
}
