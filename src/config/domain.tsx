import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Handshake,
  Mail,
  MessageCircle,
  MessageSquare,
  Minus,
  PauseCircle,
  Phone,
  Smartphone,
  Headset,
  XCircle,
  ClipboardList,
  User,
  UserPlus,
  Building2,
  Package,
  FileText,
  Calculator,
  CalendarClock,
  LayoutGrid,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type {
  TicketCategory,
  TicketSubjectType,
  TicketPriority,
  TicketStatus,
  CalendarEventType,
  EventModality,
  ContractStatus,
  QuoteStatus,
  ClaimStatus,
  ServiceChannel,
  TagModule,
  TaskBoardKind,
} from "@/types/domain";

export type Tone = "neutral" | "primary" | "success" | "warning" | "destructive";

export const TAG_MODULE_META: Record<TagModule, { label: string }> = {
  tasks: { label: "Tarefas" },
  events: { label: "Eventos" },
  customers: { label: "Clientes" },
};

export const EVENT_MODALITY_META: Record<EventModality, { label: string }> = {
  in_person: { label: "Presencial" },
  hybrid: { label: "Híbrido" },
  virtual: { label: "Virtual" },
  not_applicable: { label: "Não se aplica" },
};

export interface DisplayMeta {
  label: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
}

export const TICKET_STATUS_META: Record<TicketStatus, DisplayMeta> = {
  open: { label: "Aberto", tone: "primary", icon: Circle },
  in_progress: { label: "Em andamento", tone: "warning", icon: Clock },
  waiting_customer: { label: "Aguardando cliente", tone: "neutral", icon: PauseCircle },
  resolved: { label: "Resolvido", tone: "success", icon: CheckCircle2 },
  closed: { label: "Fechado", tone: "neutral", icon: XCircle },
};

export const TICKET_PRIORITY_META: Record<TicketPriority, DisplayMeta> = {
  low: { label: "Baixa", tone: "neutral", icon: ArrowDown },
  medium: { label: "Média", tone: "primary", icon: ArrowRight },
  high: { label: "Alta", tone: "warning", icon: ArrowUp },
  urgent: { label: "Urgente", tone: "destructive", icon: Flame },
};

export const TICKET_CATEGORY_META: Record<TicketCategory, { label: string }> = {
  claim: { label: "Sinistro" },
  renewal: { label: "Renovação" },
  new_policy: { label: "Nova apólice" },
  billing: { label: "Financeiro" },
  support: { label: "Suporte" },
  internal: { label: "Tarefa interna" },
};

/** Tipo de tarefa (subject) — label + icon + tone for menus, selects and badges. */
export const TICKET_SUBJECT_META: Record<TicketSubjectType, DisplayMeta> = {
  internal: { label: "Interna", tone: "neutral", icon: ClipboardList },
  customer: { label: "Cliente", tone: "primary", icon: User },
  lead: { label: "Lead", tone: "warning", icon: UserPlus },
  carrier: { label: "Seguradora", tone: "warning", icon: Building2 },
  product: { label: "Produto", tone: "success", icon: Package },
  contract: { label: "Contrato", tone: "primary", icon: FileText },
  quote: { label: "Orçamento", tone: "warning", icon: Calculator },
};

/**
 * Categorias de tarefa/evento que o usuário pode ESCOLHER e FILTRAR. Os demais
 * tipos (produto/contrato/orçamento) não são categorias — viram Indicadores.
 */
export const TASK_CATEGORY_TYPES: TicketSubjectType[] = ["internal", "customer", "lead", "carrier"];

export const CALENDAR_EVENT_META: Record<
  CalendarEventType,
  { label: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }
> = {
  meeting: { label: "Reunião", tone: "primary", icon: Clock },
  reminder: { label: "Lembrete", tone: "warning", icon: AlertTriangle },
  task: { label: "Tarefa", tone: "neutral", icon: CheckCircle2 },
  renewal: { label: "Renovação", tone: "success", icon: ArrowUp },
};

