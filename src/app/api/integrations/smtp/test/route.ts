import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSmtpConfigured, sendViaSmtp } from "@/lib/email/smtp";
import type { SmtpIntegration } from "@/types/domain";

/**
 * POST /api/integrations/smtp/test — envia um e-mail de teste pelo SMTP salvo
 * da empresa, para o e-mail do próprio usuário. Confirma host/porta/credenciais.
 */
export async function POST() {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: profile } = await sb
    .from("users")
    .select("company_id, role, email, name")
    .eq("id", user.id)
    .single();
  const p = profile as { company_id?: string; role?: string; email?: string; name?: string } | null;
  if (!p?.role || !["admin", "super_admin", "broker"].includes(p.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  if (!p.email) {
    return NextResponse.json({ ok: false, error: "Seu usuário não tem e-mail." }, { status: 200 });
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: company } = await admin
    .from("companies")
    .select("settings")
    .eq("id", p.company_id)
    .maybeSingle();
  const smtp = (company?.settings as { integrations?: { smtp?: SmtpIntegration } } | null)
    ?.integrations?.smtp;
  if (!isSmtpConfigured(smtp)) {
    return NextResponse.json(
      { ok: false, error: "Configure e salve o SMTP antes de testar." },
      { status: 200 },
    );
  }

  try {
    await sendViaSmtp(smtp, {
      to: p.email,
      subject: "Teste de SMTP — conexão OK",
      html: `<p>Olá, ${p.name ?? ""}!</p><p>Este é um e-mail de teste enviado pelo SMTP configurado na sua corretora. Se você recebeu, está tudo certo.</p>`,
    });
    return NextResponse.json({ ok: true, to: p.email }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 200 });
  }
}
