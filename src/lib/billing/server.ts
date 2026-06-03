import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSubscriptionWithToken,
  updateSubscriptionCard,
} from "@/lib/asaas/server";

interface CompanyBilling {
  id: string;
  plan_id: string | null;
  trial_ends_at: string;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
}

/**
 * Makes `token` the company's active card: stores last4/brand and points the
 * Asaas subscription at it (creating the subscription if none exists yet).
 */
export async function applyDefaultCard(
  admin: SupabaseClient,
  company: CompanyBilling,
  card: { token: string; last4: string | null; brand: string | null },
  remoteIp: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    card_last4: card.last4,
    card_brand: card.brand,
  };

  if (company.asaas_subscription_id) {
    await updateSubscriptionCard(company.asaas_subscription_id, card.token);
  } else if (company.plan_id && company.asaas_customer_id) {
    const { data: plan } = await admin
      .from("plans")
      .select("name, price_cents")
      .eq("id", company.plan_id)
      .single();
    if (plan) {
      const nextDueDate = new Date(company.trial_ends_at).toISOString().slice(0, 10);
      const sub = await createSubscriptionWithToken({
        customerId: company.asaas_customer_id,
        valueCents: (plan as { price_cents: number }).price_cents,
        nextDueDate,
        description: `Assinatura ${(plan as { name: string }).name}`,
        creditCardToken: card.token,
        remoteIp,
      });
      patch.asaas_subscription_id = sub.id;
      patch.subscription_status = "trialing";
    }
  }

  await admin.from("companies").update(patch).eq("id", company.id);
}
