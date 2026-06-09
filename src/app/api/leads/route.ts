import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Ingestão pública de leads (site / WordPress). O plugin envia o header
 * `X-API-Key` (chave por empresa, em companies.settings.integrations.wordpress)
 * e um JSON { name, email, phone, source, notes, metadata }. Cria um lead
 * (customers.kind = 'lead') na empresa dona da chave. Responde 201 no sucesso.
 */
export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Chave de API ausente" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || !email) {
    return NextResponse.json({ error: "Nome e email são obrigatórios" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Identifica a empresa pela chave (bypass RLS).
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("settings->integrations->wordpress->>api_key", apiKey)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "Chave de API inválida" }, { status: 401 });
  }

  // Evita duplicar quando o formulário é reenviado: se já há um contato com o
  // mesmo e-mail nesta empresa, trata como sucesso sem criar outro.
  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("company_id", company.id)
    .eq("email", email)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 201 });
  }

  const source = String(body.source ?? "").trim() || "site";
  const phone = String(body.phone ?? "").trim();
  const baseNotes = String(body.notes ?? "").trim();
  const meta =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : null;
  const metaLines = meta
    ? Object.entries(meta).map(
        ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`,
      )
    : [];
  const notes = [`Origem: ${source}`, baseNotes, ...metaLines].filter(Boolean).join("\n");

  const { error } = await admin.from("customers").insert({
    company_id: company.id,
    kind: "lead",
    person_type: "individual",
    name,
    document: "",
    email,
    phone: phone || null,
    notes: notes || null,
    tags: ["site"],
    status: "active",
  });

  if (error) {
    return NextResponse.json({ error: "Falha ao salvar o lead" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
