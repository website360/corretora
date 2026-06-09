"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Lock, MoreHorizontal, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { productsService } from "@/services/products.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { InlineSelect } from "@/components/common/inline-select";
import type { Product } from "@/types/domain";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { useBulkDelete } from "@/components/common/use-bulk-delete";
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
import { ProductFormDialog } from "@/modules/catalog/product-form-dialog";

export function ProductsView({ embedded = false }: { embedded?: boolean } = {}) {
  const { data, loading, refetch } = useAsyncData(() => productsService.list());
  const bulk = useBulkDelete({ remove: productsService.remove, noun: "produto", onDone: refetch });
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [data, search]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productsService.remove(deleteTarget.id);
      toast.success("Produto movido para a lixeira");
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Produto",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-4" />
          </span>
          <span className="truncate font-medium">{row.original.name}</span>
          {row.original.is_system && (
            <Badge
              variant="secondary"
              className="gap-1 text-muted-foreground"
              title="Produto padrão do sistema. Para um diferente, crie o seu."
            >
              <Lock className="size-3" /> Padrão
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusBadge =
          row.original.status === "active" ? (
            <Badge variant="success">Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          );
        if (row.original.is_system) return statusBadge;
        return (
          <InlineSelect
            value={row.original.status}
            options={[
              { value: "active", label: "Ativo" },
              { value: "inactive", label: "Inativo" },
            ]}
            title="Trocar status"
            onChange={async (v) => {
              await productsService.update(row.original.id, { status: v as Product["status"] });
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
      cell: ({ row }) =>
        row.original.is_system ? null : (
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
    <div className={embedded ? "space-y-4" : "space-y-6 p-4 lg:p-6"}>
      {embedded ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Produtos</h2>
            <p className="text-sm text-muted-foreground">
              Produtos de seguro oferecidos pela corretora.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus /> Novo produto
          </Button>
        </div>
      ) : (
        <PageHeader
          title="Produtos"
          description="Produtos de seguro oferecidos pela corretora."
          actions={
            <Button onClick={openNew}>
              <Plus /> Novo produto
            </Button>
          }
        />
      )}

      <div className="w-full max-w-xs">
        <Input
          placeholder="Buscar produto..."
          startIcon={<Search />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(p) => openEdit(p)}
        emptyIcon={Package}
        emptyTitle="Nenhum produto"
        emptyDescription="Cadastre os produtos que a corretora oferece."
        enableSelection
        getRowId={(p) => p.id}
        bulkActions={bulk.bulkAction}
        initialSort={[{ id: "name", desc: false }]}
        storageKey="products"
      />

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir produto"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> será movido para a lixeira (restaurável por 5
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
