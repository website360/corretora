import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentCompanyId, getViewCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { UserGroup } from "@/types/domain";

// Grupos vivem só na memória no modo mock (sem backend).
const mockGroups: UserGroup[] = [];

/**
 * Expande seleções de "Envolvidos": valores `group:<id>` viram os membros do
 * grupo; valores normais (ids de usuário) passam direto. Sempre sem duplicar.
 * Permite, no mesmo seletor, escolher um GRUPO ou pessoas individuais.
 */
export function expandGroups(values: string[], groups: UserGroup[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v.startsWith("group:")) {
      const g = groups.find((x) => x.id === v.slice("group:".length));
      g?.member_ids.forEach((m) => set.add(m));
    } else {
      set.add(v);
    }
  }
  return Array.from(set);
}

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
    let query = sb.from("user_groups").select("*");
    const cid = getViewCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query.order("name");
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
