import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getNumber, getStatus, type EvolutionConfig } from "@/lib/whatsapp/evolution";

async function authCompany() {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  const { data: profile } = await sb
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes((profile as { role: string }).role)) {
    return { error: NextResponse.json({ error: "Apenas administradores." }, { status: 403 }) };
  }
  return { companyId: (profile as { company_id: string }).company_id };
}

export async function GET(_req: NextRequest) {
  const auth = await authCompany();
  if (auth.error) return auth.error;
  const companyId = auth.companyId!;
  const admin = getSupabaseAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("settings")
    .eq("id", companyId)
    .single();
  const settings = ((company as { settings?: any })?.settings ?? {}) as any;
  const whatsapp = settings.integrations?.whatsapp ?? {};
  const ev = whatsapp.evolution ?? {};

  if (whatsapp.provider !== "evolution" || !ev.baseUrl || !ev.apiKey || !ev.instance || !ev.token) {
    return NextResponse.json({ state: "close" });
  }

  const cfg: EvolutionConfig = {
    baseUrl: ev.baseUrl,
    globalApiKey: ev.apiKey,
    instance: ev.instance,
    token: ev.token,
  };

  try {
    const status = await getStatus(cfg);
    if (status.connected) {
      const number = await getNumber(cfg);
      const next = {
        ...settings,
        integrations: {
          ...(settings.integrations ?? {}),
          whatsapp: { ...whatsapp, status: "connected", connectedNumber: number },
        },
      };
      await admin.from("companies").update({ settings: next }).eq("id", companyId);
      return NextResponse.json({ state: "open", number });
    }
    return NextResponse.json({ state: status.exists ? "connecting" : "close" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, state: "close" }, { status: 502 });
  }
}
