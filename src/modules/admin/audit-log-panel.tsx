"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eraser, ScrollText } from "lucide-react";
import { toast } from "sonner";
import {
  AUDIT_PAGE_SIZE,
  auditService,
  type AuditAction,
  type AuditChange,
  type AuditLog,
} from "@/services/audit.service";
import { formatCurrency, formatShortDate, formatTime } from "@/utils/format";
import { ROLE_LABELS, type User } from "@/types/domain";
import {
  CALENDAR_EVENT_META,
  CLAIM_STATUS_META,
  CONTRACT_STATUS_META,
  EVENT_MODALITY_META,
  QUOTE_STATUS_META,
  SERVICE_CHANNEL_META,
  TASK_BOARD_KIND_META,
  TICKET_CATEGORY_META,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META,
  TICKET_SUBJECT_META,
} from "@/config/domain";
import { DataTable } from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─────────────────────────── nomes legíveis ─────────────────────────── */

/** Tabela do banco → nome que o usuário reconhece. */
const TABLE_LABELS: Record<string, string> = {
  audit_logs: "Log de auditoria",
  calendar_events: "Agenda",
  claim_updates: "Andamentos de sinistro",
  claims: "Sinistros",
  companies: "Empresas",
  company_modules: "Módulos da empresa",
  contract_attachments: "Anexos de contrato",
  contracts: "Contratos",
  customer_interactions: "Interações com cliente",
  customers: "Clientes",
  default_carriers: "Companhias padrão",
  default_products: "Produtos padrão",
  default_tags: "Etiquetas padrão",
  email_templates: "Modelos de e-mail",
  insurance_carriers: "Companhias",
  insurance_products: "Produtos",
  kanban_boards: "Quadros do funil",
  kanban_columns: "Colunas do funil",
  modules: "Módulos",
  notifications: "Notificações",
  payment_methods: "Formas de pagamento",
  plans: "Planos",
  platform_settings: "Configurações da plataforma",
  quote_options: "Opções de orçamento",
  quotes: "Orçamentos",
  service_records: "Atendimentos",
  tags: "Etiquetas",
  task_boards: "Quadros de tarefas",
  task_checklist_items: "Itens de checklist",
  task_checklists: "Checklists",
  task_columns: "Colunas de tarefas",
  task_filter_presets: "Filtros salvos",
  task_stages: "Estágios",
  ticket_logs: "Histórico de tarefas",
  ticket_messages: "Mensagens",
  ticket_participants: "Participantes",
  ticket_tags: "Etiquetas de tarefa",
  tickets: "Tarefas",
  user_groups: "Grupos de usuários",
  users: "Usuários",
};

/**
 * Toda coluna do schema em português — a lista veio de
 * `information_schema.columns`, então não sobra nome técnico na tela.
 */
