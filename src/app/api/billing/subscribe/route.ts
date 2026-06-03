import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  asaasConfigured,
  createCardSubscription,
  findOrCreateCustomer,
  type AsaasCard,
  type AsaasHolder,
} from "@/lib/asaas/server";

/**
 * POST /api/billing/subscribe
 * Captures the credit card and creates an Asaas subscription whose first
 * charge is dated to the company's trial end (charged only after the trial).
 *
 * Body: { planId, card: {...}, holder: {...} }
 */
export async function POST(req: NextRequest) {
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
  if (!profile || !["admin", "super_admin"].includes((profile as { role: string }).role)) {
    return NextResponse.json(
      { error: "Apenas administradores podem gerenciar a assinatura." },
      { status: 403 },
    );
  }
  const companyId = (profile as { company_id: string }).company_id;

  const body = (await req.json().catch(() => null)) as {
    planId?: string;
    card?: AsaasCard;
    holder?: AsaasHolder;
  } | null;
  if (!body?.planId || !body.card || !body.holder) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: plan } = await admin
    .from("plans")
    .select("id, name, price_cents")
    .eq("id", body.planId)
    .single();
  if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });

  const { data: company } = await admin
    .from("companies")
    .select("id, trial_ends_at, asaas_customer_id")
    .eq("id", companyId)
    .single();
  if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

  // Without an Asaas key we can't charge — record the chosen plan so the
  // trial proceeds, and tell the client billing isn't live yet.
  if (!asaasConfigured()) {
    await admin.from("companies").update({ plan_id: plan.id }).eq("id", companyId);
    return NextResponse.json({ ok: true, live: false });
  }

  const c = company as { trial_ends_at: string; asaas_customer_id: string | null };
  const p = plan as { id: string; name: string; price_cents: number };
  const nextDueDate = new Date(c.trial_ends_at).toISOString().slice(0, 10);
  const remoteIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  try {
    const customerId = await findOrCreateCustomer(c.asaas_customer_id, body.holder);
    const sub = await createCardSubscription({
      customerId,
      valueCents: p.price_cents,
      nextDueDate,
      description: `Assinatura ${p.name}`,
      card: body.card,
      holder: body.holder,
      remoteIp,
    });

    const last4 = sub.creditCard?.creditCardNumber?.slice(-4) ?? body.card.number.replace(/\s/g, "").slice(-4);
    const brand = sub.creditCard?.creditCardBrand ?? null;
    await admin
      .from("companies")
      .update({
        plan_id: p.id,
        subscription_status: "trialing",
        asaas_customer_id: customerId,
        asaas_subscription_id: sub.id,
        card_last4: last4,
        card_brand: brand,
      })
      .eq("id", companyId);

    // Persist this first card as the company's default payment method so it
    // shows up (and stays default) in billing. Asaas returns a reusable token
    // on the subscription response. Only add it if we don't have one yet.
    const token = sub.creditCard?.creditCardToken;
    if (token) {
      const { count } = await admin
        .from("payment_methods")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      if ((count ?? 0) === 0) {
        await admin.from("payment_methods").insert({
          company_id: companyId,
          asaas_token: token,
          last4,
          brand,
          holder_name: body.card.holderName,
          is_default: true,
        });
      }
    }

    return NextResponse.json({ ok: true, live: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
