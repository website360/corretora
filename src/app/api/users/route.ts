import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTeamInviteEmail } from "@/lib/email";
import { env } from "@/config/env";

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
    .select("company_id, role, name")
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
  // Só um super_admin pode criar outro super_admin.
  if (role === "super_admin" && (profile as { role: string }).role !== "super_admin") {
    return NextResponse.json(
      { error: "Apenas um super admin pode criar outro super admin." },
      { status: 403 },
    );
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

  const companyId = (profile as { company_id: string }).company_id;

  // Best-effort welcome e-mail: the member sets their own password via a
  // Supabase recovery link (we never e-mail the temporary password). Any
  // failure here must not fail the user creation.
  try {
    const redirectTo = `${env.appUrl}/auth/callback?next=/redefinir-senha`;
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    const setPasswordUrl = link?.properties?.action_link ?? `${env.appUrl}/recuperar-senha`;

    const { data: company } = await admin
      .from("companies")
      .select("trade_name")
      .eq("id", companyId)
      .single();

    // Convite de equipe é onboarding/sistema → Resend (não o SMTP da corretora,
    // que é reservado para e-mails aos CLIENTES dela).
    await sendTeamInviteEmail({
      to: email,
      name,
      inviterName: (profile as { name?: string }).name,
      companyName: (company as { trade_name?: string } | null)?.trade_name,
      setPasswordUrl,
      replyTo: user.email ?? undefined,
    });
  } catch (e) {
    console.error("[users] convite por e-mail falhou:", e);
  }

  return NextResponse.json({ ok: true, id: data.user?.id });
}
