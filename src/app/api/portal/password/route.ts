import { NextResponse } from "next/server";
import { getPortalAuthCustomer } from "@/services/portal-session.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/portal/password — limpa a flag de "trocar no primeiro acesso"
 * depois que o cliente define a nova senha (a troca em si é feita no client
 * via supabase.auth.updateUser).
 */
export async function POST() {
  const customer = await getPortalAuthCustomer();
  if (!customer) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const rl = rateLimit(`portal-pass:${customer.id}`, 10, 600_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("customers")
    .update({ portal_must_change_password: false })
    .eq("id", customer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
