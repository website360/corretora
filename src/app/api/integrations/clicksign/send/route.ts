import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readClickSignConfig } from "@/lib/clicksign/finalize";
import { addSignerToDocument, createSigner, uploadDocument } from "@/lib/clicksign/server";

interface SignerInput {
  name: string;
  email: string;
  document?: string | null;
}

/**
 * POST /api/integrations/clicksign/send
 * Body: { quoteId, fileName, fileBase64, signers: [{name,email,document}] }
 * Uploads the PDF to ClickSign, registers the signers, links them, and marks
 * the quote as awaiting signature.
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
  if (!profile || !["admin", "super_admin", "broker"].includes((profile as { role: string }).role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const companyId = (profile as { company_id: string }).company_id;

  const body = (await req.json().catch(() => null)) as {
    quoteId?: string;
    fileName?: string;
    fileBase64?: string;
    signers?: SignerInput[];
  } | null;
  if (!body?.quoteId || !body.fileBase64 || !body.signers?.length) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const cfg = await readClickSignConfig(admin, companyId);
  if (!cfg) {
    return NextResponse.json(
      { error: "ClickSign não configurado. Adicione o token em Configurações → Integrações." },
      { status: 503 },
    );
  }

  // Ensure the quote belongs to the company.
  const { data: quote } = await admin
    .from("quotes")
    .select("id, company_id")
    .eq("id", body.quoteId)
    .eq("company_id", companyId)
    .single();
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

  try {
    const doc = await uploadDocument(cfg, {
      name: body.fileName || "proposta.pdf",
      contentBase64: body.fileBase64,
    });
    for (const s of body.signers) {
      if (!s.email) continue;
      const signerKey = await createSigner(cfg, {
        name: s.name,
        email: s.email,
        documentation: s.document ?? null,
      });
      await addSignerToDocument(cfg, {
        documentKey: doc.key,
        signerKey,
        signAs: "party",
        message: "Por favor, assine o documento.",
      });
    }
    await admin
      .from("quotes")
      .update({ clicksign_key: doc.key, status: "awaiting_signature" })
      .eq("id", body.quoteId);
    return NextResponse.json({ ok: true, documentKey: doc.key });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
