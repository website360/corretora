import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sleep, uid } from "@/lib/utils";
import type { DefaultCarrier, DefaultProduct } from "@/types/domain";

// Catálogo padrão do sistema (gerido pelo super admin). Global — sem company_id.
const mockCarriers: DefaultCarrier[] = [];
const mockProducts: DefaultProduct[] = [];

export const defaultCatalogService = {
  async listCarriers(): Promise<DefaultCarrier[]> {
    if (env.useMocks) {
      await sleep(150);
      return [...mockCarriers].sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("default_carriers")
      .select("*")
      .order("position")
      .order("name");
    if (error) throw error;
    return (data as DefaultCarrier[]) ?? [];
  },

  async createCarrier(input: {
    name: string;
    website?: string | null;
    logo_url?: string | null;
  }): Promise<DefaultCarrier> {
    if (env.useMocks) {
      await sleep(200);
      const rec: DefaultCarrier = {
        id: uid("dc"),
        name: input.name,
        website: input.website ?? null,
        logo_url: input.logo_url ?? null,
        position: mockCarriers.length,
        created_at: new Date().toISOString(),
      };
      mockCarriers.push(rec);
      return rec;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("default_carriers").insert(input).select("*").single();
    if (error) throw error;
    return data as DefaultCarrier;
  },

  async updateCarrier(
    id: string,
    patch: Partial<Pick<DefaultCarrier, "name" | "website" | "logo_url">>,
  ): Promise<DefaultCarrier> {
    if (env.useMocks) {
      await sleep(180);
      const i = mockCarriers.findIndex((c) => c.id === id);
      if (i === -1) throw new Error("Seguradora padrão não encontrada");
      mockCarriers[i] = { ...mockCarriers[i]!, ...patch };
      return mockCarriers[i]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("default_carriers")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DefaultCarrier;
  },

  async removeCarrier(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const i = mockCarriers.findIndex((c) => c.id === id);
      if (i !== -1) mockCarriers.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("default_carriers").delete().eq("id", id);
    if (error) throw error;
  },

  async listProducts(): Promise<DefaultProduct[]> {
    if (env.useMocks) {
      await sleep(150);
      return [...mockProducts].sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("default_products")
      .select("*")
      .order("position")
      .order("name");
    if (error) throw error;
    return (data as DefaultProduct[]) ?? [];
  },

  async createProduct(input: { name: string; category?: string }): Promise<DefaultProduct> {
    if (env.useMocks) {
      await sleep(200);
      const rec: DefaultProduct = {
        id: uid("dp"),
        name: input.name,
        category: input.category ?? "outros",
        position: mockProducts.length,
        created_at: new Date().toISOString(),
      };
      mockProducts.push(rec);
      return rec;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("default_products").insert(input).select("*").single();
    if (error) throw error;
    return data as DefaultProduct;
  },

  async updateProduct(
    id: string,
    patch: Partial<Pick<DefaultProduct, "name" | "category">>,
  ): Promise<DefaultProduct> {
    if (env.useMocks) {
      await sleep(180);
      const i = mockProducts.findIndex((p) => p.id === id);
      if (i === -1) throw new Error("Produto padrão não encontrado");
      mockProducts[i] = { ...mockProducts[i]!, ...patch };
      return mockProducts[i]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("default_products")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DefaultProduct;
  },

  async removeProduct(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const i = mockProducts.findIndex((p) => p.id === id);
      if (i !== -1) mockProducts.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("default_products").delete().eq("id", id);
    if (error) throw error;
  },
};