/** Tipo de Kanban (task_board) — separa quadros de Tarefas x Agenda x Outros. */
export const TASK_BOARD_KIND_META: Record<
  TaskBoardKind,
  { label: string; icon: LucideIcon }
> = {
  tasks: { label: "Tarefas", icon: ListChecks },
  agenda: { label: "Agenda", icon: CalendarClock },
  other: { label: "Outro", icon: LayoutGrid },
};

/** Ordem de exibição dos tipos de Kanban. */
export const TASK_BOARD_KINDS: TaskBoardKind[] = ["tasks", "agenda", "other"];

export const TONE_BADGE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-accent text-accent-foreground border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

export const TONE_DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export const TONE_TEXT_CLASS: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export const TONE_BORDER_CLASS: Record<Tone, string> = {
  neutral: "border-l-muted-foreground/40",
  primary: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  destructive: "border-l-destructive",
};

/** Atendimento channels. */
export const SERVICE_CHANNEL_META: Record<
  ServiceChannel,
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  whatsapp: { label: "WhatsApp", tone: "success", icon: MessageCircle },
  phone: { label: "Telefone", tone: "primary", icon: Phone },
  email: { label: "E-mail", tone: "warning", icon: Mail },
  in_person: { label: "Presencial", tone: "neutral", icon: Handshake },
  chat: { label: "Chat", tone: "primary", icon: MessageSquare },
  sms: { label: "SMS", tone: "neutral", icon: Smartphone },
  other: { label: "Outro", tone: "neutral", icon: Headset },
};

/** Contract / policy status. */
export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; tone: Tone }> = {
  active: { label: "Ativo", tone: "success" },
  renewal: { label: "Em renovação", tone: "warning" },
  canceled: { label: "Cancelado", tone: "neutral" },
  expired: { label: "Vencido", tone: "destructive" },
};

/** Orçamento (quote) pipeline statuses. */
export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; tone: Tone }> = {
  draft: { label: "Negociando", tone: "primary" },
  sent: { label: "Enviado", tone: "neutral" }, // legacy — not shown as a column
  awaiting_signature: { label: "Aguardando assinatura", tone: "warning" },
  won: { label: "Assinado", tone: "success" },
  lost: { label: "Desistência", tone: "destructive" },
};

/** Ordered quote statuses for the kanban pipeline. */
export const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  "draft",
  "awaiting_signature",
  "won",
  "lost",
];

/** Active pipeline columns — excludes the concluded "Assinado" (goes to Concluídos). */
export const QUOTE_ACTIVE_STATUSES: QuoteStatus[] = ["draft", "awaiting_signature", "lost"];

/** Sinistro (claim) statuses — label + cor. */
export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; tone: Tone }> = {
  requested: { label: "Solicitado", tone: "warning" },
  analysis: { label: "Em análise", tone: "primary" },
  approved: { label: "Aprovado", tone: "success" },
  denied: { label: "Negado", tone: "destructive" },
  paid: { label: "Pago", tone: "success" },
  closed: { label: "Encerrado", tone: "neutral" },
};

/** Ordem dos status de sinistro (para selects/filtros). */
export const CLAIM_STATUS_ORDER: ClaimStatus[] = [
  "requested",
  "analysis",
  "approved",
  "denied",
  "paid",
  "closed",
];

/** Feature modules a plan can unlock (toggled per plan in the SaaS admin). */
export const PLAN_MODULES: { key: string; label: string }[] = [
  { key: "leads", label: "Leads (Kanban)" },
  { key: "contatos", label: "Contatos" },
  { key: "orcamentos", label: "Orçamentos" },
  { key: "contratos", label: "Contratos" },
  { key: "tarefas", label: "Tarefas & Agenda" },
  { key: "atendimento", label: "Atendimento" },
  { key: "catalogo", label: "Seguradoras & Produtos" },
  { key: "relatorios", label: "Relatórios" },
  { key: "assinatura", label: "Assinatura digital (ClickSign)" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "whitelabel", label: "White-label (marca própria)" },
];
