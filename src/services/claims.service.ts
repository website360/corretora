import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getCurrentUserId, getViewCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { Claim, ClaimStatus, ClaimUpdate } from "@/types/domain";

const mockClaims: Claim[] = [];
const mockUpdates: ClaimUpdate[] = [];

export type NewClaim = Pick<Claim, "customer_id" | "title"> &
  Partial<
    Pick<
      Claim,
      "contract_id" | "product_id" | "owner_id" | "status" | "description" | "occurred_at" | "amount_cents"
    >
  >;

export const claimsService = {
  async list(): Promise<Claim[]> {
    if (env.useMocks) {
      await sleep(200);
      return mockClaims.filter((c) => c.company_id === getCurrentCompanyId());
    }
    const sb = getSupabaseBrowserClient();
    let query = sb.from("claims").select("*");
    const cid = getViewCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Claim[]) ?? [];
  },

  async get(id: string): Promise<Claim | null> {
    if (env.useMocks) {
      await sleep(120);
      return mockClaims.find((c) => c.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("claims")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    return (data as Claim | null) ?? null;
  },

  async listByCustomer(customerId: string): Promise<Claim[]> {
    if (env.useMocks) {
      await sleep(160);
      return mockClaims
        .filter((c) => c.customer_id === customerId)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("claims")
      .select("*")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Claim[]) ?? [];
  },

  async listByContract(contractId: string): Promise<Claim[]> {
    if (env.useMocks) {
      await sleep(160);
      return mockClaims
        .filter((c) => c.contract_id === contractId)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("claims")
      .select("*")
      .eq("contract_id", contractId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Claim[]) ?? [];
  },

  async create(input: NewClaim): Promise<Claim> {
    const company_id = getCurrentCompanyId();
    const me = getCurrentUserId();
    if (env.useMocks) {
      await sleep(260);
      const record: Claim = {
        id: uid("cl"),
        company_id,
        number: Math.max(0, ...mockClaims.map((c) => c.number)) + 1,
        customer_id: input.customer_id,
        contract_id: input.contract_id ?? null,
        product_id: input.product_id ?? null,
        owner_id: input.owner_id ?? null,
        status: input.status ?? "analysis",
        title: input.title,
        description: input.description ?? null,
        occurred_at: input.occurred_at ?? null,
        amount_cents: input.amount_cents ?? null,
        source: "internal",
        created_by: me || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockClaims.unshift(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("claims")
      .insert({
        company_id,
        customer_id: input.customer_id,
        contract_id: input.contract_id ?? null,
        product_id: input.product_id ?? null,
        owner_id: input.owner_id ?? null,
        status: input.status ?? "analysis",
        title: input.title,
        description: input.description ?? null,
        occurred_at: input.occurred_at ?? null,
        amount_cents: input.amount_cents ?? null,
        source: "internal",
        created_by: me || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Claim;
  },

  async update(
    id: string,
    patch: Partial<
      Pick<
        Claim,
        | "contract_id"
        | "product_id"
        | "owner_id"
        | "status"
        | "title"
        | "description"
        | "occurred_at"
        | "amount_cents"
      >
    >,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(180);
      const c = mockClaims.find((x) => x.id === id);
      if (c) Object.assign(c, patch, { updated_at: new Date().toISOString() });
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("claims")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async setStatus(id: string, status: ClaimStatus): Promise<void> {
    return this.update(id, { status });
  },

  /* ─────────────────────────── acompanhamentos ─────────────────────────── */
  async updates(claimId: string): Promise<ClaimUpdate[]> {
    if (env.useMocks) {
      await sleep(120);
      return mockUpdates
        .filter((u) => u.claim_id === claimId)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("claim_updates")
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as ClaimUpdate[]) ?? [];
  },

  async addUpdate(claimId: string, note: string): Promise<ClaimUpdate> {
    const company_id = getCurrentCompanyId();
    const me = getCurrentUserId();
    if (env.useMocks) {
      await sleep(180);
      const record: ClaimUpdate = {
        id: uid("clu"),
        company_id,
        claim_id: claimId,
        author_id: me || null,
        note,
        created_at: new Date().toISOString(),
      };
      mockUpdates.push(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("claim_updates")
      .insert({ company_id, claim_id: claimId, author_id: me || null, note })
      .select("*")
      .single();
    if (error) throw error;
    // Toca o updated_at do sinistro para refletir a última movimentação.
    await sb.from("claims").update({ updated_at: new Date().toISOString() }).eq("id", claimId);
    return data as ClaimUpdate;
  },

  /** Soft delete — moves the claim to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(160);
      const i = mockClaims.findIndex((c) => c.id === id);
      if (i !== -1) mockClaims.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("claims")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