const FIELD_LABELS: Record<string, string> = {
  active: "Ativo",
  actor_id: "Autor",
  added_at: "Adicionado em",
  address: "Endereço",
  all_day: "Dia inteiro",
  amount_cents: "Valor",
  asaas_customer_id: "Cliente no Asaas",
  asaas_subscription_id: "Assinatura no Asaas",
  asaas_token: "Token do Asaas",
  assignee_id: "Responsável",
  attachments: "Anexos",
  auth_user_id: "Login vinculado",
  author_id: "Autor",
  auto_send: "Envio automático",
  avatar_url: "Foto",
  birth_date: "Nascimento",
  board_id: "Quadro",
  body: "Conteúdo",
  brand: "Bandeira",
  calendar_token: "Token da agenda",
  card_brand: "Bandeira do cartão",
  card_last4: "Final do cartão",
  carrier_id: "Companhia",
  category: "Categoria",
  channel: "Canal",
  checklist_id: "Checklist",
  claim_id: "Sinistro",
  clicksign_key: "Chave do ClickSign",
  cnpj: "CNPJ",
  code: "Código",
  color: "Cor",
  column_id: "Coluna",
  commission_percent: "Comissão (%)",
  company_id: "Empresa",
  content: "Conteúdo",
  contract_id: "Contrato",
  created_at: "Criado em",
  created_by: "Criado por",
  customer_id: "Cliente",
  default_carrier_id: "Companhia padrão",
  default_product_id: "Produto padrão",
  default_tag_id: "Etiqueta padrão",
  deleted_at: "Excluído em",
  description: "Descrição",
  document: "Documento",
  done: "Concluído",
  done_at: "Concluído em",
  done_by: "Concluído por",
  due_at: "Vencimento",
  email: "E-mail",
  enabled: "Habilitado",
  ends_at: "Fim",
  event: "Evento",
  filters: "Filtros",
  finished: "Finalizado",
  highlight: "Destaque",
  holder_name: "Titular",
  href: "Link",
  icon: "Ícone",
  id: "Identificador",
  is_custom: "Personalizado",
  is_default: "Padrão",
  is_owner: "É o dono",
  is_selected: "Selecionado",
  is_system: "Do sistema",
  is_terminal: "Etapa final",
  job_title: "Cargo",
  key: "Chave",
  kind: "Tipo",
  last4: "Final do cartão",
  last_seen_at: "Visto por último",
  legal_name: "Razão social",
  links: "Links",
  location: "Local",
  logo_url: "Logo",
  max_contacts: "Limite de contatos",
  max_users: "Limite de usuários",
  member_ids: "Membros",
  mentions: "Menções",
  meta: "Detalhes",
  mime_type: "Tipo do arquivo",
  min_plan: "Plano mínimo",
  modality: "Modalidade",
  module_key: "Módulo",
  modules: "Módulos",
  name: "Nome",
  next_contact_at: "Próximo contato",
  note: "Observação",
  notes: "Observações",
  number: "Número",
  occurred_at: "Ocorrido em",
  onboarding_completed: "Onboarding concluído",
  owner_id: "Responsável",
  participant_ids: "Participantes",
  person_type: "Tipo de pessoa",
  phone: "Telefone",
  plan: "Plano",
  plan_id: "Plano",
  policy_number: "Número da apólice",
  portal_enabled: "Portal habilitado",
  portal_must_change_password: "Precisa trocar a senha do portal",
  position: "Posição",
  premium_cents: "Prêmio",
  price_cents: "Valor",
  priority: "Prioridade",
  product_id: "Produto",
  quote_id: "Orçamento",
  read: "Lida",
  read_by: "Lida por",
  registros_removidos: "Registros removidos",
  renewal_contract_id: "Contrato da renovação",
  role: "Perfil",
  scope: "Escopo",
  settings: "Configurações",
  shared: "Compartilhado",
  signed_at: "Assinado em",
  signed_url: "Link assinado",
  size: "Tamanho",
  slot: "Posição",
  source: "Origem",
  stage_id: "Estágio",
  starts_at: "Início",
  status: "Situação",
  storage_path: "Caminho do arquivo",
  subject: "Assunto",
  subject_type: "Tipo de assunto",
  subscription_status: "Situação da assinatura",
  tags: "Etiquetas",
  task_filter_last: "Último filtro de tarefas",
  task_filter_presets: "Filtros salvos de tarefas",
  ticket_id: "Tarefa",
  title: "Título",
  trade_name: "Nome fantasia",
  trial_ends_at: "Fim do período de teste",
  type: "Tipo",
  unread_count: "Não lidas",
  updated_at: "Atualizado em",
  updated_by: "Atualizado por",
  uploaded_by: "Enviado por",
  user_id: "Usuário",
  value: "Valor",
  website: "Site",
};

function fieldLabel(field: string) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const words = field.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ─────────────── valores de enum, nos rótulos que o app já usa ─────────────── */

const labelsOf = (meta: Record<string, { label: string }>): Record<string, string> =>
  Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, v.label]));

