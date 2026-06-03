import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { Product } from "@/types/domain";

const mockProducts: Product[] = [];

export const productsService = {
  async list(): Promise<Product[]> {
    if (env.useMocks) {
      await sleep(200);
      return mockProducts.filter((p) => p.company_id === getCurrentCompanyId());
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("insurance_products")
      .select("*")
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    return (data as Product[]) ?? [];
  },

  async create(input: Omit<Product, "id" | "company_id" | "created_at">): Promise<Product> {
    if (env.useMocks) {
      await sleep(300);
      const record: Product = {
        ...input,
        id: uid("pr"),
        company_id: getCurrentCompanyId(),
        created_at: new Date().toISOString(),
      };
      mockProducts.unshift(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("insurance_products")
      .insert({ ...input, company_id: getCurrentCompanyId() })
      .select("*")
      .single();
    if (error) throw error;
    return data as Product;
  },

  async update(id: string, patch: Partial<Product>): Promise<Product> {
    if (env.useMocks) {
      await sleep(260);
      const idx = mockProducts.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Produto não encontrado");
      mockProducts[idx] = { ...mockProducts[idx]!, ...patch };
      return mockProducts[idx]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("insurance_products")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Product;
  },

  /** Soft delete — moves the product to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(220);
      const idx = mockProducts.findIndex((p) => p.id === id);
      if (idx !== -1) mockProducts.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("insurance_products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
