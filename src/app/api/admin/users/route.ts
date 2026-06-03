import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/users — super_admin only.
 * Body: { id, action: "activate" | "deactivate" | "delete" }
 * "delete" removes the auth account and the public.users profile.
 */
export async function POST(req: NextRequest) {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "super_admin") {
    return NextResponse.json({ error: "Apenas o administrador do SaaS." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    action?: "activate" | "deactivate" | "delete";
  } | null;
  if (!body?.id || !body.action) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  if (body.action === "delete" && body.id === user.id) {
    return NextResponse.json({ error: "Você não pode excluir o próprio usuário." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  if (body.action === "activate" || body.action === "deactivate") {
    const status = body.action === "activate" ? "active" : "inactive";
    const { error } = await admin.from("users").update({ status }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // delete — remove auth account, then ensure the profile row is gone.
  await admin.auth.admin.deleteUser(body.id).catch(() => {});
  const { error } = await admin.from("users").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
