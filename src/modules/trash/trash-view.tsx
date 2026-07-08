"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarDays,
  FileText,
  Headset,
  ListChecks,
  MoreHorizontal,
  Package,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserSquare2,
} from "lucide-react";
import { toast } from "sonner";
import { trashService, type TrashItem, type TrashType } from "@/services/trash.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useSession } from "@/contexts/session-context";
import { formatSmartDate } from "@/utils/format";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_META: Record<
  TrashType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  task: { label: "Tarefa", icon: ListChecks },
  event: { label: "Evento", icon: CalendarDays },
  contact: { label: "Contato", icon: UserSquare2 },
  carrier: { label: "Seguradora", icon: ShieldCheck },
  product: { label: "Produto", icon: Package },
  contract: { label: "Contrato", icon: FileText },
  service: { label: "Atendimento", icon: Headset },
  claim: { label: "Sinistro", icon: ShieldAlert },
};

export function TrashView() {
  const { can } = useSession();
  const isAdmin = can(["admin", "super_admin"]);
  const { data, loading, refetch } = useAsyncData(() => trashService.list());
  const [busy, setBusy] = React.useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = React.useState<TrashItem | null>(null);
  const [purgeAllOpen, setPurgeAllOpen] = React.useState(false);
  const [purgingAll, setPurgingAll] = React.useState(false);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkPurge, setBulkPurge] = React.useState<{
    rows: TrashItem[];
    clear: () => void;
  } | null>(null);

  async function bulkRestore(rows: TrashItem[], clear: () => void) {
    setBulkBusy(true);
    let ok = 0;
    for (const item of rows) {
      try {
        await trashService.restore(item.type, item.id);
        ok++;
      } catch {
        /* ignore individual failures */
      }
    }
    setBulkBusy(false);
    toast.success(`${ok} item(ns) restaurado(s)`);
    clear();
    refetch();
  }

  async function confirmBulkPurge() {
    if (!bulkPurge) return;
    setBulkBusy(true);
    let ok = 0;
    for (const item of bulkPurge.rows) {
      try {
        await trashService.purge(item.type, item.id);
        ok++;
      } catch {
        /* ignore individual failures */
      }
    }
    setBulkBusy(false);
    toast.success(`${ok} item(ns) excluído(s) permanentemente`);
    bulkPurge.clear();
    setBulkPurge(null);
    refetch();
  }

  const restore = React.useCallback(
    async (item: TrashItem) => {
      setBusy(item.id);
      try {
        await trashService.restore(item.type, item.id);
        toast.success(`${TYPE_META[item.type].label} restaurado(a)`);
        refetch();
      } catch {
        toast.error("Não foi possível restaurar");
      } finally {
        setBusy(null);
      }
    },
    [refetch],
  );

  async function confirmPurge() {
    if (!purgeTarget) return;
    setBusy(purgeTarget.id);
    try {
      await trashService.purge(purgeTarget.type, purgeTarget.id);
      toast.success("Excluído permanentemente");
      setPurgeTarget(null);
      refetch();
    } catch {
      toast.error("Não foi possível excluir");
    } finally {
      setBusy(null);
    }
  }

  async function confirmPurgeAll() {
    setPurgingAll(true);
    try {
      await trashService.purgeAll();
      toast.success("Lixeira esvaziada");
      setPurgeAllOpen(false);
      refetch();
    } catch {
      toast.error("Não foi possível limpar a lixeira");
    } finally {
      setPurgingAll(false);
    }
  }

  const columns: ColumnDef<TrashItem>[] = [
    {
      id: "type",
      header: "Tipo",
      meta: { cellClassName: "w-px pr-1", headClassName: "pr-1" },
      cell: ({ row }) => {
        const meta = TYPE_META[row.original.type];
        const Icon = meta.icon;
        return (
          <span
            title={meta.label}
            className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Icon className="size-4" />
          </span>
        );
      },
    },
    {
      id: "title",
      header: "Item",
      accessorFn: (row) => row.title ?? "",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{row.original.title}</span>
          {row.original.code && (
            <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>
          )}
        </div>
      ),
    },
    {
      id: "deletedAt",
      header: "Excluído",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatSmartDate(row.original.deletedAt)}
        </span>
      ),
    },
    {
      id: "daysLeft",
      header: "Expira em",
      cell: ({ row }) => {
        const d = row.original.daysLeft;
        return (
          <Badge variant={d <= 1 ? "warning" : "secondary"} className="whitespace-nowrap">
            {d === 0 ? "Hoje" : `${d} ${d === 1 ? "dia" : "dias"}`}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" title="Ações" loading={busy === item.id}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => restore(item)}>
                  <RotateCcw /> Restaurar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setPurgeTarget(item)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 /> Excluir definitivamente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  if (!isAdmin) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Trash2}
          title="Acesso restrito"
          description="Apenas administradores podem acessar a lixeira."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Lixeira"
        description="Itens excluídos ficam aqui por 5 dias antes de serem removidos definitivamente."
        actions={
          (data ?? []).length > 0 ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setPurgeAllOpen(true)}
            >
              <Trash2 /> Limpar lixeira
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        emptyIcon={Trash2}
        emptyTitle="Lixeira vazia"
        emptyDescription="Nada foi excluído recentemente."
        initialSort={[{ id: "title", desc: false }]}
        storageKey="trash"
        enableSelection
        getRowId={(r) => `${r.type}:${r.id}`}
        bulkActions={(selected, clear) => (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkRestore(selected, clear)}
              loading={bulkBusy}
            >
              <RotateCcw className="size-4" /> Restaurar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setBulkPurge({ rows: selected, clear })}
            >
              <Trash2 className="size-4" /> Excluir
            </Button>
          </>
        )}
      />

      <ConfirmDialog
        open={purgeTarget !== null}
        onOpenChange={(o) => !o && setPurgeTarget(null)}
        title="Excluir definitivamente"
        description={
          <>
            <strong>{purgeTarget?.title}</strong> será removido permanentemente e não poderá ser
            recuperado.
          </>
        }
        confirmLabel="Excluir para sempre"
        variant="destructive"
        loading={busy === purgeTarget?.id}
        onConfirm={confirmPurge}
      />

      <ConfirmDialog
        open={purgeAllOpen}
        onOpenChange={(o) => !o && setPurgeAllOpen(false)}
        title="Limpar lixeira"
        description={
          <>
            Todos os <strong>{(data ?? []).length}</strong> item(ns) da lixeira serão removidos
            permanentemente de uma vez e não poderão ser recuperados.
          </>
        }
        confirmLabel="Limpar tudo"
        variant="destructive"
        loading={purgingAll}
        onConfirm={confirmPurgeAll}
      />

      <ConfirmDialog
        open={bulkPurge !== null}
        onOpenChange={(o) => !o && setBulkPurge(null)}
        title="Excluir definitivamente"
        description={
          <>
            <strong>{bulkPurge?.rows.length}</strong> item(ns) selecionado(s) serão removidos
            permanentemente e não poderão ser recuperados.
          </>
        }
        confirmLabel="Excluir para sempre"
        variant="destructive"
        loading={bulkBusy}
        onConfirm={confirmBulkPurge}
      />
    </div>
  );
}