const ENTITY_STATUS = { active: "Ativo", inactive: "Inativo" };
const SUBSCRIPTION_STATUS = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Inadimplente",
  canceled: "Cancelada",
};
const NOTIFICATION_TYPE = {
  ticket_assigned: "Tarefa atribuída",
  ticket_message: "Nova mensagem",
  mention: "Menção",
  task_due: "Tarefa vencendo",
  event_reminder: "Lembrete de evento",
  system: "Sistema",
};

/**
 * O mesmo nome de coluna carrega enums diferentes conforme a tabela — `status`
 * em contracts não é o `status` em tickets. Por isso a tradução olha as duas
 * coisas, e reaproveita os rótulos de @/config/domain para a tela do Log falar
 * igual ao resto do sistema.
 */
function enumLabel(table: string, field: string, value: string): string | null {
  const pick = (m: Record<string, string>) => m[value] ?? null;

  if (field === "status") {
    if (table === "contracts") return pick(labelsOf(CONTRACT_STATUS_META));
    if (table === "quotes") return pick(labelsOf(QUOTE_STATUS_META));
    if (table === "claims") return pick(labelsOf(CLAIM_STATUS_META));
    if (table === "tickets") return pick(labelsOf(TICKET_STATUS_META));
    return pick(ENTITY_STATUS);
  }
  if (field === "subscription_status") return pick(SUBSCRIPTION_STATUS);
  if (field === "role") return pick(ROLE_LABELS as Record<string, string>);
  if (field === "priority") return pick(labelsOf(TICKET_PRIORITY_META));
  if (field === "category") return pick(labelsOf(TICKET_CATEGORY_META));
  if (field === "subject_type") return pick(labelsOf(TICKET_SUBJECT_META));
  if (field === "modality") return pick(labelsOf(EVENT_MODALITY_META));
  if (field === "channel") return pick(labelsOf(SERVICE_CHANNEL_META));
  if (field === "person_type") return pick({ individual: "Pessoa física", company: "Pessoa jurídica" });
  if (field === "plan" || field === "min_plan") {
    return pick({ starter: "Starter", professional: "Professional", enterprise: "Enterprise" });
  }
  if (field === "kind") {
    if (table === "customers") return pick({ lead: "Lead", client: "Cliente" });
    if (table === "ticket_messages") return pick({ message: "Mensagem", internal_note: "Nota interna" });
    return pick(labelsOf(TASK_BOARD_KIND_META));
  }
  if (field === "type") {
    if (table === "notifications") return pick(NOTIFICATION_TYPE);
    if (table === "calendar_events") return pick(labelsOf(CALENDAR_EVENT_META));
  }
  return null;
}

function tableLabel(table: string) {
  return TABLE_LABELS[table] ?? table;
}

const ACTION_META: Record<AuditAction, { label: string; variant: "success" | "warning" | "destructive" }> = {
  INSERT: { label: "Criado", variant: "success" },
  UPDATE: { label: "Alterado", variant: "warning" },
  DELETE: { label: "Excluído", variant: "destructive" },
};

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Colunas em centavos: 145000 no banco é R$ 1.450,00 na tela. */
const CENTS_FIELDS = new Set(["price_cents", "premium_cents", "amount_cents"]);

/** Valor cru do banco → texto legível. */
function renderValue(table: string, field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    return CENTS_FIELDS.has(field) ? formatCurrency(value / 100) : String(value);
  }
  if (typeof value === "string") {
    if (!value) return "—";
    const asEnum = enumLabel(table, field, value);
    if (asEnum) return asEnum;
    if (ISO_DATETIME.test(value)) return `${formatShortDate(value)} às ${formatTime(value)}`;
    if (ISO_DATE.test(value)) return formatShortDate(value);
    return value;
  }
  return JSON.stringify(value);
}

function truncate(text: string, max = 220) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/* ─────────────────────────────── painel ─────────────────────────────── */

interface AuditLogPanelProps {
  /** Filtro de empresa da página (uuid ou "all"). */
  companyFilter: string;
  users: User[];
  companyName: Map<string, string>;
}

