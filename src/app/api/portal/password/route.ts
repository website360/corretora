import { NextResponse } from "next/server";
import { getPortalAuthCustomer } from "@/services/portal-session.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/portal/password — limpa a flag de "trocar no primeiro acesso"
 * depois que o cliente define a nova senha (a troca em si é feita no client
 * via supabase.auth.updateUser).
 */
export async function POST() {
  const customer = await getPortalAuthCustomer();
  if (!customer) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("customers")
    .update({ portal_must_change_password: false })
    .eq("id", customer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
