import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";

/** Conjunto de filtros de uma lista — formato livre por escopo. */
export type PresetFilters = Record<string, unknown>;

/** Um filtro salvo de uma lista, com dono e flag de compartilhamento. */
export interface FilterPreset {
  id: string;
  company_id: string;
  user_id: string;
  scope: string;
  name: string;
  filters: PresetFilters;
  shared: boolean;
  created_at: string;
}

// Store em memória para o modo mock.
const mockPresets: FilterPreset[] = [];

export const filterPresetsService = {
  /** Lista os presets de um escopo visíveis (próprios + compartilhados). RLS filtra. */
  async list(scope: string): Promise<FilterPreset[]> {
    if (env.useMocks) {
      await sleep(80);
      return mockPresets.filter((p) => p.scope === scope).sort((a, b) => a.name.localeCompare(b.name));
    }
    const sb = getSupabaseBrowserClient();
    let query = sb.from("filter_presets").select("*").eq("scope", scope);
    const cid = getCurrentCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query.order("name");
    if (error) throw error;
    return (data as FilterPreset[]) ?? [];
  },

  async create(input: {
    scope: string;
    name: string;
    filters: PresetFilters;
    shared: boolean;
  }): Promise<FilterPreset> {
    if (env.useMocks) {
      await sleep(120);
      const rec: FilterPreset = {
        id: uid("fp"),
        company_id: getCurrentCompanyId() || "co_apex",
        user_id: "me",
        scope: input.scope,
        name: input.name,
        filters: input.filters,
        shared: input.shared,
        created_at: new Date().toISOString(),
      };
      mockPresets.push(rec);
      return rec;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("filter_presets")
      .insert({
        scope: input.scope,
        name: input.name,
        filters: input.filters,
        shared: input.shared,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as FilterPreset;
  },

  async update(
    id: string,
    patch: Partial<Pick<FilterPreset, "name" | "filters" | "shared">>,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(100);
      const p = mockPresets.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("filter_presets").update(patch).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(100);
      const i = mockPresets.findIndex((x) => x.id === id);
      if (i >= 0) mockPresets.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("filter_presets").delete().eq("id", id);
    if (error) throw error;
  },
};
