import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { SavedTaskFilters } from "@/lib/task-filters-storage";

/** Um filtro salvo da tela de Tarefas, com dono e flag de compartilhamento. */
export interface TaskFilterPreset {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  filters: SavedTaskFilters;
  shared: boolean;
  created_at: string;
}

// Store em memória para o modo mock.
const mockPresets: TaskFilterPreset[] = [];

export const taskFilterPresetsService = {
  /** Lista os presets visíveis (próprios + compartilhados da empresa). RLS filtra. */
  async list(): Promise<TaskFilterPreset[]> {
    if (env.useMocks) {
      await sleep(80);
      return [...mockPresets].sort((a, b) => a.name.localeCompare(b.name));
    }
    const sb = getSupabaseBrowserClient();
    let query = sb.from("task_filter_presets").select("*");
    const cid = getCurrentCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query.order("name");
    if (error) throw error;
    return (data as TaskFilterPreset[]) ?? [];
  },

  async create(input: {
    name: string;
    filters: SavedTaskFilters;
    shared: boolean;
  }): Promise<TaskFilterPreset> {
    if (env.useMocks) {
      await sleep(120);
      const rec: TaskFilterPreset = {
        id: uid("fp"),
        company_id: getCurrentCompanyId() || "co_apex",
        user_id: "me",
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
      .from("task_filter_presets")
      .insert({ name: input.name, filters: input.filters, shared: input.shared })
      .select("*")
      .single();
    if (error) throw error;
    return data as TaskFilterPreset;
  },

  async update(
    id: string,
    patch: Partial<Pick<TaskFilterPreset, "name" | "filters" | "shared">>,
  ): Promise<void> {
    if (env.useMocks) {
      await sleep(100);
      const p = mockPresets.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("task_filter_presets").update(patch).eq("id", id);
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
    const { error } = await sb.from("task_filter_presets").delete().eq("id", id);
    if (error) throw error;
  },
};
