import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyDefaultCard } from "@/lib/billing/server";

async function authCompany() {
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
  if (!profile || !["admin", "super_admin"].includes((profile as { role: string }).role)) {
    return { error: NextResponse.json({ error: "Apenas administradores." }, { status: 403 }) };
  }
  return { companyId: (profile as { company_id: string }).company_id };
}

/** PATCH — set this card as the default (used for charging). */
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authCompany();
  if (auth.error) return auth.error;
  const { id } = await params;
  const admin = getSupabaseAdminClient();

  const { data: card } = await admin
    .from("payment_methods")
    .select("id, asaas_token, last4, brand")
    .eq("id", id)
    .eq("company_id", auth.companyId!)
    .single();
  if (!card) return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });

  const { data: company } = await admin
    .from("companies")
    .select("id, plan_id, trial_ends_at, asaas_customer_id, asaas_subscription_id")
    .eq("id", auth.companyId!)
    .single();
  if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

  const cd = card as { id: string; asaas_token: string; last4: string | null; brand: string | null };
  try {
    await admin.from("payment_methods").update({ is_default: false }).eq("company_id", auth.companyId!);
    await admin.from("payment_methods").update({ is_default: true }).eq("id", cd.id);
    await applyDefaultCard(
      admin,
      company as Parameters<typeof applyDefaultCard>[1],
      { token: cd.asaas_token, last4: cd.last4, brand: cd.brand },
      "127.0.0.1",
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** DELETE — removes a card. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authCompany();
  if (auth.error) return auth.error;
  const { id } = await params;
  const admin = getSupabaseAdminClient();

  const { data: card } = await admin
    .from("payment_methods")
    .select("id, is_default")
    .eq("id", id)
    .eq("company_id", auth.companyId!)
    .single();
  if (!card) return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });

  await admin.from("payment_methods").delete().eq("id", id);

  // Promote another card to default if we removed the default.
  if ((card as { is_default: boolean }).is_default) {
    const { data: next } = await admin
      .from("payment_methods")
      .select("id, asaas_token, last4, brand")
      .eq("company_id", auth.companyId!)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next) {
      const { data: company } = await admin
        .from("companies")
        .select("id, plan_id, trial_ends_at, asaas_customer_id, asaas_subscription_id")
        .eq("id", auth.companyId!)
        .single();
      const n = next as { id: string; asaas_token: string; last4: string | null; brand: string | null };
      await admin.from("payment_methods").update({ is_default: true }).eq("id", n.id);
      try {
        if (company)
          await applyDefaultCard(
            admin,
            company as Parameters<typeof applyDefaultCard>[1],
            { token: n.asaas_token, last4: n.last4, brand: n.brand },
            "127.0.0.1",
          );
      } catch {
        /* mantém o default no banco mesmo se a sincronização falhar */
      }
    } else {
      await admin.from("companies").update({ card_last4: null, card_brand: null }).eq("id", auth.companyId!);
    }
  }

  return NextResponse.json({ ok: true });
}
