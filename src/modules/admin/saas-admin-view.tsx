"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  CreditCard,
  Gauge,
  MoreHorizontal,
  Power,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/contexts/session-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { companiesService } from "@/services/companies.service";
import { usersService } from "@/services/users.service";
import { plansService } from "@/services/plans.service";
import { adminService } from "@/services/admin.service";
import { PLAN_MODULES } from "@/config/domain";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { ROLE_LABELS, type Company, type Plan, type SubscriptionStatus, type User } from "@/types/domain";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { DefaultCatalogPanel } from "@/modules/admin/default-catalog-panel";
import { SystemSettingsPanel } from "@/modules/admin/system-settings-panel";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tab = "overview" | "companies" | "users" | "plans" | "payments" | "catalog" | "system";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "companies", label: "Empresas" },
  { id: "users", label: "Usuários" },
  { id: "plans", label: "Planos & Valores" },
  { id: "payments", label: "Pagamentos" },
  { id: "catalog", label: "Catálogo padrão" },
  { id: "system", label: "Sistema" },
];

const SUB_META: Record<SubscriptionStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  trialing: { label: "Em teste", variant: "warning" },
  active: { label: "Ativa", variant: "success" },
  past_due: { label: "Inadimplente", variant: "destructive" },
  canceled: { label: "Cancelada", variant: "secondary" },
};

