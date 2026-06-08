import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sleep, uid } from "@/lib/utils";
import type { DefaultTag, StageColor, TagModule } from "@/types/domain";

// Tags padrão do sistema (geridas pelo super admin). Global — sem company_id.
const mockTags: DefaultTag[] = [];

export const defaultTagsService = {
  async list(): Promise<DefaultTag[]> {
    if (env.useMocks) {
      await sleep(150);
      return [...mockTags].sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("default_tags")
      .select("*")
      .order("position")
      .order("name");
    if (error) throw error;
    return (data as DefaultTag[]) ?? [];
  },

  async create(input: {
    name: string;
    color: StageColor;
    modules: TagModule[];
  }): Promise<DefaultTag> {
    if (env.useMocks) {
      await sleep(200);
      const rec: DefaultTag = {
        id: uid("dt"),
        name: input.name,
        color: input.color,
        modules: input.modules,
        position: mockTags.length,
        created_at: new Date().toISOString(),
      };
      mockTags.push(rec);
      return rec;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("default_tags").insert(input).select("*").single();
    if (error) throw error;
    return data as DefaultTag;
  },

  async update(
    id: string,
    patch: Partial<Pick<DefaultTag, "name" | "color" | "modules">>,
  ): Promise<DefaultTag> {
    if (env.useMocks) {
      await sleep(180);
      const i = mockTags.findIndex((t) => t.id === id);
      if (i === -1) throw new Error("Tag padrão não encontrada");
      mockTags[i] = { ...mockTags[i]!, ...patch };
      return mockTags[i]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("default_tags")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DefaultTag;
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(120);
      const i = mockTags.findIndex((t) => t.id === id);
      if (i !== -1) mockTags.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("default_tags").delete().eq("id", id);
    if (error) throw error;
  },

  /** Aplica as tags padrão a TODAS as empresas existentes (adiciona o que falta). */
  async syncToAllCompanies(): Promise<void> {
    if (env.useMocks) {
      await sleep(200);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.rpc("sync_default_tags");
    if (error) throw error;
  },
};
