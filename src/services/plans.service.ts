import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sleep } from "@/lib/utils";
import type { Plan } from "@/types/domain";

const ALL_MODULES = [
  "leads", "contatos", "orcamentos", "contratos", "tarefas",
  "atendimento", "catalogo", "relatorios", "assinatura", "whatsapp",
];
const mockPlans: Plan[] = [
  { id: "pl_starter", code: "starter", name: "Starter", description: "Para começar a organizar sua corretora.", price_cents: 9900, max_users: 5, max_contacts: 500, highlight: false, position: 0, active: true, modules: ALL_MODULES, created_at: new Date().toISOString() },
  { id: "pl_pro", code: "professional", name: "Professional", description: "Para equipes em crescimento.", price_cents: 24900, max_users: 15, max_contacts: 2000, highlight: true, position: 1, active: true, modules: ALL_MODULES, created_at: new Date().toISOString() },
  { id: "pl_ent", code: "enterprise", name: "Enterprise", description: "Recursos ilimitados para grandes operações.", price_cents: 59900, max_users: null, max_contacts: null, highlight: false, position: 2, active: true, modules: ALL_MODULES, created_at: new Date().toISOString() },
];

export const plansService = {
  async list(): Promise<Plan[]> {
    if (env.useMocks) {
      await sleep(80);
      return [...mockPlans].sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("position");
    if (error) throw error;
    return (data as Plan[]) ?? [];
  },

  /** All plans incl. inactive — for the SaaS admin panel. */
  async listAll(): Promise<Plan[]> {
    if (env.useMocks) {
      await sleep(80);
      return [...mockPlans].sort((a, b) => a.position - b.position);
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb.from("plans").select("*").order("position");
    if (error) throw error;
    return (data as Plan[]) ?? [];
  },

  /** Updates a plan (super_admin only — via the admin API route, service role). */
  async update(
    id: string,
    patch: Partial<
      Pick<Plan, "name" | "description" | "price_cents" | "max_users" | "max_contacts" | "highlight" | "active" | "modules">
    >,
  ): Promise<void> {
    const res = await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Falha ao salvar o plano.");
  },
};
