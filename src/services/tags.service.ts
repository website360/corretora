import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { StageColor, Tag, TagModule } from "@/types/domain";

// In-memory tag store for mock mode.
const mockTags: Tag[] = [
  { id: "tg_urgente", company_id: "co_apex", name: "urgente", color: "destructive", modules: [], created_at: new Date().toISOString() },
  { id: "tg_frota", company_id: "co_apex", name: "frota", color: "primary", modules: ["tasks"], created_at: new Date().toISOString() },
  { id: "tg_renovacao", company_id: "co_apex", name: "renovação", color: "warning", modules: ["tasks", "events"], created_at: new Date().toISOString() },
  { id: "tg_vip", company_id: "co_apex", name: "vip", color: "success", modules: ["customers"], created_at: new Date().toISOString() },
];

function appliesTo(tag: Tag, module?: TagModule) {
  if (!module) return true;
  return tag.modules.length === 0 || tag.modules.includes(module);
}

export const tagsService = {
  /** Lists tags, optionally limited to those scoped to a given module. */
  async list(module?: TagModule): Promise<Tag[]> {
    if (env.useMocks) {
      await sleep(120);
      return mockTags.filter((t) => appliesTo(t, module)).sort((a, b) => a.name.localeCompare(b.name));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("tags")
      .select("*")
      .eq("company_id", getCurrentCompanyId())
      .order("name");
    if (error) throw error;
    return ((data as Tag[]) ?? []).filter((t) => appliesTo(t, module));
  },

  async create(input: { name: string; color: StageColor; modules: TagModule[] }): Promise<Tag> {
    if (env.useMocks) {
      await sleep(200);
      const tag: Tag = {
        id: uid("tg"),
        company_id: getCurrentCompanyId() || "co_apex",
        ...input,
        created_at: new Date().toISOString(),
      };
      mockTags.push(tag);
      return tag;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("tags")
      .insert({ ...input, company_id: getCurrentCompanyId() })
      .select("*")
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async update(id: string, patch: Partial<Pick<Tag, "name" | "color" | "modules">>): Promise<void> {
    if (env.useMocks) {
      await sleep(160);
      const t = mockTags.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("tags").update(patch).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(160);
      const idx = mockTags.findIndex((x) => x.id === id);
      if (idx !== -1) mockTags.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("tags").delete().eq("id", id);
    if (error) throw error;
  },
};
