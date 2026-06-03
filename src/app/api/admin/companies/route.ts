import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/companies — super_admin only.
 * Body: { id, action: "activate" | "deactivate" | "delete" }
 * "delete" hard-deletes the company (cascading all tenant rows) and its auth users.
 */
export async function POST(req: NextRequest) {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: profile } = await sb
    .from("users")
    .select("role, company_id")
    .eq("id", user.id)
    .single();
  const me = profile as { role?: string; company_id?: string } | null;
  if (me?.role !== "super_admin") {
    return NextResponse.json({ error: "Apenas o administrador do SaaS." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    action?: "activate" | "deactivate" | "delete" | "remove_card";
  } | null;
  if (!body?.id || !body.action) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  if (body.action === "activate" || body.action === "deactivate") {
    const status = body.action === "activate" ? "active" : "inactive";
    const { error } = await admin.from("companies").update({ status }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove_card") {
    await admin.from("payment_methods").delete().eq("company_id", body.id);
    const { error } = await admin
      .from("companies")
      .update({ card_last4: null, card_brand: null })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // delete
  if (body.id === me?.company_id) {
    return NextResponse.json({ error: "Você não pode excluir a própria empresa." }, { status: 400 });
  }
  // Collect the company's auth users before the cascade removes public.users.
  const { data: us } = await admin.from("users").select("id").eq("company_id", body.id);
  const userIds = ((us as { id: string }[] | null) ?? []).map((u) => u.id);

  const { error } = await admin.from("companies").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Remove the auth accounts too (not covered by the public-schema cascade).
  for (const uid of userIds) {
    await admin.auth.admin.deleteUser(uid).catch(() => {});
  }
  return NextResponse.json({ ok: true, removedUsers: userIds.length });
}
