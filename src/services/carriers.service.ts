import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getViewCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { Carrier } from "@/types/domain";

const mockCarriers: Carrier[] = [];

export const carriersService = {
  async list(): Promise<Carrier[]> {
    if (env.useMocks) {
      await sleep(200);
      return mockCarriers.filter((c) => c.company_id === getCurrentCompanyId());
    }
    const sb = getSupabaseBrowserClient();
    let query = sb.from("insurance_carriers").select("*");
    const cid = getViewCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query.is("deleted_at", null).order("name");
    if (error) throw error;
    return (data as Carrier[]) ?? [];
  },

  async get(id: string): Promise<Carrier | null> {
    if (env.useMocks) {
      await sleep(120);
      return mockCarriers.find((c) => c.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("insurance_carriers")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    return (data as Carrier | null) ?? null;
  },

  async create(input: Omit<Carrier, "id" | "company_id" | "created_at">): Promise<Carrier> {
    if (env.useMocks) {
      await sleep(300);
      const record: Carrier = {
        ...input,
        id: uid("cr"),
        company_id: getCurrentCompanyId(),
        created_at: new Date().toISOString(),
      };
      mockCarriers.unshift(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("insurance_carriers")
      .insert({ ...input, company_id: getCurrentCompanyId() })
      .select("*")
      .single();
    if (error) throw error;
    return data as Carrier;
  },

  async update(id: string, patch: Partial<Carrier>): Promise<Carrier> {
    if (env.useMocks) {
      await sleep(260);
      const idx = mockCarriers.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Seguradora não encontrada");
      mockCarriers[idx] = { ...mockCarriers[idx]!, ...patch };
      return mockCarriers[idx]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("insurance_carriers")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Carrier;
  },

  /** Soft delete — moves the carrier to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(220);
      const idx = mockCarriers.findIndex((c) => c.id === id);
      if (idx !== -1) mockCarriers.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("insurance_carriers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
