import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dispatchEvent } from "@/lib/email/dispatch.server";
import type { EmailEvent } from "@/config/email-templates";

const EVENTS = ["lead_created", "quote_sent", "contract_created", "renewal_reminder"];

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(+dt) ? "" : dt.toLocaleDateString("pt-BR");
}
function fmtBRL(cents?: number | null) {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * POST /api/messages/dispatch — dispara as mensagens automáticas (canais que o
 * admin marcou como padrão) de um evento, montando as variáveis do contexto.
 * Body: { event, customerId, contractId?, quoteId? }.
 */
export async function POST(req: Request) {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: profile } = await sb.from("users").select("company_id, role").eq("id", user.id).single();
  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["admin", "super_admin", "broker"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const companyId = (profile as { company_id: string }).company_id;

  const body = (await req.json().catch(() => null)) as {
    event?: string;
    customerId?: string;
    contractId?: string;
    quoteId?: string;
  } | null;
  if (!body?.event || !EVENTS.includes(body.event) || !body.customerId) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  const event = body.event as EmailEvent;

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: customer } = await admin
    .from("customers")
    .select("id, company_id, name, email, phone")
    .eq("id", body.customerId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const { data: company } = await admin
    .from("companies")
    .select("trade_name, phone")
    .eq("id", companyId)
    .maybeSingle();

  const firstName = (customer.name ?? "").trim().split(/\s+/)[0] ?? "";
  const vars: Record<string, string | undefined> = {
    "cliente.nome": customer.name ?? "",
    "cliente.primeiro_nome": firstName,
    "cliente.email": customer.email ?? "",
    "cliente.telefone": customer.phone ?? "",
    "corretora.nome": (company as { trade_name?: string } | null)?.trade_name ?? "",
    "corretora.telefone": (company as { phone?: string } | null)?.phone ?? "",
  };

  // Apólice/contrato
  if (body.contractId) {
    const { data: c } = await admin
      .from("contracts")
      .select("policy_number, starts_at, ends_at, premium_cents, product_id, carrier_id, owner_id")
      .eq("id", body.contractId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (c) {
      const [prod, carr, owner] = await Promise.all([
        c.product_id
          ? admin.from("products").select("name").eq("id", c.product_id).maybeSingle()
          : Promise.resolve({ data: null }),
        c.carrier_id
          ? admin.from("carriers").select("name").eq("id", c.carrier_id).maybeSingle()
          : Promise.resolve({ data: null }),
        c.owner_id
          ? admin.from("users").select("name").eq("id", c.owner_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      vars["apolice.numero"] = c.policy_number ?? "";
      vars["apolice.produto"] = (prod.data as { name?: string } | null)?.name ?? "";
      vars["apolice.seguradora"] = (carr.data as { name?: string } | null)?.name ?? "";
      vars["apolice.inicio"] = fmtDate(c.starts_at);
      vars["apolice.fim"] = fmtDate(c.ends_at);
      vars["apolice.premio"] = fmtBRL(c.premium_cents);
      vars["responsavel.nome"] = (owner.data as { name?: string } | null)?.name ?? "";
    }
  }

  // Orçamento
  if (body.quoteId) {
    const { data: q } = await admin
      .from("quotes")
      .select("title, owner_id")
      .eq("id", body.quoteId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (q) {
      vars["orcamento.produto"] = (q.title as string | null) ?? "";
      if (q.owner_id) {
        const { data: o } = await admin.from("users").select("name").eq("id", q.owner_id).maybeSingle();
        vars["responsavel.nome"] = (o as { name?: string } | null)?.name ?? "";
      }
    }
  }

  const result = await dispatchEvent(
    companyId,
    event,
    { email: customer.email, phone: customer.phone },
    vars,
  );
  return NextResponse.json({ ok: true, ...result });
}
