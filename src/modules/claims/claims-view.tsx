"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { claimsService } from "@/services/claims.service";
import { customersService } from "@/services/customers.service";
import { contractsService } from "@/services/contracts.service";
import { usersService } from "@/services/users.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { InlineSelect } from "@/components/common/inline-select";
import { CLAIM_STATUS_META, CLAIM_STATUS_ORDER, TONE_BADGE_CLASS } from "@/config/domain";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Claim, ClaimStatus } from "@/types/domain";
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
import { ClaimFormDialog } from "@/modules/claims/claim-form-dialog";

export function ClaimsView() {
  const router = useRouter();
  const { data, loading, refetch } = useAsyncData(() => claimsService.list());
  const bulk = useBulkDelete({ remove: claimsService.remove, noun: "sinistro", onDone: refetch });
  const { data: customers } = useAsyncData(() => customersService.list());
  const { data: contracts } = useAsyncData(() => contractsService.list());
  const { data: users } = useAsyncData(() => usersService.list());
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Claim | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Claim | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const customerName = React.useMemo(
    () => new Map((customers ?? []).map((c) => [c.id, c.name || "Sem nome"])),
    [customers],
  );
  const contractLabel = React.useMemo(
    () =>
      new Map(
        (contracts ?? []).map((c) => [
          c.id,
          c.policy_number ? `Apólice ${c.policy_number}` : "Contrato",
        ]),
      ),
    [contracts],
  );
  const userName = React.useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u.name])),
    [users],
  );

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data ?? []).filter((c) => {
      if (statuses.length > 0 && !statuses.includes(c.status)) return false;
      if (q) {
        const hay = `#${c.number} ${c.title} ${customerName.get(c.customer_id) ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statuses, customerName]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Claim) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await claimsService.remove(deleteTarget.id);
      toast.success("Sinistro movido para a lixeira");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<Claim>[] = [
    {
      id: "claim",
      header: "Sinistro",
      accessorFn: (row) => customerName.get(row.customer_id) ?? "",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/clientes/${c.customer_id}?tab=sinistros`);
            }}
            className="flex items-center gap-3 text-left hover:underline"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldAlert className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{c.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                #{c.number} · {customerName.get(c.customer_id) ?? "—"}
              </p>
            </div>
          </button>
        );
      },
    },
    {
      id: "contract",
      header: "Apólice",
      cell: ({ row }) => {
        const c = row.original;
        return c.contract_id ? (
          <span className="text-sm">{contractLabel.get(c.contract_id) ?? "Contrato"}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "occurred",
      header: "Ocorrência",
      cell: ({ row }) =>
        row.original.occurred_at ? (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatShortDate(row.original.occurred_at)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "amount",
      header: "Valor",
      cell: ({ row }) =>
        row.original.amount_cents ? (
          <span className="whitespace-nowrap font-medium">
            {formatCurrency(row.original.amount_cents / 100)}
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
              await claimsService.update(row.original.id, { owner_id: v });
              refetch();
            }}
          >
            {name ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
                <User className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{name}</span>
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
        const meta = CLAIM_STATUS_META[row.original.status];
        return (
          <InlineSelect
            value={row.original.status}
            options={CLAIM_STATUS_ORDER.map((value) => ({
              value,
              label: CLAIM_STATUS_META[value].label,
            }))}
            title="Trocar status"
            onChange={async (v) => {
              await claimsService.update(row.original.id, { status: v as ClaimStatus });
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
        title="Sinistros"
        description="Solicitações e acompanhamento de sinistros dos clientes."
        actions={
          <Button onClick={openNew}>
            <Plus /> Novo sinistro
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full min-w-[180px] flex-1 sm:w-auto sm:max-w-xs">
          <Input
            placeholder="Buscar por título, nº ou cliente..."
            startIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <MultiSelect
          icon={<ShieldAlert className="size-4" />}
          options={CLAIM_STATUS_ORDER.map((s) => ({ value: s, label: CLAIM_STATUS_META[s].label }))}
          values={statuses}
          onChange={setStatuses}
          placeholder="Todos os status"
          searchPlaceholder="Status..."
          allLabel="Todos"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(c) => openEdit(c)}
        emptyIcon={ShieldAlert}
        emptyTitle="Nenhum sinistro"
        emptyDescription="Os sinistros solicitados e registrados aparecerão aqui."
        enableSelection
        getRowId={(c) => c.id}
        bulkActions={bulk.bulkAction}
        storageKey="claims"
      />

      <ClaimFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        claim={editing}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir sinistro"
        description="O sinistro será movido para a lixeira (restaurável por 5 dias)."
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
      {bulk.dialog}
    </div>
  );
}
