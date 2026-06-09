"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Headset,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { serviceRecordsService } from "@/services/service-records.service";
import { customersService } from "@/services/customers.service";
import { productsService } from "@/services/products.service";
import { usersService } from "@/services/users.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useDirectory } from "@/stores/directory-store";
import { findUser } from "@/services/lookup";
import { SERVICE_CHANNEL_META, TONE_BADGE_CLASS } from "@/config/domain";
import { formatSmartDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ServiceChannel, ServiceRecord } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { useBulkDelete } from "@/components/common/use-bulk-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { SavedFiltersBar } from "@/components/common/saved-filters-bar";
import type { PresetFilters } from "@/services/filter-presets.service";
import { UserAvatar } from "@/components/common/user-avatar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AtendimentoFormDialog } from "@/modules/service/atendimento-form-dialog";

export function AtendimentosView() {
  const router = useRouter();
  useDirectory();
  const { data, loading, refetch } = useAsyncData(() => serviceRecordsService.list());
  const bulk = useBulkDelete({
    remove: serviceRecordsService.remove,
    noun: "atendimento",
    onDone: refetch,
  });
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: products } = useAsyncData(() => productsService.list());
  const { data: users } = useAsyncData(() => usersService.list());
  const [search, setSearch] = React.useState("");
  const [channels, setChannels] = React.useState<string[]>([]);
  const [clientes, setClientes] = React.useState<string[]>([]);
  const [atendentes, setAtendentes] = React.useState<string[]>([]);
  const [produtos, setProdutos] = React.useState<string[]>([]);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ServiceRecord | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    channels.length +
    clientes.length +
    atendentes.length +
    produtos.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);
  const currentFilters = (): PresetFilters => ({
    search,
    channels,
    clientes,
    atendentes,
    produtos,
    dateFrom,
    dateTo,
  });
  const applyFilters = (f: PresetFilters) => {
    setSearch((f.search as string) ?? "");
    setChannels((f.channels as string[]) ?? []);
    setClientes((f.clientes as string[]) ?? []);
    setAtendentes((f.atendentes as string[]) ?? []);
    setProdutos((f.produtos as string[]) ?? []);
    setDateFrom((f.dateFrom as string) ?? "");
    setDateTo((f.dateTo as string) ?? "");
  };
  const clearFilters = () => {
    setSearch("");
    setChannels([]);
    setClientes([]);
    setAtendentes([]);
    setProdutos([]);
    setDateFrom("");
    setDateTo("");
  };

  const customerName = React.useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c.name || "Sem nome"])),
    [customers],
  );
  const productName = React.useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.name])),
    [products],
  );

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const from = dateFrom ? +new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? +new Date(`${dateTo}T23:59:59`) : null;
    return (data ?? []).filter((r) => {
      if (channels.length > 0 && !channels.includes(r.channel)) return false;
      if (clientes.length > 0 && !clientes.includes(r.customer_id)) return false;
      if (atendentes.length > 0 && (!r.author_id || !atendentes.includes(r.author_id))) return false;
      if (produtos.length > 0 && (!r.product_id || !produtos.includes(r.product_id))) return false;
      const t = +new Date(r.created_at);
      if (from && t < from) return false;
      if (to && t > to) return false;
      if (q) {
        const hay = `${r.notes} ${customerName.get(r.customer_id) ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, channels, clientes, atendentes, produtos, dateFrom, dateTo, customerName]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(r: ServiceRecord) {
    setEditing(r);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await serviceRecordsService.remove(deleteTarget.id);
      toast.success("Atendimento movido para a lixeira");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<ServiceRecord>[] = [
    {
      id: "channel",
      header: "Canal",
      meta: { cellClassName: "w-px" },
      cell: ({ row }) => {
        const meta = SERVICE_CHANNEL_META[row.original.channel];
        const Icon = meta.icon;
        return (
          <Badge variant="outline" className={cn("gap-1 whitespace-nowrap", TONE_BADGE_CLASS[meta.tone])}>
            <Icon className="size-3" /> {meta.label}
          </Badge>
        );
      },
    },
    {
      id: "customer",
      header: "Cliente",
      accessorFn: (row) => customerName.get(row.customer_id) ?? "",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/clientes/${row.original.customer_id}`);
          }}
          className="font-medium hover:underline"
        >
          {customerName.get(row.original.customer_id) ?? "—"}
        </button>
      ),
    },
    {
      id: "notes",
      header: "Atendimento",
      cell: ({ row }) => (
        <p className="truncate text-sm text-muted-foreground">{row.original.notes}</p>
      ),
    },
    {
      id: "product",
      header: "Produto",
      cell: ({ row }) =>
        row.original.product_id ? (
          <span className="text-sm">{productName.get(row.original.product_id) ?? "—"}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: "author",
      header: "Atendente",
      cell: ({ row }) => {
        const u = findUser(row.original.author_id);
        return u ? (
          <div className="flex items-center gap-2">
            <UserAvatar name={u.name} src={u.avatar_url} className="size-6" />
            <span className="text-sm">{u.name}</span>
          </div>
        ) : null;
      },
    },
    {
      id: "date",
      header: "Data",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatSmartDate(row.original.created_at)}
        </span>
      ),
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
        title="Atendimento"
        description="Histórico de atendimentos aos clientes, por canal."
        actions={
          <Button onClick={openNew}>
            <Plus /> Novo atendimento
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full min-w-[180px] flex-1 sm:w-auto sm:max-w-xs">
          <Input
            placeholder="Buscar por cliente ou texto..."
            startIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SavedFiltersBar
          scope="service"
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          activeCount={activeFilterCount}
          onClear={clearFilters}
          getCurrent={currentFilters}
          onApply={applyFilters}
        />
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
          <MultiSelect
            icon={<Headset className="size-4" />}
            options={(Object.keys(SERVICE_CHANNEL_META) as ServiceChannel[]).map((c) => ({
              value: c,
              label: SERVICE_CHANNEL_META[c].label,
            }))}
            values={channels}
            onChange={setChannels}
            placeholder="Todos os canais"
            searchPlaceholder="Canal..."
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
            icon={<Users className="size-4" />}
            options={(users ?? []).map((u) => ({ value: u.id, label: u.name }))}
            values={atendentes}
            onChange={setAtendentes}
            placeholder="Todos os atendentes"
            searchPlaceholder="Buscar atendente..."
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
              title="Data inicial"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[150px]"
              title="Data final"
            />
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(r) => openEdit(r)}
        emptyIcon={Headset}
        emptyTitle="Nenhum atendimento"
        emptyDescription="Registre o primeiro atendimento ao cliente."
        enableSelection
        getRowId={(r) => r.id}
        bulkActions={bulk.bulkAction}
        initialSort={[{ id: "customer", desc: false }]}
        storageKey="atendimentos"
      />

      <AtendimentoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir atendimento"
        description="O atendimento será movido para a lixeira (restaurável por 5 dias)."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
      {bulk.dialog}
    </div>
  );
}
