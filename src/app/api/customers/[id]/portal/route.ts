import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPortalInviteEmail } from "@/lib/email";
import { env } from "@/config/env";

/** Senha temporária forte (letras, números e símbolo). */
function generatePassword(): string {
  const sets = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnpqrstuvwxyz",
    "23456789",
    "!@#$%&*?",
  ];
  const all = sets.join("");
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  const pick = (s: string, b: number) => s[b % s.length];
  // Garante pelo menos um de cada conjunto.
  const required = sets.map((s, i) => pick(s, bytes[i]!));
  const rest = Array.from(bytes.slice(4)).map((b) => pick(all, b));
  return [...required, ...rest].join("");
}

async function brokerContext(req: NextRequest, customerId: string) {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };

  const { data: profile } = await sb
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "broker", "super_admin"].includes((profile as { role: string }).role)) {
    return { error: NextResponse.json({ error: "Sem permissão." }, { status: 403 }) };
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return { error: NextResponse.json({ error: (e as Error).message }, { status: 500 }) };
  }

  const { data: customer } = await admin
    .from("customers")
    .select("id, company_id, name, email, auth_user_id")
    .eq("id", customerId)
    .single();
  if (!customer || (customer as { company_id: string }).company_id !== (profile as { company_id: string }).company_id) {
    return { error: NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 }) };
  }

  return {
    admin,
    customer: customer as {
      id: string;
      company_id: string;
      name: string;
      email: string | null;
      auth_user_id: string | null;
    },
    actorEmail: user.email ?? undefined,
  };
}

/** POST — habilita o portal (ou gera nova senha) e devolve a senha gerada. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await brokerContext(req, id);
  if ("error" in ctx) return ctx.error;
  const { admin, customer, actorEmail } = ctx;

  if (!customer.email) {
    return NextResponse.json(
      { error: "Cadastre um e-mail no cliente antes de habilitar o portal." },
      { status: 400 },
    );
  }

  const password = generatePassword();

  try {
    if (customer.auth_user_id) {
      // Já existe: apenas redefine a senha e exige troca no próximo acesso.
      const { error } = await admin.auth.admin.updateUserById(customer.auth_user_id, { password });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: customer.email,
        password,
        email_confirm: true,
        app_metadata: { user_type: "customer" },
        user_metadata: {
          user_type: "customer",
          customer_id: customer.id,
          company_id: customer.company_id,
          name: customer.name,
        },
      });
      if (error) throw error;
      await admin
        .from("customers")
        .update({ auth_user_id: data.user?.id })
        .eq("id", customer.id);
    }

    await admin
      .from("customers")
      .update({ portal_enabled: true, portal_must_change_password: true })
      .eq("id", customer.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Convite por e-mail (best-effort): link para definir a senha no portal.
  try {
    const { data: company } = await admin
      .from("companies")
      .select("trade_name")
      .eq("id", customer.company_id)
      .single();
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: customer.email,
      options: { redirectTo: `${env.appUrl}/auth/callback?next=/portal/senha` },
    });
    await sendPortalInviteEmail({
      to: customer.email,
      name: customer.name,
      companyName: (company as { trade_name?: string } | null)?.trade_name,
      setPasswordUrl: link?.properties?.action_link ?? `${env.appUrl}/portal/login`,
      loginUrl: `${env.appUrl}/portal/login`,
    });
  } catch (e) {
    console.error("[portal] convite por e-mail falhou:", e);
  }

  return NextResponse.json({ ok: true, password, email: customer.email, replyTo: actorEmail });
}

/** DELETE — desabilita o portal e remove o acesso (apaga o auth user). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await brokerContext(req, id);
  if ("error" in ctx) return ctx.error;
  const { admin, customer } = ctx;

  try {
    if (customer.auth_user_id) {
      await admin.auth.admin.deleteUser(customer.auth_user_id).catch(() => {});
    }
    await admin
      .from("customers")
      .update({ portal_enabled: false, auth_user_id: null, portal_must_change_password: false })
      .eq("id", customer.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
