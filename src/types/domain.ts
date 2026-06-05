/**
 * Domain model — the canonical shapes used across the application.
 * These mirror the PostgreSQL schema in `supabase/migrations`.
 */

export type UUID = string;
export type ISODateString = string;

/* ───────────────────────────── RBAC ───────────────────────────── */

export type Role = "super_admin" | "admin" | "broker" | "assistant";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin da Empresa",
  broker: "Corretor",
  assistant: "Assistente",
};

export type EntityStatus = "active" | "inactive";

/* ─────────────────────────── Companies ────────────────────────── */

export interface Company {
  id: UUID;
  legal_name: string;
  trade_name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: Address | null;
  logo_url: string | null;
  status: EntityStatus;
  plan: PlanTier;
  plan_id: UUID | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: ISODateString;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  card_last4: string | null;
  card_brand: string | null;
  onboarding_completed?: boolean; // finalizou o cadastro inicial após escolher o plano
  settings: CompanySettings;
  created_at: ISODateString;
}

/** Sort dimensions available for the tasks & events list. */
export type SortKey = "created" | "due_date" | "due_time" | "due_datetime" | "priority";

export interface SortRule {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Company-wide system preferences (admin-managed). */
export interface CompanySettings {
  taskTimeEnabled?: boolean;
  sortRules?: SortRule[];
  integrations?: IntegrationsSettings;
  /** Leads kanban column that auto-converts a lead into a contato (client). */
  wildcardColumnId?: string | null;
  /** White-label branding (plans with the `whitelabel` module). */
  branding?: BrandingSettings;
}

/** Per-company white-label branding. Logo lives on `companies.logo_url`. */
export interface BrandingSettings {
  /** Brand primary color as a hex string (e.g. "#2563eb"). */
  primaryColor?: string | null;
}

/** Third-party integrations configured per company. */
export interface IntegrationsSettings {
  whatsapp?: WhatsAppIntegration;
  clicksign?: ClickSignIntegration;
}

/** ClickSign (digital signature) — per-company credentials. */
export interface ClickSignIntegration {
  status?: "configured" | "disconnected";
  environment?: "sandbox" | "production";
  /** API access token from the broker's ClickSign account. */
  apiToken?: string;
  /** HMAC secret used to verify webhook calls. */
  webhookSecret?: string;
  connectedAt?: string | null;
}

/** Supported WhatsApp gateways. */
export type WhatsAppProvider = "evolution" | "zapi" | "meta";

export type WhatsAppStatus = "disconnected" | "connected";

export interface WhatsAppIntegration {
  provider?: WhatsAppProvider;
  status?: WhatsAppStatus;
  /** The connected line, once established by the backend. */
  connectedNumber?: string | null;
  evolution?: { baseUrl?: string; apiKey?: string; instance?: string; token?: string };
  zapi?: { instanceId?: string; token?: string; clientToken?: string };
  meta?: {
    phoneNumberId?: string;
    wabaId?: string;
    accessToken?: string;
    verifyToken?: string;
  };
}

export type PlanTier = "starter" | "professional" | "enterprise";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export interface Plan {
  id: UUID;
  code: PlanTier;
  name: string;
  description: string | null;
  price_cents: number;
  max_users: number | null; // null = unlimited
  max_contacts: number | null; // null = unlimited
  highlight: boolean;
  position: number;
  active: boolean;
  /** Feature modules unlocked by this plan (keys from PLAN_MODULES). */
  modules: string[];
  created_at: ISODateString;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zip: string;
}

/* ───────────────────────────── Users ──────────────────────────── */

export interface User {
  id: UUID;
  company_id: UUID;
  name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  role: Role;
  status: EntityStatus;
  is_owner?: boolean;
  last_seen_at: ISODateString | null;
  created_at: ISODateString;
}

/* ─────────────────────────── Customers ────────────────────────── */

export type PersonType = "individual" | "company";

export type CustomerKind = "lead" | "client";

export interface Customer {
  id: UUID;
  company_id: UUID;
  kind: CustomerKind;
  person_type: PersonType;
  name: string;
  document: string; // CPF or CNPJ
  email: string | null;
  phone: string | null;
  birth_date: ISODateString | null;
  address: Address | null;
  notes: string | null;
  tags: string[];
  owner_id: UUID | null; // responsável interno
  status: EntityStatus;
  board_id: UUID | null; // kanban board (leads)
  column_id: UUID | null; // kanban column (leads)
  next_contact_at?: ISODateString | null; // próximo follow-up (calendário de leads)
  created_at: ISODateString;
}

export interface CarrierLink {
  label: string;
  url: string;
}

export interface Carrier {
  id: UUID;
  company_id: UUID;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  links: CarrierLink[];
  notes: string | null;
  status: EntityStatus;
  created_at: ISODateString;
}

export interface Product {
  id: UUID;
  company_id: UUID;
  /** Owning insurance carrier (seguradora), optional. */
  carrier_id?: UUID | null;
  name: string;
  status: EntityStatus;
  created_at: ISODateString;
}

export type ServiceChannel =
  | "whatsapp"
  | "phone"
  | "email"
  | "in_person"
  | "chat"
  | "sms"
  | "other";

export interface ServiceRecord {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  product_id: UUID | null;
  contract_id: UUID | null;
  channel: ServiceChannel;
  notes: string;
  author_id: UUID | null;
  created_at: ISODateString;
}

export type ContractStatus = "active" | "renewal" | "canceled" | "expired";

export interface Contract {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  product_id: UUID | null;
  carrier_id: UUID | null;
  /** Responsável pelo contrato. */
  owner_id: UUID | null;
  policy_number: string | null;
  starts_at: ISODateString | null;
  ends_at: ISODateString | null;
  premium_cents: number;
  commission_percent: number | null;
  status: ContractStatus;
  notes: string | null;
  /** Originating quote (orçamento), when generated from one. */
  quote_id?: UUID | null;
  created_at: ISODateString;
}

/** Orçamento — a proposal for a customer with comparable options. */
export type QuoteStatus = "draft" | "sent" | "awaiting_signature" | "won" | "lost";

export interface Quote {
  id: UUID;
  company_id: UUID;
  number: number;
  customer_id: UUID;
  owner_id: UUID | null;
  status: QuoteStatus;
  title: string | null;
  notes: string | null;
  created_by?: UUID | null;
  /** ClickSign document key, set when sent for signature. */
  clicksign_key?: string | null;
  /** URL of the signed document (from ClickSign), set once signed. */
  signed_url?: string | null;
  signed_at?: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** A comparable option (cotação) inside a quote. */
export interface QuoteOption {
  id: UUID;
  company_id: UUID;
  quote_id: UUID;
  carrier_id: UUID | null;
  product_id: UUID | null;
  premium_cents: number;
  commission_percent: number | null;
  notes: string | null;
  is_selected: boolean;
  position: number;
  created_at: ISODateString;
}

export interface ContractAttachment {
  id: UUID;
  company_id: UUID;
  contract_id: UUID;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: UUID | null;
  created_at: ISODateString;
}

export interface KanbanBoard {
  id: UUID;
  company_id: UUID;
  name: string;
  description: string | null;
  position: number;
  created_at: ISODateString;
}

export interface KanbanColumn {
  id: UUID;
  company_id: UUID;
  board_id: UUID;
  name: string;
  color: StageColor;
  position: number;
  created_at: ISODateString;
}

export interface CustomerInteraction {
  id: UUID;
  customer_id: UUID;
  type: "note" | "call" | "email" | "meeting" | "ticket" | "policy";
  title: string;
  description: string | null;
  author_id: UUID;
  created_at: ISODateString;
}

/* ──────────────────────────── Tickets ─────────────────────────── */

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "claim" // sinistro
  | "renewal" // renovação
  | "new_policy" // nova apólice
  | "billing" // financeiro
  | "support" // suporte
  | "internal"; // tarefa interna

/** What a task is about — drives which entity (if any) it links to. */
export type TicketSubjectType =
  | "internal" // interna (sem vínculo)
  | "customer" // cliente
  | "carrier" // seguradora
  | "product"; // produto

/** Customizable Kanban funnel stage (per company). */
export type StageColor = "neutral" | "primary" | "success" | "warning" | "destructive";

export interface TaskStage {
  id: UUID;
  company_id: UUID;
  name: string;
  color: StageColor;
  position: number;
  is_terminal: boolean;
  created_at: ISODateString;
}

/** A task kanban board (multiple per company; one is the system default). */
export interface TaskBoard {
  id: UUID;
  company_id: UUID;
  name: string;
  description: string | null;
  position: number;
  is_default: boolean;
  created_at: ISODateString;
}

/** A column (bloco) within a task board. */
export interface TaskColumn {
  id: UUID;
  company_id: UUID;
  board_id: UUID;
  name: string;
  color: StageColor;
  position: number;
  is_terminal: boolean;
  created_at: ISODateString;
}

/** Modules a tag can be applied to. Empty list = all modules. */
export type TagModule = "tasks" | "events" | "customers";

export interface Tag {
  id: UUID;
  company_id: UUID;
  name: string;
  color: StageColor;
  modules: TagModule[];
  created_at: ISODateString;
}

export interface Ticket {
  id: UUID;
  company_id: UUID;
  number: number; // sequential, human-readable (#1042)
  title: string;
  description: string | null;
  status: TicketStatus;
  /** Legacy funnel stage (kept for back-compat; board/column is the source of truth). */
  stage_id?: UUID | null;
  /** Kanban board this task belongs to. */
  board_id?: UUID | null;
  /** Column (bloco) within the board. */
  column_id?: UUID | null;
  priority: TicketPriority;
  category: TicketCategory;
  /** Tipo de tarefa — defines which entities it links to. */
  subject_type: TicketSubjectType;
  customer_id: UUID | null;
  /** Linked insurance carrier (seguradora), optional. */
  carrier_id?: UUID | null;
  /** Linked insurance product (produto), optional. */
  product_id?: UUID | null;
  assignee_id: UUID | null;
  /** Who opened the task. */
  created_by?: UUID | null;
  /** Involved teammates (envolvidos). */
  participant_ids?: UUID[];
  tags: string[];
  unread_count: number;
  due_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type TicketMessageKind = "message" | "internal_note";

export interface TicketMessage {
  id: UUID;
  ticket_id: UUID;
  author_id: UUID;
  kind: TicketMessageKind;
  body: string;
  mentions: UUID[];
  attachments: TicketAttachment[];
  created_at: ISODateString;
  read_by: UUID[];
}

export interface TicketAttachment {
  id: UUID;
  name: string;
  size: number;
  mime_type: string;
  url: string;
}

export type TicketEventType =
  | "created"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "participant_added"
  | "tag_added"
  | "comment";

export interface TicketLog {
  id: UUID;
  ticket_id: UUID;
  actor_id: UUID;
  event: TicketEventType;
  meta: Record<string, unknown>;
  created_at: ISODateString;
}

export interface TicketParticipant {
  ticket_id: UUID;
  user_id: UUID;
  added_at: ISODateString;
}

/* ──────────────────────────── Calendar ────────────────────────── */

export type CalendarEventType = "meeting" | "reminder" | "task" | "renewal";

/** How the event takes place. */
export type EventModality = "in_person" | "hybrid" | "virtual" | "not_applicable";

export interface CalendarEvent {
  id: UUID;
  company_id: UUID;
  /** Sequential, human-readable number (e.g. #E-001). DB-generated. */
  number?: number;
  title: string;
  description: string | null;
  type: CalendarEventType;
  modality?: EventModality;
  /** Tipo de evento — defines which entities it links to. */
  subject_type: TicketSubjectType;
  starts_at: ISODateString;
  ends_at: ISODateString;
  all_day: boolean;
  customer_id: UUID | null;
  /** Linked insurance carrier (seguradora), optional. */
  carrier_id?: UUID | null;
  /** Linked insurance product (produto), optional. */
  product_id?: UUID | null;
  /** Responsável pelo evento. */
  owner_id: UUID;
  /** Quem criou. */
  created_by?: UUID | null;
  /** Envolvidos. */
  participant_ids?: UUID[];
  tags?: string[];
  /** Whether the event has been concluded. */
  finished?: boolean;
  /** Kanban board this event belongs to. */
  board_id?: UUID | null;
  /** Column (bloco) within the board. */
  column_id?: UUID | null;
  location: string | null;
  created_at: ISODateString;
}

/* ────────────────────────── Notifications ─────────────────────── */

export type NotificationType =
  | "ticket_assigned"
  | "ticket_message"
  | "mention"
  | "task_due"
  | "event_reminder"
  | "system";

export interface AppNotification {
  id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: ISODateString;
}

/* ──────────────────────────── Modules ─────────────────────────── */

export type ModuleKey =
  | "dashboard"
  | "companies"
  | "users"
  | "customers"
  | "tickets"
  | "kanban"
  | "calendar"
  | "billing"
  | "automations";

export interface PlatformModule {
  key: ModuleKey;
  name: string;
  description: string;
  enabled: boolean;
  min_plan: PlanTier;
}

/* ────────────────────────── Session ───────────────────────────── */

export interface SessionUser extends User {
  company: Company;
}
