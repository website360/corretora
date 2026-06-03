import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/billing/webhook — Asaas event receiver.
 *
 * Configure this URL in the Asaas dashboard and set ASAAS_WEBHOOK_TOKEN to the
 * same "access token" you register there. Updates the company's subscription
 * status based on payment events.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected && req.headers.get("asaas-access-token") !== expected) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    event?: string;
    payment?: { subscription?: string };
    subscription?: { id?: string };
  } | null;
  if (!body?.event) return NextResponse.json({ ok: true });

  const subscriptionId = body.payment?.subscription ?? body.subscription?.id;
  if (!subscriptionId) return NextResponse.json({ ok: true });

  const statusByEvent: Record<string, string> = {
    PAYMENT_CONFIRMED: "active",
    PAYMENT_RECEIVED: "active",
    PAYMENT_OVERDUE: "past_due",
    PAYMENT_REFUNDED: "canceled",
    SUBSCRIPTION_DELETED: "canceled",
  };
  const status = statusByEvent[body.event];
  if (!status) return NextResponse.json({ ok: true });

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  await admin
    .from("companies")
    .update({ subscription_status: status })
    .eq("asaas_subscription_id", subscriptionId);

  return NextResponse.json({ ok: true });
}
