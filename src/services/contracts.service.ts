import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { Contract } from "@/types/domain";

const mockContracts: Contract[] = [];

export const contractsService = {
  async list(): Promise<Contract[]> {
    if (env.useMocks) {
      await sleep(220);
      return mockContracts.filter((c) => c.company_id === getCurrentCompanyId());
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("contracts")
      .select("*")
      .eq("company_id", getCurrentCompanyId())
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Contract[]) ?? [];
  },

  async get(id: string): Promise<Contract | null> {
    if (env.useMocks) {
      await sleep(140);
      return mockContracts.find((c) => c.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("contracts")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    return (data as Contract | null) ?? null;
  },

  async listByCustomer(customerId: string): Promise<Contract[]> {
    if (env.useMocks) {
      await sleep(180);
      return mockContracts.filter((c) => c.customer_id === customerId);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("contracts")
      .select("*")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Contract[]) ?? [];
  },

  async create(input: Omit<Contract, "id" | "company_id" | "created_at">): Promise<Contract> {
    if (env.useMocks) {
      await sleep(320);
      const record: Contract = {
        ...input,
        id: uid("ct"),
        company_id: getCurrentCompanyId(),
        created_at: new Date().toISOString(),
      };
      mockContracts.unshift(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("contracts")
      .insert({ ...input, company_id: getCurrentCompanyId() })
      .select("*")
      .single();
    if (error) throw error;
    return data as Contract;
  },

  async update(id: string, patch: Partial<Contract>): Promise<Contract> {
    if (env.useMocks) {
      await sleep(280);
      const idx = mockContracts.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Contrato não encontrado");
      mockContracts[idx] = { ...mockContracts[idx]!, ...patch };
      return mockContracts[idx]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("contracts")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Contract;
  },

  /** Soft delete — moves the contract to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(220);
      const idx = mockContracts.findIndex((c) => c.id === id);
      if (idx !== -1) mockContracts.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("contracts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
