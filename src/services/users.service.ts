import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { users } from "@/services/mock/data";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { User } from "@/types/domain";

export const usersService = {
  async list(): Promise<User[]> {
    if (env.useMocks) {
      await sleep(240);
      const companyId = getCurrentCompanyId();
      return users
        .filter((u) => u.company_id === companyId)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("users").select("*").order("name");
    if (error) throw error;
    return (data as User[]) ?? [];
  },

  async get(id: string): Promise<User | null> {
    if (env.useMocks) {
      await sleep(160);
      return users.find((u) => u.id === id) ?? null;
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb.from("users").select("*").eq("id", id).maybeSingle();
    return (data as User | null) ?? null;
  },

  /**
   * Creates a real team member. In mock mode appends locally; in real mode
   * calls the server route which uses the Supabase admin API + the
   * handle_new_user trigger to provision the account in the current company.
   */
  async createUser(input: {
    name: string;
    email: string;
    role: User["role"];
    password: string;
    phone?: string | null;
    job_title?: string | null;
  }): Promise<void> {
    if (env.useMocks) {
      await sleep(400);
      users.push({
        id: uid("us"),
        company_id: getCurrentCompanyId() || "co_apex",
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        job_title: input.job_title ?? null,
        avatar_url: null,
        role: input.role,
        status: "active",
        last_seen_at: null,
        created_at: new Date().toISOString(),
      });
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Falha ao criar usuário.");
    }
  },

  async update(id: string, patch: Partial<User>): Promise<User> {
    if (env.useMocks) {
      await sleep(320);
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) throw new Error("Usuário não encontrado");
      users[idx] = { ...users[idx]!, ...patch };
      return users[idx]!;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("users").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as User;
  },
};
