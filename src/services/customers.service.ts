import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { customerInteractions, customers } from "@/services/mock/data";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { Customer, CustomerInteraction } from "@/types/domain";

export const customersService = {
  async list(): Promise<Customer[]> {
    if (env.useMocks) {
      await sleep(280);
      const companyId = getCurrentCompanyId();
      return customers
        .filter((c) => c.company_id === companyId)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("customers")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as Customer[]) ?? [];
  },

  async get(id: string): Promise<Customer | null> {
    if (env.useMocks) {
      await sleep(200);
      return customers.find((c) => c.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("customers")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    return (data as Customer | null) ?? null;
  },

  async interactions(customerId: string): Promise<CustomerInteraction[]> {
    if (env.useMocks) {
      await sleep(220);
      return customerInteractions
        .filter((i) => i.customer_id === customerId)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("customer_interactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    return (data as CustomerInteraction[]) ?? [];
  },

  async create(input: Omit<Customer, "id" | "company_id" | "created_at">): Promise<Customer> {
    if (env.useMocks) {
      await sleep(400);
      const record: Customer = {
        ...input,
        id: uid("cu"),
        company_id: getCurrentCompanyId(),
        created_at: new Date().toISOString(),
      };
      customers.unshift(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("customers")
      .insert({ ...input, company_id: getCurrentCompanyId() })
      .select("*")
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, patch: Partial<Customer>): Promise<Customer> {
    if (env.useMocks) {
      await sleep(360);
      const idx = customers.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Cliente não encontrado");
      customers[idx] = { ...customers[idx]!, ...patch };
      return customers[idx]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("customers")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Customer;
  },

  /** Soft delete — moves the contact to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(300);
      const idx = customers.findIndex((c) => c.id === id);
      if (idx !== -1) customers.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
