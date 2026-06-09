import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Permite chamadas do navegador (script genérico em qualquer site).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Ingestão pública de leads (site / WordPress / script). O cliente envia o
 * header `X-API-Key` (chave por empresa, em companies.settings.integrations.
 * wordpress) e um JSON { name, email, phone, source, notes, metadata }. Cria um
 * lead (customers.kind = 'lead') na empresa dona da chave, no kanban escolhido
 * (settings.integrations.wordpress.boardId). Responde 201 no sucesso.
 */
export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Chave de API ausente" }, { status: 401, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: CORS });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || !email) {
    return NextResponse.json(
      { error: "Nome e email são obrigatórios" },
      { status: 400, headers: CORS },
    );
  }

  const admin = getSupabaseAdminClient();

  // Identifica a empresa pela chave (bypass RLS) e lê o kanban de destino.
  const { data: company } = await admin
    .from("companies")
    .select("id, settings")
    .eq("settings->integrations->wordpress->>apiKey", apiKey)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "Chave de API inválida" }, { status: 401, headers: CORS });
  }

  // Evita duplicar quando o formulário é reenviado.
  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("company_id", company.id)
    .eq("email", email)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 201, headers: CORS });
  }

  // Kanban de destino (opcional). Coloca o lead na 1ª coluna do board escolhido.
  const settings = (company.settings ?? {}) as {
    integrations?: { wordpress?: { boardId?: string | null } };
  };
  const boardId = settings.integrations?.wordpress?.boardId ?? null;
  let columnId: string | null = null;
  if (boardId) {
    const { data: col } = await admin
      .from("kanban_columns")
      .select("id")
      .eq("board_id", boardId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    columnId = (col?.id as string | undefined) ?? null;
  }

  const source = String(body.source ?? "").trim() || "site";
  const phone = String(body.phone ?? "").trim();
  const baseNotes = String(body.notes ?? "").trim();
  const meta =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : null;
  const metaLines = meta
    ? Object.entries(meta).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
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
    board_id: boardId,
    column_id: columnId,
  });

  if (error) {
    return NextResponse.json({ error: "Falha ao salvar o lead" }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ ok: true }, { status: 201, headers: CORS });
}