export function AuditLogPanel({ companyFilter, users, companyName }: AuditLogPanelProps) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [actorId, setActorId] = React.useState("all");
  const [action, setAction] = React.useState<AuditAction | "all">("all");
  const [table, setTable] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [term, setTerm] = React.useState("");

  const [rows, setRows] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [exhausted, setExhausted] = React.useState(false);

  const [detail, setDetail] = React.useState<AuditLog | null>(null);
  const [purging, setPurging] = React.useState(false);
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const [total, setTotal] = React.useState<number | null>(null);

  // A busca livre espera o usuário parar de digitar.
  React.useEffect(() => {
    const id = window.setTimeout(() => setTerm(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const filters = React.useMemo(
    () => ({ companyId: companyFilter, from, to, actorId, action, table, search: term }),
    [companyFilter, from, to, actorId, action, table, term],
  );

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    auditService
      .list(filters)
      .then((data) => {
        if (!active) return;
        setRows(data);
        setExhausted(data.length < AUDIT_PAGE_SIZE);
      })
      .catch((e: Error) => active && toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters]);

  async function loadMore() {
    const last = rows[rows.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const next = await auditService.list({ ...filters, before: last.id });
      setRows((current) => [...current, ...next]);
      if (next.length < AUDIT_PAGE_SIZE) setExhausted(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function openPurge() {
    setPurgeOpen(true);
    setTotal(null);
    try {
      setTotal(await auditService.total());
    } catch {
      setTotal(null);
    }
  }

  async function confirmPurge() {
    setPurging(true);
    try {
      const removed = await auditService.purge();
      toast.success(`Log limpo — ${removed.toLocaleString("pt-BR")} registro(s) removido(s).`);
      setPurgeOpen(false);
      const fresh = await auditService.list(filters);
      setRows(fresh);
      setExhausted(fresh.length < AUDIT_PAGE_SIZE);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPurging(false);
    }
  }

  const userOptions = React.useMemo(
    () => [
      { value: "all", label: "Todos os usuários" },
      ...[...users]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((u) => ({ value: u.id, label: u.name, description: u.email })),
    ],
    [users],
  );

  const tableOptions = React.useMemo(
    () => [
      { value: "all", label: "Todos os módulos" },
      ...Object.entries(TABLE_LABELS)
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [],
  );

  const columns = React.useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        id: "when",
        header: "Quando",
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            {formatShortDate(row.original.created_at)}
            <span className="ml-1 text-muted-foreground">{formatTime(row.original.created_at)}</span>
          </div>
        ),
      },
      {
        id: "actor",
        header: "Quem",
        cell: ({ row }) =>
          row.original.actor_name ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.original.actor_name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.original.actor_email}</p>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sistema</span>
          ),
      },
      {
        id: "company",
        header: "Empresa",
        cell: ({ row }) => (
          <span className="truncate text-sm">
            {row.original.company_id ? (companyName.get(row.original.company_id) ?? "—") : "—"}
          </span>
        ),
      },
      {
        id: "action",
        header: "Ação",
        cell: ({ row }) => {
          const meta = ACTION_META[row.original.action];
          return <Badge variant={meta.variant}>{meta.label}</Badge>;
        },
      },
      {
        id: "where",
        header: "Onde",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{tableLabel(row.original.table_name)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.record_label ?? row.original.record_id ?? "—"}
            </p>
          </div>
        ),
      },
      {
        id: "summary",
        header: "O que mudou",
        cell: ({ row }) => {
          const fields = Object.keys(row.original.changes ?? {});
          if (!fields.length) return <span className="text-sm text-muted-foreground">—</span>;
          const shown = fields.slice(0, 3).map(fieldLabel).join(", ");
          return (
            <span className="truncate text-sm text-muted-foreground">
              {shown}
              {fields.length > 3 && ` +${fields.length - 3}`}
            </span>
          );
        },
      },
    ],
    [companyName],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">De</span>
          <Input
            type="date"
            className="w-[150px]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Até</span>
          <Input
            type="date"
            className="w-[150px]"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="w-[190px]">
          <Combobox
            options={userOptions}
            value={actorId}
            onChange={(v) => setActorId(v || "all")}
            placeholder="Todos os usuários"
            searchPlaceholder="Filtrar usuário..."
          />
        </div>
        <div className="w-[190px]">
          <Combobox
            options={tableOptions}
            value={table}
            onChange={(v) => setTable(v || "all")}
            placeholder="Todos os módulos"
            searchPlaceholder="Filtrar módulo..."
          />
        </div>
        <div className="w-[160px]">
          <Combobox
            options={[
              { value: "all", label: "Todas as ações" },
              { value: "INSERT", label: "Criado" },
              { value: "UPDATE", label: "Alterado" },
              { value: "DELETE", label: "Excluído" },
            ]}
            value={action}
            onChange={(v) => setAction((v || "all") as AuditAction | "all")}
            placeholder="Todas as ações"
            searchPlaceholder="Filtrar ação..."
          />
        </div>
        <Input
          className="w-[220px]"
          placeholder="Buscar por pessoa ou registro"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ml-auto">
          <Button variant="outline" onClick={openPurge}>
            <Eraser className="size-4" /> Limpar log
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        onRowClick={setDetail}
        emptyIcon={ScrollText}
        emptyTitle="Nenhum registro"
        emptyDescription="Nenhuma alteração no período e filtros selecionados."
        storageKey="admin-audit"
      />

      {!exhausted && rows.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} loading={loadingMore}>
            Carregar mais
          </Button>
        </div>
      )}

      <AuditDetailDialog
        log={detail}
        companyName={companyName}
        onClose={() => setDetail(null)}
      />

      <ConfirmDialog
        open={purgeOpen}
        onOpenChange={(o) => !o && setPurgeOpen(false)}
        title="Limpar log"
        description={
          total === null
            ? "Isto apaga TODOS os registros do log, de todas as empresas. Não há como desfazer."
            : `Isto apaga os ${total.toLocaleString("pt-BR")} registros do log, de todas as empresas. Não há como desfazer — e o log recomeça registrando que foi você quem limpou.`
        }
        confirmLabel="Limpar tudo"
        variant="destructive"
        loading={purging}
        onConfirm={confirmPurge}
      />
    </div>
  );
}

