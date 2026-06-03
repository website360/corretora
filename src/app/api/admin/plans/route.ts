import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** PATCH /api/admin/plans — super_admin only. Body: { id, patch }. */
export async function PATCH(req: NextRequest) {
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
    patch?: Record<string, unknown>;
  } | null;
  if (!body?.id || !body.patch) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  // Allow-list the editable columns.
  const allowed = ["name", "description", "price_cents", "max_users", "max_contacts", "highlight", "active", "modules"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body.patch) patch[k] = body.patch[k];

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  const { error } = await admin.from("plans").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
