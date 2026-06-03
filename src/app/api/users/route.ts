import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/users — creates a team member in the caller's company.
 *
 * Server-side only: validates the caller is an admin, then uses the
 * service-role admin API to create the auth user. The `handle_new_user`
 * trigger provisions the matching public.users row (company + role come
 * from user_metadata).
 */
export async function POST(req: NextRequest) {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await sb
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes((profile as { role: string }).role)) {
    return NextResponse.json(
      { error: "Apenas administradores podem adicionar usuários." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const { name, email, role, password } = body ?? {};
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: role ?? "broker",
      company_id: (profile as { company_id: string }).company_id,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data.user?.id });
}
