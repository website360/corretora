import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { UserGroup } from "@/types/domain";

// Grupos vivem só na memória no modo mock (sem backend).
const mockGroups: UserGroup[] = [];

export const userGroupsService = {
  async list(): Promise<UserGroup[]> {
    if (env.useMocks) {
      await sleep(180);
      const cid = getCurrentCompanyId();
      return mockGroups
        .filter((g) => g.company_id === cid)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("user_groups").select("*").order("name");
    if (error) throw error;
    return (data as UserGroup[]) ?? [];
  },

  async create(input: { name: string; member_ids: string[] }): Promise<UserGroup> {
    if (env.useMocks) {
      await sleep(280);
      const rec: UserGroup = {
        id: uid("ug"),
        company_id: getCurrentCompanyId(),
        name: input.name,
        member_ids: input.member_ids,
        created_at: new Date().toISOString(),
      };
      mockGroups.unshift(rec);
      return rec;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("user_groups")
      .insert({ ...input, company_id: getCurrentCompanyId() })
      .select("*")
      .single();
    if (error) throw error;
    return data as UserGroup;
  },

  async update(
    id: string,
    patch: Partial<Pick<UserGroup, "name" | "member_ids">>,
  ): Promise<UserGroup> {
    if (env.useMocks) {
      await sleep(240);
      const i = mockGroups.findIndex((g) => g.id === id);
      if (i === -1) throw new Error("Grupo não encontrado");
      mockGroups[i] = { ...mockGroups[i]!, ...patch };
      return mockGroups[i]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("user_groups")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as UserGroup;
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(180);
      const i = mockGroups.findIndex((g) => g.id === id);
      if (i !== -1) mockGroups.splice(i, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("user_groups").delete().eq("id", id);
    if (error) throw error;
  },
};
