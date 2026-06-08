"use client";

import * as React from "react";
import Link from "next/link";
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
  User as UserIcon,
  Users,
} from "lucide-react";
import { customersService } from "@/services/customers.service";
import { tagsService } from "@/services/tags.service";
import { contractsService } from "@/services/contracts.service";
import { productsService } from "@/services/products.service";
import { serviceRecordsService } from "@/services/service-records.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory } from "@/stores/directory-store";
import { findUser } from "@/services/lookup";
import { formatCurrency, formatDocument, formatPhone, formatShortDate, formatSmartDate } from "@/utils/format";
import { CONTRACT_STATUS_META, TONE_BADGE_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import type { Contract, CustomerInteraction, StageColor } from "@/types/domain";
import { ContractFormDialog } from "@/modules/catalog/contract-form-dialog";
import { AtendimentoChat } from "@/modules/service/atendimento-chat";
import { Headset, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/common/user-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { CustomerFormDialog } from "@/modules/customers/customer-form-dialog";

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
  const { data: customer, loading, refetch } = useAsyncData(() => customersService.get(id), [id]);
  const { data: interactions } = useAsyncData(() => customersService.interactions(id), [id]);
  const { data: tags } = useAsyncData(() => tagsService.list("customers"));
  const [editOpen, setEditOpen] = React.useState(false);

  const tagColor = React.useMemo(() => {
    const map = new Map<string, StageColor>((tags ?? []).map((t) => [t.name, t.color]));
    return (name: string): StageColor => map.get(name) ?? "neutral";
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
            <Link href="/clientes" aria-label="Voltar">
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

        <Button onClick={() => setEditOpen(true)} className="shrink-0">
          <Pencil /> Editar contato
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="contratos">
            <FileText className="size-4" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="atendimentos">
            <Headset className="size-4" /> Atendimentos
          </TabsTrigger>
          <TabsTrigger value="historico">
            <CalendarClock className="size-4" /> Histórico
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
                        <Badge
                          key={t}
                          variant="outline"
                          className={cn("capitalize", TONE_BADGE_CLASS[tagColor(t)])}
                        >
                          {t}
                        </Badge>
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
        </TabsContent>

        <TabsContent value="contratos">
          <ContractsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="atendimentos">
          <ServiceTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="historico">
          <SectionCard title="Histórico de interações">
            <div className="p-5">
              <Timeline items={interactions ?? []} />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={() => refetch()}
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

function Timeline({ items }: { items: CustomerInteraction[] }) {
  if (items.length === 0) {
    return <EmptyState title="Sem histórico" description="As interações aparecerão aqui." />;
  }
  return (
    <ol className="relative space-y-6">
      <span className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-border" />
      {items.map((item) => {
        const Icon = INTERACTION_ICON[item.type];
        const author = findUser(item.author_id);
        return (
          <li key={item.id} className="relative flex gap-4">
            <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
              <Icon className="size-4" />
            </span>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground/70">
                {author?.name} · {formatSmartDate(item.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