function SubBadge({ status }: { status: SubscriptionStatus }) {
  const m = SUB_META[status] ?? SUB_META.canceled;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function SaasAdminView() {
  const { can } = useSession();
  const [tab, setTab] = React.useState<Tab>("overview");

  const { data: companies, loading, refetch: refetchCompanies } = useAsyncData(() =>
    companiesService.list(),
  );
  const { data: users, refetch: refetchUsers } = useAsyncData(() => usersService.listAll());
  const { data: plans, refetch: refetchPlans } = useAsyncData(() => plansService.listAll());

  const [delCompany, setDelCompany] = React.useState<Company | null>(null);
  const [delUser, setDelUser] = React.useState<User | null>(null);
  const [delCard, setDelCard] = React.useState<Company | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function companyAction(
    c: Company,
    action: "activate" | "deactivate" | "delete" | "remove_card",
  ) {
    setBusy(true);
    try {
      await adminService.companyAction(c.id, action);
      toast.success(
        action === "delete"
          ? "Empresa e todos os dados removidos"
          : action === "remove_card"
            ? "Cartão removido"
            : "Empresa atualizada",
      );
      setDelCompany(null);
      setDelCard(null);
      refetchCompanies();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function userAction(u: User, action: "activate" | "deactivate" | "delete") {
    setBusy(true);
    try {
      await adminService.userAction(u.id, action);
      toast.success(action === "delete" ? "Usuário removido" : "Usuário atualizado");
      setDelUser(null);
      refetchUsers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const planById = React.useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);
  const companyName = React.useMemo(
    () => new Map((companies ?? []).map((c) => [c.id, c.trade_name])),
    [companies],
  );
  const planPrice = React.useCallback(
    (c: Company) => (c.plan_id ? (planById.get(c.plan_id)?.price_cents ?? 0) : 0),
    [planById],
  );

  if (!can(["super_admin"])) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          description="Este painel é exclusivo para o administrador do SaaS."
        />
      </div>
    );
  }

  const list = companies ?? [];
  const activeSubs = list.filter((c) => c.subscription_status === "active");
  const trialing = list.filter((c) => c.subscription_status === "trialing");
  const pastDue = list.filter((c) => c.subscription_status === "past_due");
  const mrr = activeSubs.reduce((s, c) => s + planPrice(c), 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6">
      <PageHeader title="Painel SaaS" description="Administração da plataforma — empresas, usuários, planos e pagamentos." />

      <div className="inline-flex w-fit flex-wrap items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={Building2} label="Empresas" value={String(list.length)} />
              <MetricCard icon={Gauge} label="Assinaturas ativas" value={String(activeSubs.length)} />
              <MetricCard icon={Users} label="Em teste" value={String(trialing.length)} />
              <MetricCard
                icon={CreditCard}
                label="MRR estimado"
                value={formatCurrency(mrr / 100)}
                hint={pastDue.length ? `${pastDue.length} inadimplente(s)` : undefined}
              />
            </div>
            <Card className="overflow-hidden">
              <div className="border-b px-5 py-3 text-sm font-semibold">Receita por plano (assinaturas ativas)</div>
              <div className="divide-y divide-border/60">
                {(plans ?? [])
                  .filter((p) => p.active)
                  .map((p) => {
                    const count = activeSubs.filter((c) => c.plan_id === p.id).length;
                    return (
                      <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">
                          {count} × {formatCurrency(p.price_cents / 100)} ={" "}
                          <strong className="text-foreground">
                            {formatCurrency((count * p.price_cents) / 100)}
                          </strong>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        )}

        {tab === "companies" && (
          <DataTable
            columns={companyColumns(planById, {
              onToggle: (c) => companyAction(c, c.status === "active" ? "deactivate" : "activate"),
              onDelete: setDelCompany,
            })}
            data={list}
            loading={loading}
            emptyIcon={Building2}
            emptyTitle="Nenhuma empresa"
            emptyDescription="As corretoras cadastradas aparecem aqui."
            initialSort={[{ id: "name", desc: false }]}
            storageKey="admin-companies"
          />
        )}

        {tab === "users" && (
          <DataTable
            columns={userColumns(companyName, {
              onToggle: (u) => userAction(u, u.status === "active" ? "deactivate" : "activate"),
              onDelete: setDelUser,
            })}
            data={users ?? []}
            emptyIcon={Users}
            emptyTitle="Nenhum usuário"
            emptyDescription="Usuários de todas as empresas aparecem aqui."
            initialSort={[{ id: "name", desc: false }]}
            storageKey="admin-users"
          />
        )}

        {tab === "plans" && (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {(plans ?? []).map((p) => (
              <PlanEditor key={p.id} plan={p} onSaved={refetchPlans} />
            ))}
          </div>
        )}

        {tab === "payments" && (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Visão por empresa (plano, valor e situação). As cobranças detalhadas ficam no Asaas.
            </p>
            <DataTable
              columns={paymentColumns(planById, { onRemoveCard: setDelCard })}
              data={list}
              loading={loading}
              emptyIcon={CreditCard}
              emptyTitle="Sem dados"
              emptyDescription="Nenhuma empresa/assinatura ainda."
              initialSort={[{ id: "name", desc: false }]}
              storageKey="admin-payments"
            />
          </>
        )}

        {tab === "catalog" && <DefaultCatalogPanel />}

        {tab === "system" && <SystemSettingsPanel />}
      </div>

      <ConfirmDialog
        open={Boolean(delCompany)}
        onOpenChange={(o) => !o && setDelCompany(null)}
        title="Excluir empresa"
        description={`Isto remove DEFINITIVAMENTE "${delCompany?.trade_name}" e TODOS os seus dados (usuários, clientes, contratos, orçamentos, tarefas...) do banco. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir tudo"
        variant="destructive"
        loading={busy}
        onConfirm={() => delCompany && companyAction(delCompany, "delete")}
      />
      <ConfirmDialog
        open={Boolean(delUser)}
        onOpenChange={(o) => !o && setDelUser(null)}
        title="Excluir usuário"
        description={`O usuário "${delUser?.name}" será removido do sistema e do login. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        loading={busy}
        onConfirm={() => delUser && userAction(delUser, "delete")}
      />
      <ConfirmDialog
        open={Boolean(delCard)}
        onOpenChange={(o) => !o && setDelCard(null)}
        title="Remover cartão"
        description={`Remove o cartão cadastrado de "${delCard?.trade_name}". As cobranças automáticas podem falhar até um novo cartão ser informado.`}
        confirmLabel="Remover cartão"
        variant="destructive"
        loading={busy}
        onConfirm={() => delCard && companyAction(delCard, "remove_card")}
      />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-destructive">{hint}</p>}
    </Card>
  );
}

/* ─────────────────────────────── columns ─────────────────────────────── */

function companyColumns(
  planById: Map<string, Plan>,
  handlers: { onToggle: (c: Company) => void; onDelete: (c: Company) => void },
): ColumnDef<Company>[] {
  return [
    {
      id: "name",
      header: "Empresa",
      accessorFn: (row) => row.trade_name ?? "",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.trade_name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.cnpj}</p>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Plano",
      cell: ({ row }) => {
        const p = row.original.plan_id ? planById.get(row.original.plan_id) : null;
        return <span className="text-sm capitalize">{p?.name ?? row.original.plan}</span>;
      },
    },
    {
      id: "sub",
      header: "Assinatura",
      cell: ({ row }) => <SubBadge status={row.original.subscription_status} />,
    },
    {
      id: "trial",
      header: "Trial até",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.original.trial_ends_at ? formatShortDate(row.original.trial_ends_at) : "—"}
        </span>
      ),
    },
    {
      id: "card",
      header: "Cartão",
      cell: ({ row }) =>
        row.original.card_last4 ? (
          <span className="whitespace-nowrap text-sm">
            {row.original.card_brand} •••• {row.original.card_last4}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "created",
      header: "Criada em",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatShortDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
      cell: ({ row }) => (
        <RowActions
          active={row.original.status === "active"}
          onToggle={() => handlers.onToggle(row.original)}
          onDelete={() => handlers.onDelete(row.original)}
          deleteLabel="Excluir (todos os dados)"
        />
      ),
    },
  ];
}

function userColumns(
  companyName: Map<string, string>,
  handlers: { onToggle: (u: User) => void; onDelete: (u: User) => void },
): ColumnDef<User>[] {
  return [
    {
      id: "name",
      header: "Usuário",
      accessorFn: (row) => row.name ?? "",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      id: "company",
      header: "Empresa",
      cell: ({ row }) => (
        <span className="truncate text-sm">{companyName.get(row.original.company_id) ?? "—"}</span>
      ),
    },
    {
      id: "role",
      header: "Função",
      cell: ({ row }) => <Badge variant="secondary">{ROLE_LABELS[row.original.role]}</Badge>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "active" ? (
          <Badge variant="success">Ativo</Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        ),
    },
    {
      id: "actions",
      header: "Ações",
      meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
      cell: ({ row }) => (
        <RowActions
          active={row.original.status === "active"}
          onToggle={() => handlers.onToggle(row.original)}
          onDelete={() => handlers.onDelete(row.original)}
          deleteLabel="Excluir usuário"
        />
      ),
    },
  ];
}

function RowActions({
  active,
  onToggle,
  onDelete,
  deleteLabel,
}: {
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" title="Ações">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onToggle}>
            <Power /> {active ? "Desativar" : "Ativar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 /> {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function paymentColumns(
  planById: Map<string, Plan>,
  handlers: { onRemoveCard: (c: Company) => void },
): ColumnDef<Company>[] {
  return [
    {
      id: "name",
      header: "Empresa",
      accessorFn: (row) => row.trade_name ?? "",
      cell: ({ row }) => <span className="truncate font-medium">{row.original.trade_name}</span>,
    },
    {
      id: "plan",
      header: "Plano",
      cell: ({ row }) => {
        const p = row.original.plan_id ? planById.get(row.original.plan_id) : null;
        return <span className="text-sm">{p?.name ?? row.original.plan}</span>;
      },
    },
    {
      id: "value",
      header: "Valor/mês",
      cell: ({ row }) => {
        const p = row.original.plan_id ? planById.get(row.original.plan_id) : null;
        return (
          <span className="whitespace-nowrap font-medium">
            {p ? formatCurrency(p.price_cents / 100) : "—"}
          </span>
        );
      },
    },
    {
      id: "sub",
      header: "Situação",
      cell: ({ row }) => <SubBadge status={row.original.subscription_status} />,
    },
    {
      id: "card",
      header: "Cartão",
      cell: ({ row }) =>
        row.original.card_last4 ? (
          <span className="whitespace-nowrap text-sm">
            {row.original.card_brand} •••• {row.original.card_last4}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "Ações",
      meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={!row.original.card_last4}
            onClick={() => handlers.onRemoveCard(row.original)}
          >
            <Trash2 className="size-4" /> Remover cartão
          </Button>
        </div>
      ),
    },
  ];
}

/* ─────────────────────────────── plan editor ─────────────────────────── */

function PlanEditor({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const [name, setName] = React.useState(plan.name);
  const [price, setPrice] = React.useState((plan.price_cents / 100).toString());
  const [maxUsers, setMaxUsers] = React.useState(plan.max_users?.toString() ?? "");
  const [maxContacts, setMaxContacts] = React.useState(plan.max_contacts?.toString() ?? "");
  const [active, setActive] = React.useState(plan.active);
  const [highlight, setHighlight] = React.useState(plan.highlight);
  const [modules, setModules] = React.useState<string[]>(plan.modules ?? []);
  const [saving, setSaving] = React.useState(false);

  const toggleModule = (key: string) =>
    setModules((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));

  async function save() {
    setSaving(true);
    try {
      await plansService.update(plan.id, {
        name,
        price_cents: price ? Math.round(parseFloat(price.replace(",", ".")) * 100) : 0,
        max_users: maxUsers ? parseInt(maxUsers, 10) : null,
        max_contacts: maxContacts ? parseInt(maxContacts, 10) : null,
        active,
        highlight,
        modules,
      });
      toast.success("Plano salvo");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-[60%] font-semibold" />
        <span className="text-xs uppercase text-muted-foreground">{plan.code}</span>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Preço mensal (R$)</Label>
        <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Máx. usuários</Label>
          <Input
            inputMode="numeric"
            placeholder="∞"
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Máx. contatos</Label>
          <Input
            inputMode="numeric"
            placeholder="∞"
            value={maxContacts}
            onChange={(e) => setMaxContacts(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <span className="text-sm">Ativo</span>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <span className="text-sm">Destaque (“mais popular”)</span>
        <Switch checked={highlight} onCheckedChange={setHighlight} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Módulos disponíveis</Label>
        <div className="flex flex-wrap gap-1.5">
          {PLAN_MODULES.map((m) => {
            const on = modules.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleModule(m.key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      <Button onClick={save} loading={saving} className="w-full">
        Salvar
      </Button>
    </Card>
  );
}
