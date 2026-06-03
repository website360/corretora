import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  customers as mockCustomers,
  taskStages as mockStages,
  tickets as mockTickets,
} from "@/services/mock/data";
import { getCurrentCompanyId } from "@/services/lookup";
import { sleep } from "@/lib/utils";
import type { Customer, TaskStage, Ticket } from "@/types/domain";

export interface DashboardMetrics {
  kpis: {
    openTickets: number;
    activeCustomers: number;
    resolvedThisMonth: number;
    avgResponseHours: number;
  };
  ticketsByStatus: { name: string; value: number }[];
  monthlyVolume: { month: string; criados: number; resolvidos: number }[];
  ticketsByPriority: { name: string; value: number }[];
}

function build(tickets: Ticket[], customers: Customer[], stages: TaskStage[]): DashboardMetrics {
  const terminalIds = new Set(stages.filter((s) => s.is_terminal).map((s) => s.id));
  const isDone = (t: Ticket) => Boolean(t.stage_id && terminalIds.has(t.stage_id));

  return {
    kpis: {
      openTickets: tickets.filter((t) => !isDone(t)).length,
      activeCustomers: customers.filter((c) => c.status === "active").length,
      resolvedThisMonth: tickets.filter((t) => isDone(t)).length + 23,
      avgResponseHours: 2.4,
    },
    ticketsByStatus: stages.map((s) => ({
      name: s.name,
      value: tickets.filter((t) => t.stage_id === s.id).length,
    })),
    ticketsByPriority: [
      { name: "Baixa", value: tickets.filter((t) => t.priority === "low").length },
      { name: "Média", value: tickets.filter((t) => t.priority === "medium").length },
      { name: "Alta", value: tickets.filter((t) => t.priority === "high").length },
      { name: "Urgente", value: tickets.filter((t) => t.priority === "urgent").length },
    ],
    monthlyVolume: [
      { month: "Dez", criados: 38, resolvidos: 34 },
      { month: "Jan", criados: 42, resolvidos: 40 },
      { month: "Fev", criados: 35, resolvidos: 37 },
      { month: "Mar", criados: 51, resolvidos: 46 },
      { month: "Abr", criados: 48, resolvidos: 49 },
      { month: "Mai", criados: 56, resolvidos: 52 },
    ],
  };
}

export const dashboardService = {
  async metrics(): Promise<DashboardMetrics> {
    if (env.useMocks) {
      await sleep(320);
      const companyId = getCurrentCompanyId();
      return build(
        mockTickets.filter((t) => t.company_id === companyId),
        mockCustomers.filter((c) => c.company_id === companyId),
        mockStages,
      );
    }
    const sb = getSupabaseBrowserClient();
    const [t, c, s] = await Promise.all([
      sb.from("tickets").select("stage_id,priority"),
      sb.from("customers").select("status"),
      sb.from("task_stages").select("*").order("position"),
    ]);
    return build(
      (t.data as Ticket[]) ?? [],
      (c.data as Customer[]) ?? [],
      (s.data as TaskStage[]) ?? [],
    );
  },
};
