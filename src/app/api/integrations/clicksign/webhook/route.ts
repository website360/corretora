import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { finalizeSignedQuote, readClickSignConfig, readWebhookSecret } from "@/lib/clicksign/finalize";
import { getDocument, isSigned, signedUrl, verifyWebhookHmac } from "@/lib/clicksign/server";
import type { Quote } from "@/types/domain";

/**
 * POST /api/integrations/clicksign/webhook
 * ClickSign calls this on signature events. We locate the quote by the document
 * key, verify the company's HMAC over the raw body, and finalize when signed.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let body: {
    event?: { name?: string; data?: { document?: { key?: string } } };
    document?: { key?: string };
  } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const key = body?.document?.key ?? body?.event?.data?.document?.key;
  if (!key) return NextResponse.json({ ok: true });

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Find the quote (and its company) by the ClickSign document key.
  const { data: quote } = await admin.from("quotes").select("*").eq("clicksign_key", key).maybeSingle();
  if (!quote) return NextResponse.json({ ok: true });
  const q = quote as Quote;

  // Verify the HMAC with this company's secret before trusting the payload.
  const secret = await readWebhookSecret(admin, q.company_id);
  if (!verifyWebhookHmac(secret ?? "", raw, req.headers.get("content-hmac"))) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  const eventName = body?.event?.name ?? "";
  if (!["sign", "auto_close", "close"].includes(eventName)) {
    return NextResponse.json({ ok: true }); // not a completion event
  }

  // Confirm with ClickSign that the document is actually closed/signed.
  const cfg = await readClickSignConfig(admin, q.company_id);
  if (!cfg) return NextResponse.json({ ok: true });
  try {
    const doc = await getDocument(cfg, key);
    if (isSigned(doc)) await finalizeSignedQuote(admin, q, signedUrl(doc));
  } catch {
    /* swallow — ClickSign retries on non-200, but our state is best-effort */
  }
  return NextResponse.json({ ok: true });
}
