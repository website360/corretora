import type { PlatformModule } from "@/types/domain";

/**
 * Catalogue of platform modules. The `enabled` flag drives the
 * future plan-based feature gating (multi-tenant module licensing).
 */
export const PLATFORM_MODULES: PlatformModule[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    description: "Visão geral, KPIs e métricas em tempo real.",
    enabled: true,
    min_plan: "starter",
  },
  {
    key: "customers",
    name: "Clientes",
    description: "Gestão completa da carteira de clientes e histórico.",
    enabled: true,
    min_plan: "starter",
  },
  {
    key: "tickets",
    name: "Tarefas & Atendimento",
    description: "Helpdesk, tarefas e colaboração em tempo real.",
    enabled: true,
    min_plan: "starter",
  },
  {
    key: "calendar",
    name: "Agenda",
    description: "Calendário, reuniões e lembretes da equipe.",
    enabled: true,
    min_plan: "professional",
  },
  {
    key: "users",
    name: "Equipe & Permissões",
    description: "Usuários, funções (RBAC) e convites.",
    enabled: true,
    min_plan: "professional",
  },
  {
    key: "billing",
    name: "Billing & Assinaturas",
    description: "Planos, cobrança recorrente e faturas. (em breve)",
    enabled: false,
    min_plan: "enterprise",
  },
  {
    key: "automations",
    name: "Automações & IA",
    description: "Fluxos automáticos, chatbot e integrações. (em breve)",
    enabled: false,
    min_plan: "enterprise",
  },
];
