"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Link2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { carriersService } from "@/services/carriers.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { InlineSelect } from "@/components/common/inline-select";
import type { Carrier } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { useBulkDelete } from "@/components/common/use-bulk-delete";
import { CarrierLogo } from "@/components/common/carrier-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CarrierFormDialog } from "@/modules/catalog/carrier-form-dialog";

export function CarriersView() {
  const router = useRouter();
  const { data, loading, refetch } = useAsyncData(() => carriersService.list());
  const bulk = useBulkDelete({
    remove: carriersService.remove,
    noun: "seguradora",
    onDone: refetch,
    feminine: true,
  });
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Carrier | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Carrier | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = data ?? [];
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.cnpj ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Carrier) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await carriersService.remove(deleteTarget.id);
      toast.success("Seguradora movida para a lixeira");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<Carrier>[] = [
    {
      accessorKey: "name",
      header: "Seguradora",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <CarrierLogo src={c.logo_url} />
            <p className="truncate font-medium">{c.name}</p>
            {c.is_system && (
              <Badge
                variant="secondary"
                className="gap-1 text-muted-foreground"
                title="Seguradora padrão do sistema. Para uma diferente, crie a sua."
              >
                <Lock className="size-3" /> Padrão
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "links",
      header: "Links",
      cell: ({ row }) => {
        const n = row.original.links?.length ?? 0;
        return n > 0 ? (
          <Badge variant="secondary" className="gap-1">
            <Link2 className="size-3" /> {n}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusBadge =
          row.original.status === "active" ? (
            <Badge variant="success">Ativa</Badge>
          ) : (
            <Badge variant="secondary">Inativa</Badge>
          );
        if (row.original.is_system) return statusBadge;
        return (
          <InlineSelect
            value={row.original.status}
            options={[
              { value: "active", label: "Ativa" },
              { value: "inactive", label: "Inativa" },
            ]}
            title="Trocar status"
            onChange={async (v) => {
              await carriersService.update(row.original.id, { status: v as Carrier["status"] });
              refetch();
            }}
          >
            {statusBadge}
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
              <DropdownMenuItem onClick={() => router.push(`/companhias/${row.original.id}`)}>
                <SquareArrowOutUpRight /> Abrir
              </DropdownMenuItem>
              {!row.original.is_system && (
                <>
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Seguradoras"
        description="Seguradoras parceiras da sua corretora."
        actions={
          <Button onClick={openNew}>
            <Plus /> Nova seguradora
          </Button>
        }
      />

      <div className="w-full max-w-sm">
        <Input
          placeholder="Buscar por nome, CNPJ ou e-mail..."
          startIcon={<Search />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(c) => router.push(`/companhias/${c.id}`)}
        emptyIcon={ShieldCheck}
        emptyTitle="Nenhuma seguradora"
        emptyDescription="Cadastre as seguradoras com quem você trabalha."
        enableSelection
        getRowId={(c) => c.id}
        bulkActions={bulk.bulkAction}
        initialSort={[{ id: "name", desc: false }]}
        storageKey="carriers"
      />

      <CarrierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        carrier={editing}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir seguradora"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> será movida para a lixeira (restaurável por 5
            dias).
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
      {bulk.dialog}
    </div>
  );
}
