import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  connect,
  createInstance,
  getNumber,
  getQr,
  getStatus,
  ping,
  type EvolutionConfig,
} from "@/lib/whatsapp/evolution";

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

export async function POST(_req: NextRequest) {
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

  if (whatsapp.provider !== "evolution") {
    return NextResponse.json(
      { error: "Conexão automática disponível apenas para Evolution Go." },
      { status: 400 },
    );
  }
  const ev = whatsapp.evolution ?? {};
  if (!ev.baseUrl || !ev.apiKey || !ev.instance) {
    return NextResponse.json(
      { error: "Configuração incompleta. Informe URL, API Key global e nome da instância." },
      { status: 400 },
    );
  }

  // The per-instance token is generated once and persisted.
  let token: string = ev.token;
  if (!token) token = randomUUID().replace(/-/g, "");

  const cfg: EvolutionConfig = {
    baseUrl: ev.baseUrl,
    globalApiKey: ev.apiKey,
    instance: ev.instance,
    token,
  };

  async function persist(patch: Record<string, unknown>) {
    const next = {
      ...settings,
      integrations: {
        ...(settings.integrations ?? {}),
        whatsapp: {
          ...whatsapp,
          evolution: { ...ev, token },
          ...patch,
        },
      },
    };
    await admin.from("companies").update({ settings: next }).eq("id", companyId);
  }

  try {
    await ping(cfg.baseUrl);

    // Does the instance already exist (token recognised)?
    const status = await getStatus(cfg);
    if (status.exists && status.connected) {
      const number = await getNumber(cfg);
      await persist({ status: "connected", connectedNumber: number });
      return NextResponse.json({ connected: true, number });
    }
    if (!status.exists) {
      await createInstance(cfg); // ignores "already exists"
    }

    // Start the session, then fetch the QR.
    await connect(cfg);
    let qr = await getQr(cfg);
    // The QR may take a beat to appear right after connect.
    if (!qr?.base64) {
      await new Promise((r) => setTimeout(r, 1500));
      qr = await getQr(cfg);
    }

    await persist({ status: "disconnected", connectedNumber: null });

    if (!qr?.base64) {
      return NextResponse.json(
        { error: "O servidor ainda não gerou o QR Code. Tente novamente em alguns segundos." },
        { status: 502 },
      );
    }
    return NextResponse.json({ connected: false, qr: { base64: qr.base64, pairingCode: null } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
