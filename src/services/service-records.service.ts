import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getCurrentUserId, getViewCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { ServiceRecord } from "@/types/domain";

const mockRecords: ServiceRecord[] = [];

export const serviceRecordsService = {
  async list(): Promise<ServiceRecord[]> {
    if (env.useMocks) {
      await sleep(200);
      return mockRecords.filter((r) => r.company_id === getCurrentCompanyId());
    }
    const sb = getSupabaseBrowserClient();
    let query = sb.from("service_records").select("*");
    const cid = getViewCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ServiceRecord[]) ?? [];
  },

  async listByCustomer(customerId: string): Promise<ServiceRecord[]> {
    if (env.useMocks) {
      await sleep(160);
      return mockRecords.filter((r) => r.customer_id === customerId);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("service_records")
      .select("*")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ServiceRecord[]) ?? [];
  },

  async listByContract(contractId: string): Promise<ServiceRecord[]> {
    if (env.useMocks) {
      await sleep(160);
      return mockRecords.filter((r) => r.contract_id === contractId);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("service_records")
      .select("*")
      .eq("contract_id", contractId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ServiceRecord[]) ?? [];
  },

  async create(
    input: Omit<ServiceRecord, "id" | "company_id" | "author_id" | "created_at">,
  ): Promise<ServiceRecord> {
    if (env.useMocks) {
      await sleep(300);
      const record: ServiceRecord = {
        ...input,
        mentions: input.mentions ?? [],
        id: uid("sr"),
        company_id: getCurrentCompanyId(),
        author_id: getCurrentUserId(),
        created_at: new Date().toISOString(),
      };
      mockRecords.unshift(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("service_records")
      .insert({
        ...input,
        mentions: input.mentions ?? [],
        company_id: getCurrentCompanyId(),
        author_id: getCurrentUserId(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as ServiceRecord;
  },

  async update(id: string, patch: Partial<ServiceRecord>): Promise<ServiceRecord> {
    if (env.useMocks) {
      await sleep(260);
      const idx = mockRecords.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Atendimento não encontrado");
      mockRecords[idx] = { ...mockRecords[idx]!, ...patch };
      return mockRecords[idx]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("service_records")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as ServiceRecord;
  },

  /** Soft delete — moves the record to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(200);
      const idx = mockRecords.findIndex((r) => r.id === id);
      if (idx !== -1) mockRecords.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("service_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
