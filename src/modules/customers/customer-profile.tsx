"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileText,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Pencil,
  StickyNote,
  Tag as TagIcon,
  Trash2,
  User as UserIcon,
  UserCheck,
  Users,
} from "lucide-react";
import { customersService } from "@/services/customers.service";
import { tagsService } from "@/services/tags.service";
import { contractsService } from "@/services/contracts.service";
import { claimsService } from "@/services/claims.service";
import { productsService } from "@/services/products.service";
import { serviceRecordsService } from "@/services/service-records.service";
import { ticketsService } from "@/services/tickets.service";
import { quotesService } from "@/services/quotes.service";
import { calendarService } from "@/services/calendar.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory } from "@/stores/directory-store";
import { findUser } from "@/services/lookup";
import { formatCurrency, formatDocument, formatPhone, formatShortDate, formatSmartDate } from "@/utils/format";
import {
  CALENDAR_EVENT_META,
  CLAIM_STATUS_META,
  CONTRACT_STATUS_META,
  QUOTE_STATUS_META,
  SERVICE_CHANNEL_META,
  TICKET_CATEGORY_META,
  TICKET_STATUS_META,
  TONE_BADGE_CLASS,
  TONE_TEXT_CLASS,
} from "@/config/domain";
import { cn } from "@/lib/utils";
import type { Contract, StageColor } from "@/types/domain";
import { ContractFormDialog } from "@/modules/catalog/contract-form-dialog";
import { ClaimFormDialog } from "@/modules/claims/claim-form-dialog";
import { describeTicketLog, ticketLogIcon } from "@/modules/tickets/ticket-log-format";
import { AtendimentoChat } from "@/modules/service/atendimento-chat";
import { Calculator, ClipboardList, Headset, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/common/tag-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { CustomerFormDialog } from "@/modules/customers/customer-form-dialog";
import { CustomerPortalCard } from "@/modules/customers/customer-portal-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

const VALID_TABS = ["geral", "contratos", "sinistros", "atendimentos", "historico"] as const;

const INTERACTION_ICON = {
  note: StickyNote,
  call: PhoneCall,
  email: Mail,
  meeting: Users,
  ticket: FileText,
  policy: FileText,
} as const;

export function CustomerProfile({ id }: { id: string }) {
  useDirectory();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: customer, loading, refetch } = useAsyncData(() => customersService.get(id), [id]);
  const { data: tags } = useAsyncData(() => tagsService.list("customers"));
  const [editOpen, setEditOpen] = React.useState(false);
  const [converting, setConverting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const isLead = customer?.kind === "lead";
  const basePath = isLead ? "/leads" : "/clientes";

  // Deep-link para uma aba específica (ex.: ?tab=atendimentos vindo do kanban).
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && (VALID_TABS as readonly string[]).includes(tabParam) ? tabParam : "geral";

  async function confirmDelete() {
    if (!customer) return;
    setDeleting(true);
    try {
      await customersService.remove(customer.id);
      toast.success(`${isLead ? "Lead" : "Contato"} movido para a lixeira`);
      router.replace(isLead ? "/kanban" : "/clientes");
    } catch {
      toast.error("Não foi possível excluir.");
      setDeleting(false);
    }
  }

  // Lead é lead, contato é contato: mantém a URL coerente com o tipo do registro.
  React.useEffect(() => {
    if (!customer) return;
    if (isLead && pathname?.startsWith("/clientes/")) router.replace(`/leads/${id}`);
    else if (!isLead && pathname?.startsWith("/leads/")) router.replace(`/clientes/${id}`);
  }, [customer, isLead, pathname, id, router]);

  async function convertToClient() {
    if (!customer) return;
    setConverting(true);
    try {
      await customersService.update(customer.id, {
        kind: "client",
        board_id: null,
        column_id: null,
      });
      toast.success(`${customer.name || "Lead"} virou um cliente`);
      router.replace(`/clientes/${customer.id}`);
      refetch();
    } catch {
      toast.error("Não foi possível converter o lead.");
    } finally {
      setConverting(false);
    }
  }

  const tagColor = React.useMemo(() => {
    const map = new Map<string, string>((tags ?? []).map((t) => [t.name, t.color]));
    return (name: string): string => map.get(name) ?? "neutral";
  }, [tags]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-9 w-full max-w-md" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <EmptyState title="Contato não encontrado" description="O contato pode ter sido removido." />
      </div>
    );
  }

  const isCompany = customer.person_type === "company";
  const owner = findUser(customer.owner_id);
  const addr = customer.address;
  const hasAddress = !!addr && (addr.street || addr.city || addr.zip);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="mt-2 shrink-0 text-muted-foreground"
          >
            <Link href={isLead ? "/kanban" : "/clientes"} aria-label="Voltar">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{customer.name || "Sem nome"}</h1>
            {customer.document && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isCompany ? "Razão social: " : ""}
                {formatDocument(customer.document)}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {customer.kind === "client" ? (
                <Badge variant="success">Cliente</Badge>
              ) : (
                <Badge variant="warning">Lead</Badge>
              )}
              <Badge variant="warning">{isCompany ? "Pessoa Jurídica" : "Pessoa Física"}</Badge>
              {customer.status === "active" ? (
                <Badge variant="secondary">Ativo</Badge>
              ) : (
                <Badge variant="outline">Inativo</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isLead && (
            <Button variant="outline" onClick={convertToClient} loading={converting}>
              <UserCheck /> Converter em cliente
            </Button>
          )}
          <Button onClick={() => setEditOpen(true)}>
            <Pencil /> {isLead ? "Editar lead" : "Editar contato"}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 /> {isLead ? "Excluir lead" : "Excluir contato"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          {!isLead && (
            <TabsTrigger value="contratos">
              <FileText className="size-4" /> Contratos
            </TabsTrigger>
          )}
          {!isLead && (
            <TabsTrigger value="sinistros">
              <ShieldAlert className="size-4" /> Sinistros
            </TabsTrigger>
          )}
          <TabsTrigger value="atendimentos">
            <Headset className="size-4" /> Atendimentos
          </TabsTrigger>
          <TabsTrigger value="historico">
            <CalendarClock className="size-4" /> Atividades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Informações de Contato">
              <Field icon={Mail} label="E-mail" value={customer.email} />
              <Field
                icon={Phone}
                label="Telefone"
                value={customer.phone ? formatPhone(customer.phone) : ""}
              />
              <Field
                icon={Users}
                label="Responsável"
                value={
                  owner ? (
                    <span className="flex items-center gap-2">
                      <UserAvatar name={owner.name} src={owner.avatar_url} className="size-6" />
                      {owner.name}
                    </span>
                  ) : null
                }
              />
              <EmptyHint
                show={!customer.email && !customer.phone && !owner}
                text="Nenhuma informação de contato."
              />
            </SectionCard>

            <SectionCard title={isCompany ? "Dados da Empresa" : "Dados Pessoais"}>
              <Field
                icon={isCompany ? Building2 : UserIcon}
                label={isCompany ? "Nome da Empresa" : "Nome completo"}
                value={customer.name}
              />
              <Field
                icon={FileText}
                label={isCompany ? "CNPJ" : "CPF"}
                value={customer.document ? formatDocument(customer.document) : ""}
              />
              <Field
                icon={TagIcon}
                label="Etiquetas"
                value={
                  customer.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((t) => (
                        <TagBadge key={t} name={t} color={tagColor(t)} />
                      ))}
                    </div>
                  ) : null
                }
              />
            </SectionCard>
          </div>

          {hasAddress && (
            <SectionCard title="Endereço">
              <Field
                icon={MapPin}
                label="Localização"
                value={
                  <span className="leading-relaxed">
                    {[addr!.street, addr!.number].filter(Boolean).join(", ")}
                    {addr!.complement ? ` - ${addr!.complement}` : ""}
                    <br />
                    <span className="text-muted-foreground">
                      {[addr!.district, [addr!.city, addr!.state].filter(Boolean).join(" - ")]
                        .filter(Boolean)
                        .join(", ")}
                      {addr!.zip ? ` · CEP: ${addr!.zip}` : ""}
                    </span>
                  </span>
                }
              />
            </SectionCard>
          )}

          {customer.notes && (
            <SectionCard title="Observações">
              <div className="px-5 py-4 text-sm text-muted-foreground">{customer.notes}</div>
            </SectionCard>
          )}

          {customer.kind === "client" && (
            <CustomerPortalCard customer={customer} onChange={refetch} />
          )}
        </TabsContent>

        <TabsContent value="contratos">
          <ContractsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="sinistros">
          <ClaimsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="atendimentos">
          <ServiceTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="historico">
          <ActivityTimeline customerId={customer.id} />
        </TabsContent>
      </Tabs>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={() => refetch()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={isLead ? "Excluir lead" : "Excluir contato"}
        description={
          <>
            <strong>{customer.name || "Sem nome"}</strong> será movido para a lixeira (restaurável
            por 5 dias).
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ContractsTab({ customerId }: { customerId: string }) {
  const { data, loading, refetch } = useAsyncData(
    () => contractsService.listByCustomer(customerId),
    [customerId],
  );
  const { data: products } = useAsyncData(() => productsService.list());
  const productName = React.useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.name])),
    [products],
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contract | null>(null);

  const contracts = data ?? [];

  return (
    <SectionCard
      title="Contratos do cliente"
      action={
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus /> Novo contrato
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={FileText}
            title="Sem contratos"
            description="Este cliente ainda não tem apólices cadastradas."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {contracts.map((c) => {
            const meta = CONTRACT_STATUS_META[c.status];
            return (
              <li
                key={c.id}
                className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                onClick={() => {
                  setEditing(c);
                  setDialogOpen(true);
                }}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {c.product_id ? (productName.get(c.product_id) ?? "Produto") : "Contrato"}
                    {c.policy_number ? ` · Apólice ${c.policy_number}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.starts_at ? formatShortDate(c.starts_at) : "?"}
                    {c.ends_at ? ` → ${formatShortDate(c.ends_at)}` : ""}
                    {c.premium_cents ? ` · ${formatCurrency(c.premium_cents / 100)}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
                  {meta.label}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={editing}
        defaultCustomerId={customerId}
        lockCustomer
        onSaved={refetch}
      />
    </SectionCard>
  );
}

function ClaimsTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data, loading, refetch } = useAsyncData(
    () => claimsService.listByCustomer(customerId),
    [customerId],
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const claims = data ?? [];

  return (
    <SectionCard
      title="Sinistros do cliente"
      action={
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus /> Novo sinistro
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={ShieldAlert}
            title="Sem sinistros"
            description="Este cliente ainda não tem sinistros registrados."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {claims.map((c) => {
            const meta = CLAIM_STATUS_META[c.status];
            return (
              <li
                key={c.id}
                className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                onClick={() => router.push(`/sinistros/${c.id}`)}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldAlert className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    #{c.number} · {c.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.occurred_at ? formatShortDate(c.occurred_at) : "Sem data"}
                    {c.amount_cents ? ` · ${formatCurrency(c.amount_cents / 100)}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
                  {meta.label}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <ClaimFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        claim={null}
        defaultCustomerId={customerId}
        lockCustomer
        onSaved={refetch}
      />
    </SectionCard>
  );
}

function ServiceTab({ customerId }: { customerId: string }) {
  const { data, loading, refetch } = useAsyncData(
    () => serviceRecordsService.listByCustomer(customerId),
    [customerId],
  );
  const { data: contracts } = useAsyncData(
    () => contractsService.listByCustomer(customerId),
    [customerId],
  );
  const { data: products } = useAsyncData(() => productsService.list());

  const contractLabelFor = React.useCallback(
    (c: Contract) => {
      const prod = c.product_id ? (products ?? []).find((p) => p.id === c.product_id)?.name : null;
      return c.policy_number ? `Apólice ${c.policy_number}` : (prod ?? "Contrato");
    },
    [products],
  );
  const contractOptions = (contracts ?? []).map((c) => ({ value: c.id, label: contractLabelFor(c) }));
  const contractLabel = (id: string) => {
    const c = (contracts ?? []).find((x) => x.id === id);
    return c ? contractLabelFor(c) : null;
  };

  return (
    <AtendimentoChat
      records={data ?? []}
      loading={loading}
      contractOptions={contractOptions}
      contractLabel={contractLabel}
      onSend={async ({ channel, notes, contract_id, mentions }) => {
        const contract = (contracts ?? []).find((c) => c.id === contract_id);
        await serviceRecordsService.create({
          customer_id: customerId,
          contract_id,
          product_id: contract?.product_id ?? null,
          channel,
          notes,
          mentions,
        });
        refetch();
      }}
    />
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </Card>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function EmptyHint({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return <p className="px-5 py-4 text-sm text-muted-foreground">{text}</p>;
}

type Tone = keyof typeof TONE_BADGE_CLASS;

interface ActivityItem {
  id: string;
  /** ISO date used for chronological sorting (creation moment). */
  date: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  /** Category label shown as a chip (Tarefa, Contrato, etc.). */
  kind: string;
  title: string;
  description?: string | null;
  authorId?: string | null;
  badge?: { label: string; tone: Tone } | null;
  href?: string | null;
}

const ACTIVITY_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "Interação", label: "Interações" },
  { key: "Tarefa", label: "Tarefas" },
  { key: "Atendimento", label: "Atendimentos" },
  { key: "Contrato", label: "Contratos" },
  { key: "Orçamento", label: "Orçamentos" },
  { key: "Evento", label: "Eventos" },
  { key: "Alteração", label: "Alterações" },
];

/**
 * Timeline unificada do cliente: agrega TUDO que foi criado/relacionado a ele —
 * interações, tarefas, atendimentos, contratos, orçamentos e eventos de agenda —
 * num único feed ordenado do mais recente para o mais antigo.
 */
function ActivityTimeline({ customerId }: { customerId: string }) {
  const { data: interactions } = useAsyncData(
    () => customersService.interactions(customerId),
    [customerId],
  );
  const { data: tickets } = useAsyncData(
    () => ticketsService.listByCustomer(customerId),
    [customerId],
  );
  const { data: contracts } = useAsyncData(
    () => contractsService.listByCustomer(customerId),
    [customerId],
  );
  const { data: quotes } = useAsyncData(
    () => quotesService.listByCustomer(customerId),
    [customerId],
  );
  const { data: services } = useAsyncData(
    () => serviceRecordsService.listByCustomer(customerId),
    [customerId],
  );
  const { data: events } = useAsyncData(
    () => calendarService.listByCustomer(customerId),
    [customerId],
  );
  const { data: ticketLogs } = useAsyncData(
    () => ticketsService.logsByCustomer(customerId),
    [customerId],
  );
  const { data: products } = useAsyncData(() => productsService.list());
  const [filter, setFilter] = React.useState("all");

  const productName = React.useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.name])),
    [products],
  );
  const ticketById = React.useMemo(
    () => new Map((tickets ?? []).map((t) => [t.id, t])),
    [tickets],
  );

  const loading =
    !interactions || !tickets || !contracts || !quotes || !services || !events || !ticketLogs;

  const items = React.useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = [];
    for (const i of interactions ?? []) {
      out.push({
        id: `int-${i.id}`,
        date: i.created_at,
        icon: INTERACTION_ICON[i.type],
        tone: "primary",
        kind: "Interação",
        title: i.title,
        description: i.description,
        authorId: i.author_id,
      });
    }
    for (const t of tickets ?? []) {
      const meta = TICKET_STATUS_META[t.status];
      out.push({
        id: `tk-${t.id}`,
        date: t.created_at,
        icon: ClipboardList,
        tone: meta.tone,
        kind: "Tarefa",
        title: `#${t.number} · ${t.title}`,
        description: TICKET_CATEGORY_META[t.category]?.label ?? null,
        authorId: t.created_by,
        badge: { label: meta.label, tone: meta.tone },
        href: `/tickets/${t.id}`,
      });
    }
    for (const c of contracts ?? []) {
      const meta = CONTRACT_STATUS_META[c.status];
      const prod = c.product_id ? productName.get(c.product_id) : null;
      out.push({
        id: `ct-${c.id}`,
        date: c.created_at,
        icon: FileText,
        tone: meta.tone,
        kind: "Contrato",
        title: `${prod ?? "Contrato"}${c.policy_number ? ` · Apólice ${c.policy_number}` : ""}`,
        description: c.premium_cents ? formatCurrency(c.premium_cents / 100) : null,
        authorId: c.owner_id,
        badge: { label: meta.label, tone: meta.tone },
        href: `/contratos/${c.id}`,
      });
    }
    for (const q of quotes ?? []) {
      const meta = QUOTE_STATUS_META[q.status];
      out.push({
        id: `qt-${q.id}`,
        date: q.created_at,
        icon: Calculator,
        tone: meta.tone,
        kind: "Orçamento",
        title: `Orçamento #${q.number}${q.title ? ` · ${q.title}` : ""}`,
        authorId: q.created_by,
        badge: { label: meta.label, tone: meta.tone },
        href: `/orcamentos`,
      });
    }
    for (const s of services ?? []) {
      const meta = SERVICE_CHANNEL_META[s.channel];
      out.push({
        id: `sv-${s.id}`,
        date: s.created_at,
        icon: meta.icon,
        tone: meta.tone,
        kind: "Atendimento",
        title: `Atendimento · ${meta.label}`,
        description: s.notes,
        authorId: s.author_id,
      });
    }
    for (const e of events ?? []) {
      const meta = CALENDAR_EVENT_META[e.type];
      out.push({
        id: `ev-${e.id}`,
        date: e.created_at,
        icon: meta.icon,
        tone: meta.tone,
        kind: "Evento",
        title: e.title,
        description: `${meta.label} · ${formatSmartDate(e.starts_at)}`,
        authorId: e.created_by ?? e.owner_id,
        badge: { label: meta.label, tone: meta.tone },
        href: `/agenda`,
      });
    }
    // Histórico granular de alterações das tarefas (quem mudou o quê). "created"
    // já vira um item "Tarefa"; comentários são conversa interna — ambos fora.
    for (const l of ticketLogs ?? []) {
      if (l.event === "created" || l.event === "comment" || l.event === "comment_deleted") {
        continue;
      }
      const tk = ticketById.get(l.ticket_id);
      out.push({
        id: `log-${l.id}`,
        date: l.created_at,
        icon: ticketLogIcon(l.event),
        tone: "neutral",
        kind: "Alteração",
        title: `${tk ? `#${tk.number} ` : ""}${describeTicketLog(l.event, l.meta ?? {})}`,
        description: tk?.title ?? null,
        authorId: l.actor_id,
        href: `/tickets/${l.ticket_id}`,
      });
    }
    return out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [interactions, tickets, contracts, quotes, services, events, ticketLogs, ticketById, productName]);

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  return (
    <SectionCard title={`Atividades${items.length ? ` (${items.length})` : ""}`}>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_FILTERS.map((f) => {
            const count =
              f.key === "all" ? items.length : items.filter((i) => i.kind === f.key).length;
            if (f.key !== "all" && count === 0) return null;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {f.label}
                {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nada por aqui"
            description="As atividades deste cliente aparecerão aqui."
          />
        ) : (
          <ol className="relative space-y-5">
            <span className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-border" />
            {filtered.map((item) => {
              const Icon = item.icon;
              const author = findUser(item.authorId);
              const content = (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.kind}
                    </span>
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.badge && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", TONE_BADGE_CLASS[item.badge.tone])}
                      >
                        {item.badge.label}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {author?.name ? `${author.name} · ` : ""}
                    {formatSmartDate(item.date)}
                  </p>
                </>
              );
              return (
                <li key={item.id} className="relative flex gap-4">
                  <span
                    className={cn(
                      "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card",
                      TONE_TEXT_CLASS[item.tone],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-muted/40"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </SectionCard>
  );
}
