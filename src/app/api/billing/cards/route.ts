import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  asaasConfigured,
  findOrCreateCustomer,
  tokenizeCard,
  type AsaasCard,
  type AsaasHolder,
} from "@/lib/asaas/server";
import { applyDefaultCard } from "@/lib/billing/server";

async function authCompany(req: NextRequest) {
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

export async function GET(req: NextRequest) {
  const auth = await authCompany(req);
  if (auth.error) return auth.error;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("payment_methods")
    .select("id, last4, brand, holder_name, is_default, created_at")
    .eq("company_id", auth.companyId!)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return NextResponse.json({ cards: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authCompany(req);
  if (auth.error) return auth.error;
  const companyId = auth.companyId!;

  if (!(await asaasConfigured())) {
    return NextResponse.json({ error: "Cobrança não configurada (Asaas)." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    card?: AsaasCard;
    holder?: AsaasHolder;
    makeDefault?: boolean;
  } | null;
  if (!body?.card || !body.holder) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("id, plan_id, trial_ends_at, asaas_customer_id, asaas_subscription_id")
    .eq("id", companyId)
    .single();
  if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  const co = company as {
    id: string;
    plan_id: string | null;
    trial_ends_at: string;
    asaas_customer_id: string | null;
    asaas_subscription_id: string | null;
  };

  const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  try {
    const customerId = await findOrCreateCustomer(co.asaas_customer_id, body.holder);
    if (!co.asaas_customer_id) {
      await admin.from("companies").update({ asaas_customer_id: customerId }).eq("id", companyId);
      co.asaas_customer_id = customerId;
    }

    const tk = await tokenizeCard({ customerId, card: body.card, holder: body.holder, remoteIp });

    const { count } = await admin
      .from("payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    const isFirst = (count ?? 0) === 0;
    const makeDefault = body.makeDefault || isFirst;

    const { data: inserted, error } = await admin
      .from("payment_methods")
      .insert({
        company_id: companyId,
        asaas_token: tk.token,
        last4: tk.last4,
        brand: tk.brand,
        holder_name: body.card.holderName,
        is_default: makeDefault,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (makeDefault) {
      await admin
        .from("payment_methods")
        .update({ is_default: false })
        .eq("company_id", companyId)
        .neq("id", (inserted as { id: string }).id);
      await applyDefaultCard(admin, co, tk, remoteIp);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
