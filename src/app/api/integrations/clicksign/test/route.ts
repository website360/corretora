import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readClickSignConfig } from "@/lib/clicksign/finalize";
import { pingAccount } from "@/lib/clicksign/server";

/**
 * POST /api/integrations/clicksign/test
 * Valida token + ambiente com uma chamada autenticada leve (sem criar nada).
 * Isola o problema: se OK, o token/ambiente estão certos e qualquer erro no
 * envio (ex.: "e-mail do usuário da API") é configuração da conta ClickSign.
 */
export async function POST() {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: profile } = await sb
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["admin", "super_admin", "broker"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const companyId = (profile as { company_id: string }).company_id;

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const cfg = await readClickSignConfig(admin, companyId);
  if (!cfg) {
    return NextResponse.json({ ok: false, error: "ClickSign não configurado." }, { status: 200 });
  }

  try {
    await pingAccount(cfg);
    return NextResponse.json({ ok: true, environment: cfg.environment }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 200 });
  }
}
