import {
  BarChart3,
  Building2,
  Calculator,
  Gauge,
  FileText,
  Headset,
  KanbanSquare,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
  UserSquare2,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey, Role } from "@/types/domain";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module: ModuleKey | null;
  /** Roles allowed to see the entry. Empty = everyone. */
  roles?: Role[];
  badgeKey?: "tickets" | "notifications";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    title: "Geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Leads", href: "/kanban", icon: KanbanSquare, module: "kanban" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Contatos", href: "/clientes", icon: UserSquare2, module: "customers" },
      { label: "Orçamentos", href: "/orcamentos", icon: Calculator, module: null },
      { label: "Contratos", href: "/contratos", icon: FileText, module: null },
      { label: "Sinistros", href: "/sinistros", icon: ShieldAlert, module: null },
      { label: "Atendimento", href: "/atendimentos", icon: Headset, module: null },
      {
        label: "Tarefas e Agenda",
        href: "/tickets",
        icon: Ticket,
        module: "tickets",
        badgeKey: "tickets",
      },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Seguradoras", href: "/companhias", icon: ShieldCheck, module: null },
      { label: "Relatórios", href: "/relatorios", icon: BarChart3, module: null },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        label: "Empresas",
        href: "/empresas",
        icon: Building2,
        module: "companies",
        roles: ["super_admin"],
      },
      {
        label: "Lixeira",
        href: "/lixeira",
        icon: Trash2,
        module: null,
        roles: ["super_admin", "admin"],
      },
      {
        label: "Usuários",
        href: "/usuarios",
        icon: Users,
        module: "users",
        roles: ["super_admin", "admin"],
      },
      { label: "Configurações", href: "/configuracoes", icon: Settings, module: null },
      { label: "Ajuda & Suporte", href: "/ajuda", icon: LifeBuoy, module: null },
    ],
  },
  {
    title: "Administração (SaaS)",
    items: [
      { label: "Painel SaaS", href: "/admin", icon: Gauge, module: null, roles: ["super_admin"] },
    ],
  },
];

/** Flattened list — handy for the command palette. */
export const ALL_NAV_ITEMS: NavItem[] = NAVIGATION.flatMap((s) => s.items);
