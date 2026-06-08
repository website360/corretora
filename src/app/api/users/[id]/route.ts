import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/users/<id> — remove um membro da equipe (apaga o auth user, o que
 * remove em cascata a linha em public.users). Admin/super_admin da empresa.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: profile } = await sb
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const callerRole = (profile as { role?: string } | null)?.role;
  if (!profile || !["admin", "super_admin"].includes(callerRole ?? "")) {
    return NextResponse.json(
      { error: "Apenas administradores podem remover usuários." },
      { status: 403 },
    );
  }
  if (id === user.id) {
    return NextResponse.json({ error: "Você não pode remover a si mesmo." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: target } = await admin
    .from("users")
    .select("company_id, role, is_owner")
    .eq("id", id)
    .single();
  const t = target as { company_id: string; role: string; is_owner?: boolean } | null;
  if (!t || t.company_id !== (profile as { company_id: string }).company_id) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
  if (t.is_owner) {
    return NextResponse.json({ error: "O dono da conta não pode ser removido." }, { status: 400 });
  }
  // Só um super_admin pode remover outro super_admin.
  if (t.role === "super_admin" && callerRole !== "super_admin") {
    return NextResponse.json(
      { error: "Apenas um super admin pode remover outro super admin." },
      { status: 403 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