/* ──────────────────────────── detalhe ──────────────────────────── */

function AuditDetailDialog({
  log,
  companyName,
  onClose,
}: {
  log: AuditLog | null;
  companyName: Map<string, string>;
  onClose: () => void;
}) {
  if (!log) return null;
  const meta = ACTION_META[log.action];
  const entries = Object.entries(log.changes ?? {}) as [string, AuditChange][];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {tableLabel(log.table_name)}
            {log.record_label && (
              <span className="truncate font-normal text-muted-foreground">
                · {log.record_label}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {log.actor_name ?? "Sistema"} ·{" "}
            {`${formatShortDate(log.created_at)} às ${formatTime(log.created_at)}`}
            {log.company_id && ` · ${companyName.get(log.company_id) ?? "empresa removida"}`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem detalhes registrados.</p>
          )}
          {entries.map(([field, change]) => (
            <div key={field} className="rounded-md border px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {fieldLabel(field)}
                {change.masked && " (valor protegido)"}
              </p>
              <div className="mt-1 grid gap-1 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <span className="break-words text-muted-foreground line-through decoration-muted-foreground/40">
                  {truncate(renderValue(log.table_name, field, change.from))}
                </span>
                <span className="hidden text-muted-foreground sm:inline">→</span>
                <span className="break-words font-medium">
                  {truncate(renderValue(log.table_name, field, change.to))}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Registro: {log.table_name}
          {log.record_id && ` · ${log.record_id}`}
        </p>
      </DialogContent>
    </Dialog>
  );
}
