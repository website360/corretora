import { NextResponse } from "next/server";
import { getPortalAuthCustomer } from "@/services/portal-session.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/portal/claims — o cliente logado solicita a abertura de um sinistro.
 * O company_id/customer_id são resolvidos no servidor a partir do cliente
 * autenticado; o insert usa o admin client (service role) e o sinistro entra
 * como status "requested" / source "portal".
 */
export async function POST(req: Request) {
  const customer = await getPortalAuthCustomer();
  if (!customer) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Descreva o sinistro." }, { status: 400 });

  const admin = getSupabaseAdminClient();

  // Se veio uma apólice, ela precisa ser do próprio cliente.
  let contractId: string | null = null;
  let productId: string | null = null;
  if (typeof body.contract_id === "string" && body.contract_id) {
    const { data: contract } = await admin
      .from("contracts")
      .select("id, customer_id, product_id")
      .eq("id", body.contract_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!contract || (contract as { customer_id: string }).customer_id !== customer.id) {
      return NextResponse.json({ error: "Apólice inválida." }, { status: 400 });
    }
    contractId = (contract as { id: string }).id;
    productId = (contract as { product_id: string | null }).product_id ?? null;
  }

  const occurredAt =
    typeof body.occurred_at === "string" && body.occurred_at ? body.occurred_at : null;
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  const { error } = await admin.from("claims").insert({
    company_id: customer.company_id,
    customer_id: customer.id,
    contract_id: contractId,
    product_id: productId,
    status: "requested",
    source: "portal",
    title,
    description,
    occurred_at: occurredAt,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
