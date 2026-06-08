import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Company, Customer } from "@/types/domain";

/** Cliente do portal logado (ou null) — sem redirect. Para uso em APIs. */
export async function getPortalAuthCustomer(): Promise<Customer | null> {
  const sb = await getSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || user.app_metadata?.user_type !== "customer") return null;

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("customers")
    .select("*")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .single();
  const customer = (data as Customer | null) ?? null;
  if (!customer || customer.portal_enabled === false) return null;
  return customer;
}

/** Para páginas do portal: redireciona ao login se não for um cliente válido. */
export async function getPortalCustomer(): Promise<{
  customer: Customer;
  company: Company;
}> {
  const customer = await getPortalAuthCustomer();
  if (!customer) redirect("/portal/login");

  const admin = getSupabaseAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("*")
    .eq("id", customer.company_id)
    .single();
  return { customer, company: company as Company };
}
