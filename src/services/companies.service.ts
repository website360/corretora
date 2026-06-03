import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { companies } from "@/services/mock/data";
import { sleep, uid } from "@/lib/utils";
import type { Company } from "@/types/domain";

export const companiesService = {
  async list(): Promise<Company[]> {
    if (env.useMocks) {
      await sleep(240);
      return [...companies].sort((a, b) => a.trade_name.localeCompare(b.trade_name));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("companies").select("*").order("trade_name");
    if (error) throw error;
    return (data as Company[]) ?? [];
  },

  async get(id: string): Promise<Company | null> {
    if (env.useMocks) {
      await sleep(160);
      return companies.find((c) => c.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb.from("companies").select("*").eq("id", id).maybeSingle();
    return (data as Company | null) ?? null;
  },

  async create(input: Omit<Company, "id" | "created_at">): Promise<Company> {
    if (env.useMocks) {
      await sleep(420);
      const record: Company = { ...input, id: uid("co"), created_at: new Date().toISOString() };
      companies.push(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("companies").insert(input).select("*").single();
    if (error) throw error;
    return data as Company;
  },

  async update(id: string, patch: Partial<Company>): Promise<Company> {
    if (env.useMocks) {
      await sleep(340);
      const idx = companies.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Empresa não encontrada");
      companies[idx] = { ...companies[idx]!, ...patch };
      return companies[idx]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("companies").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as Company;
  },
};
