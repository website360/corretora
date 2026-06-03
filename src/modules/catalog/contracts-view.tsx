"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  SquareArrowOutUpRight,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { contractsService } from "@/services/contracts.service";
import { customersService } from "@/services/customers.service";
import { productsService } from "@/services/products.service";
import { carriersService } from "@/services/carriers.service";
import { usersService } from "@/services/users.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { InlineSelect } from "@/components/common/inline-select";
import { CONTRACT_STATUS_META, TONE_BADGE_CLASS } from "@/config/domain";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Contract, ContractStatus } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { useBulkDelete } from "@/components/common/use-bulk-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContractFormDialog } from "@/modules/catalog/contract-form-dialog";

export function ContractsView() {
  const router = useRouter();
  const { data, loading, refetch } = useAsyncData(() => contractsService.list());
  const bulk = useBulkDelete({ remove: contractsService.remove, noun: "contrato", onDone: refetch });
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: carriers } = useAsyncData(() => carriersService.list());
  const { data: users } = useAsyncData(() => usersService.list());
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [clientes, setClientes] = React.useState<string[]>([]);
  const [produtos, setProdutos] = React.useState<string[]>([]);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [valorMin, setValorMin] = React.useState("");
  const [valorMax, setValorMax] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Contract | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const customerName = React.useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c.name || "Sem nome"])),
    [customers],
  );
  const productName = React.useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.name])),
    [products],
  );
  const carrierName = React.useMemo(
    () => new Map((carriers ?? []).map((c) => [c.id, c.name])),
    [carriers],
  );
  const userName = React.useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u.name])),
    [users],
  );

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const from = dateFrom ? +new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? +new Date(`${dateTo}T23:59:59`) : null;
    const min = valorMin ? parseFloat(valorMin.replace(",", ".")) * 100 : null;
    const max = valorMax ? parseFloat(valorMax.replace(",", ".")) * 100 : null;
    return (data ?? []).filter((c) => {
      if (statuses.length > 0 && !statuses.includes(c.status)) return false;
      if (clientes.length > 0 && !clientes.includes(c.customer_id)) return false;
      if (produtos.length > 0 && (!c.product_id || !produtos.includes(c.product_id))) return false;
      // Período pela vigência de início.
      if (from || to) {
        if (!c.starts_at) return false;
        const t = +new Date(c.starts_at);
        if (from && t < from) return false;
        if (to && t > to) return false;
      }
      if (min != null && c.premium_cents < min) return false;
      if (max != null && c.premium_cents > max) return false;
      if (q) {
        const hay = `${c.policy_number ?? ""} ${customerName.get(c.customer_id) ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statuses, clientes, produtos, dateFrom, dateTo, valorMin, valorMax, customerName]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Contract) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await contractsService.remove(deleteTarget.id);
      toast.success("Contrato movido para a lixeira");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<Contract>[] = [
    {
      id: "customer",
      header: "Cliente",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/clientes/${c.customer_id}`);
            }}
            className="flex items-center gap-3 text-left hover:underline"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{customerName.get(c.customer_id) ?? "—"}</p>
              {c.policy_number && (
                <p className="truncate text-xs text-muted-foreground">
                  Apólice {c.policy_number}
                </p>
              )}
            </div>
          </button>
        );
      },
    },
    {
      id: "product",
      header: "Produto / Seguradora",
      cell: ({ row }) => {
        const c = row.original;
        const prod = c.product_id ? productName.get(c.product_id) : null;
        const carr = c.carrier_id ? carrierName.get(c.carrier_id) : null;
        return (
          <div className="text-sm">
            <p>{prod ?? "—"}</p>
            {carr && <p className="text-xs text-muted-foreground">{carr}</p>}
          </div>
        );
      },
    },
    {
      id: "validity",
      header: "Vigência",
      cell: ({ row }) => {
        const c = row.original;
        if (!c.starts_at && !c.ends_at) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {c.starts_at ? formatShortDate(c.starts_at) : "?"} →{" "}
            {c.ends_at ? formatShortDate(c.ends_at) : "?"}
          </span>
        );
      },
    },
    {
      id: "premium",
      header: "Prêmio",
      cell: ({ row }) =>
        row.original.premium_cents ? (
          <span className="whitespace-nowrap font-medium">
            {formatCurrency(row.original.premium_cents / 100)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "owner",
      header: "Responsável",
      cell: ({ row }) => {
        const name = row.original.owner_id ? userName.get(row.original.owner_id) : null;
        return (
          <InlineSelect
            value={row.original.owner_id ?? ""}
            options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
            title="Trocar responsável"
            onChange={async (v) => {
              await contractsService.update(row.original.id, { owner_id: v });
              refetch();
            }}
          >
            {name ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <User className="size-3.5 text-muted-foreground" /> {name}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Atribuir</span>
            )}
          </InlineSelect>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = CONTRACT_STATUS_META[row.original.status];
        return (
          <InlineSelect
            value={row.original.status}
            options={Object.entries(CONTRACT_STATUS_META).map(([value, m]) => ({
              value,
              label: m.label,
            }))}
            title="Trocar status"
            onChange={async (v) => {
              await contractsService.update(row.original.id, { status: v as Contract["status"] });
              refetch();
            }}
          >
            <Badge variant="outline" className={cn(TONE_BADGE_CLASS[meta.tone])}>
              {meta.label}
            </Badge>
          </InlineSelect>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Ações">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/contratos/${row.original.id}`)}>
                <SquareArrowOutUpRight /> Abrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Contratos"
        description="Apólices dos clientes vinculadas a produtos e seguradoras."
        actions={
          <Button onClick={openNew}>
            <Plus /> Novo contrato
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Buscar por cliente ou apólice..."
            startIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <MultiSelect
          icon={<FileText className="size-4" />}
          options={(Object.keys(CONTRACT_STATUS_META) as ContractStatus[]).map((s) => ({
            value: s,
            label: CONTRACT_STATUS_META[s].label,
          }))}
          values={statuses}
          onChange={setStatuses}
          placeholder="Todos os status"
          searchPlaceholder="Status..."
          allLabel="Todos"
        />
        <MultiSelect
          icon={<User className="size-4" />}
          options={(customers ?? []).map((c) => ({ value: c.id, label: c.name || "Sem nome" }))}
          values={clientes}
          onChange={setClientes}
          placeholder="Todos os clientes"
          searchPlaceholder="Buscar cliente..."
          allLabel="Todos"
        />
        <MultiSelect
          icon={<Package className="size-4" />}
          options={(products ?? []).map((p) => ({ value: p.id, label: p.name }))}
          values={produtos}
          onChange={setProdutos}
          placeholder="Todos os produtos"
          searchPlaceholder="Buscar produto..."
          allLabel="Todos"
        />
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[150px]"
            title="Vigência — data inicial"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-[150px]"
            title="Vigência — data final"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            inputMode="decimal"
            placeholder="R$ mín"
            value={valorMin}
            onChange={(e) => setValorMin(e.target.value)}
            className="h-9 w-[110px]"
            title="Prêmio mínimo"
          />
          <span className="text-sm text-muted-foreground">–</span>
          <Input
            inputMode="decimal"
            placeholder="R$ máx"
            value={valorMax}
            onChange={(e) => setValorMax(e.target.value)}
            className="h-9 w-[110px]"
            title="Prêmio máximo"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(c) => router.push(`/contratos/${c.id}`)}
        emptyIcon={FileText}
        emptyTitle="Nenhum contrato"
        emptyDescription="Cadastre as apólices dos seus clientes."
        enableSelection
        getRowId={(c) => c.id}
        bulkActions={bulk.bulkAction}
      />

      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={editing}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir contrato"
        description="O contrato será movido para a lixeira (restaurável por 5 dias)."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
      {bulk.dialog}
    </div>
  );
}
