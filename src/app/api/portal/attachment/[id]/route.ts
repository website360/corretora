import { NextResponse, type NextRequest } from "next/server";
import { getPortalAuthCustomer } from "@/services/portal-session.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/portal/attachment/<id> — download seguro de um anexo de contrato
 * para o cliente logado. Confere que o anexo pertence a um contrato do próprio
 * cliente e redireciona para uma signed URL temporária.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getPortalAuthCustomer();
  if (!customer) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data: att } = await admin
    .from("contract_attachments")
    .select("id, storage_path, contract_id")
    .eq("id", id)
    .single();
  if (!att) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { data: contract } = await admin
    .from("contracts")
    .select("customer_id")
    .eq("id", (att as { contract_id: string }).contract_id)
    .single();
  if (!contract || (contract as { customer_id: string }).customer_id !== customer.id) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { data: signed, error } = await admin.storage
    .from("contract-files")
    .createSignedUrl((att as { storage_path: string }).storage_path, 60 * 60);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Falha ao gerar o link." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
