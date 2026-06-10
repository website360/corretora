import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dispatchEvent } from "@/lib/email/dispatch.server";

const BASE_CORS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

/** Cabeçalhos CORS refletindo a origem da requisição (ou `*` se ausente). */
function corsFor(origin: string | null) {
  return { ...BASE_CORS, "Access-Control-Allow-Origin": origin || "*" };
}

function hostFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Normaliza uma entrada de domínio (aceita URL, www., barras) para o hostname. */
function normDomain(d: string): string | null {
  let s = d.trim().toLowerCase();
  if (!s) return null;
  try {
    if (s.includes("://")) s = new URL(s).hostname;
  } catch {
    /* mantém o texto */
  }
  s = s.replace(/^www\./, "").replace(/\/.*$/, "");
  return s || null;
}

function originAllowed(origin: string, allowed: string[]): boolean {
  const host = hostFromOrigin(origin);
  if (!host) return false;
  return allowed.some((a) => host === a || host.endsWith("." + a));
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsFor(request.headers.get("origin")) });
}

/**
 * Ingestão pública de leads (site / WordPress / script). O cliente envia o
 * header `X-API-Key` (chave por empresa) e um JSON { name, email, phone,
 * source, notes, metadata }. Cria um lead na empresa dona da chave, no kanban
 * escolhido. Chamadas do navegador são restritas aos domínios autorizados
 * (allowedDomains); o plugin server-side não envia Origin e não é afetado.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const cors = corsFor(origin);

  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Chave de API ausente" }, { status: 401, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: cors });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || !email) {
    return NextResponse.json(
      { error: "Nome e email são obrigatórios" },
      { status: 400, headers: cors },
    );
  }

  const admin = getSupabaseAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id, settings, trade_name, phone")
    .eq("settings->integrations->wordpress->>apiKey", apiKey)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "Chave de API inválida" }, { status: 401, headers: cors });
  }

  const settings = (company.settings ?? {}) as {
    integrations?: { wordpress?: { boardId?: string | null; allowedDomains?: string[] } };
  };
  const wp = settings.integrations?.wordpress;

  // Allowlist de domínios: só vale para chamadas do navegador (com Origin).
  const allowed = (wp?.allowedDomains ?? []).map(normDomain).filter(Boolean) as string[];
  if (allowed.length && origin && !originAllowed(origin, allowed)) {
    return NextResponse.json({ error: "Origem não autorizada" }, { status: 403, headers: cors });
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
    return NextResponse.json({ ok: true, duplicate: true }, { status: 201, headers: cors });
  }

  // Kanban de destino (opcional). Coloca o lead na 1ª coluna do board escolhido.
  const boardId = wp?.boardId ?? null;
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
    return NextResponse.json({ error: "Falha ao salvar o lead" }, { status: 500, headers: cors });
  }

  // Mensagens automáticas de boas-vindas (canais marcados como padrão).
  const comp = company as { id: string; trade_name?: string; phone?: string };
  dispatchEvent(
    comp.id,
    "lead_created",
    { email, phone: phone || null },
    {
      "cliente.nome": name,
      "cliente.primeiro_nome": name.trim().split(/\s+/)[0] ?? "",
      "cliente.email": email,
      "cliente.telefone": phone,
      "corretora.nome": comp.trade_name ?? "",
      "corretora.telefone": comp.phone ?? "",
    },
  ).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201, headers: cors });
}
