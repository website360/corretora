import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { asaasConfigured, listPayments } from "@/lib/asaas/server";

/** GET /api/billing/summary — plan, subscription state and Asaas charges. */
export async function GET() {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: profile } = await sb
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Sem empresa." }, { status: 403 });
  const companyId = (profile as { company_id: string }).company_id;

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: company } = await admin
    .from("companies")
    .select(
      "plan_id, subscription_status, trial_ends_at, asaas_customer_id, asaas_subscription_id, card_last4, card_brand",
    )
    .eq("id", companyId)
    .single();
  if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  const c = company as {
    plan_id: string | null;
    subscription_status: string;
    trial_ends_at: string;
    asaas_customer_id: string | null;
    asaas_subscription_id: string | null;
    card_last4: string | null;
    card_brand: string | null;
  };

  let plan = null;
  if (c.plan_id) {
    const { data } = await admin
      .from("plans")
      .select("id, code, name, price_cents")
      .eq("id", c.plan_id)
      .single();
    plan = data ?? null;
  }

  let charges: unknown[] = [];
  if (asaasConfigured() && (c.asaas_subscription_id || c.asaas_customer_id)) {
    try {
      charges = await listPayments({
        subscriptionId: c.asaas_subscription_id,
        customerId: c.asaas_customer_id,
      });
    } catch {
      charges = [];
    }
  }

  return NextResponse.json({
    plan,
    status: c.subscription_status,
    trialEndsAt: c.trial_ends_at,
    card: c.card_last4 ? { last4: c.card_last4, brand: c.card_brand } : null,
    hasSubscription: Boolean(c.asaas_subscription_id),
    billingLive: asaasConfigured(),
    charges,
  });
}
