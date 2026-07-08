import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Claim, Contract, ContractAttachment } from "@/types/domain";

/** Sinistros de um cliente (para o portal), via admin. */
export async function getPortalClaims(customerId: string): Promise<Claim[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("claims")
    .select("*")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data as Claim[]) ?? [];
}

/** Dados do portal de um cliente (contratos + nomes + anexos), via admin. */
export async function getPortalData(customerId: string) {
  const admin = getSupabaseAdminClient();

  const { data: contractsData } = await admin
    .from("contracts")
    .select("*")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const contracts = (contractsData as Contract[]) ?? [];

  const productIds = [...new Set(contracts.map((c) => c.product_id).filter(Boolean))] as string[];
  const carrierIds = [...new Set(contracts.map((c) => c.carrier_id).filter(Boolean))] as string[];
  const contractIds = contracts.map((c) => c.id);

  const [prodRes, carrRes, attRes] = await Promise.all([
    productIds.length
      ? admin.from("insurance_products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    carrierIds.length
      ? admin.from("insurance_carriers").select("id, name").in("id", carrierIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    contractIds.length
      ? admin.from("contract_attachments").select("*").in("contract_id", contractIds)
      : Promise.resolve({ data: [] as ContractAttachment[] }),
  ]);

  const productById = new Map(
    ((prodRes.data as { id: string; name: string }[]) ?? []).map((p) => [p.id, p.name]),
  );
  const carrierById = new Map(
    ((carrRes.data as { id: string; name: string }[]) ?? []).map((c) => [c.id, c.name]),
  );
  const attByContract = new Map<string, ContractAttachment[]>();
  for (const a of (attRes.data as ContractAttachment[]) ?? []) {
    const arr = attByContract.get(a.contract_id) ?? [];
    arr.push(a);
    attByContract.set(a.contract_id, arr);
  }

  return { contracts, productById, carrierById, attByContract };
}
