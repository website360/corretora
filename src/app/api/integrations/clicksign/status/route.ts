import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { finalizeSignedQuote, readClickSignConfig } from "@/lib/clicksign/finalize";
import { getDocument, isSigned, signedUrl } from "@/lib/clicksign/server";
import type { Quote } from "@/types/domain";

/**
 * POST /api/integrations/clicksign/status  Body: { quoteId }
 * Manual sync: checks the document at ClickSign and, if signed, finalizes the
 * quote (contract + tasks). Useful in dev where webhooks can't reach localhost.
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
  if (!profile) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const companyId = (profile as { company_id: string }).company_id;

  const body = (await req.json().catch(() => null)) as { quoteId?: string } | null;
  if (!body?.quoteId) return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: quote } = await admin
    .from("quotes")
    .select("*")
    .eq("id", body.quoteId)
    .eq("company_id", companyId)
    .single();
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  const q = quote as Quote;
  if (!q.clicksign_key) {
    return NextResponse.json({ error: "Orçamento não foi enviado para assinatura." }, { status: 400 });
  }

  const cfg = await readClickSignConfig(admin, companyId);
  if (!cfg) return NextResponse.json({ error: "ClickSign não configurado." }, { status: 503 });

  try {
    const doc = await getDocument(cfg, q.clicksign_key);
    if (isSigned(doc)) {
      const contractId = await finalizeSignedQuote(admin, q, signedUrl(doc));
      return NextResponse.json({ ok: true, signed: true, contractId });
    }
    return NextResponse.json({ ok: true, signed: false, status: doc.status ?? "running" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
