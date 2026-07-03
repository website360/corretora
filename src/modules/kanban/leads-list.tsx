"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  MoreHorizontal,
  SquareArrowOutUpRight,
  Trash2,
  UserSquare2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Customer } from "@/types/domain";
import { customersService } from "@/services/customers.service";
import { findUser } from "@/services/lookup";
import { formatPhone } from "@/utils/format";
import { DataTable } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/common/tag-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Tabular view of leads — mirrors the task list experience. */
export function LeadsList({
  leads,
  loading,
  tagColor,
  onOpen,
  onChanged,
}: {
  leads: Customer[];
  loading?: boolean;
  tagColor: (name: string) => string;
  /** Abre o lead (drawer rápido). Se ausente, navega para a página do lead. */
  onOpen?: (lead: Customer) => void;
  /** Chamado após excluir lead(s) para recarregar a lista. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = React.useState<Customer | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [bulkDelete, setBulkDelete] = React.useState<{ rows: Customer[]; clear: () => void } | null>(
    null,
  );
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customersService.remove(deleteTarget.id);
      toast.success("Lead movido para a lixeira");
      setDeleteTarget(null);
      onChanged?.();
    } catch {
      toast.error("Não foi possível excluir o lead");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    if (!bulkDelete) return;
    setBulkDeleting(true);
    let ok = 0;
    let fail = 0;
    for (const lead of bulkDelete.rows) {
      try {
        await customersService.remove(lead.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkDeleting(false);
    toast.success(`${ok} lead(s) movido(s) para a lixeira${fail ? `, ${fail} com erro` : ""}.`);
    bulkDelete.clear();
    setBulkDelete(null);
    onChanged?.();
  }

  const columns = React.useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Lead",
        cell: ({ row }) => (
          <span className="truncate font-medium">{row.original.name || "Sem nome"}</span>
        ),
      },
      {
        id: "contact",
        header: "Contato",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="min-w-0 text-sm">
              {c.email && <p className="truncate">{c.email}</p>}
              {c.phone && <p className="truncate text-muted-foreground">{formatPhone(c.phone)}</p>}
              {!c.email && !c.phone && <span className="text-muted-foreground">—</span>}
            </div>
          );
        },
      },
      {
        id: "owner",
        header: "Responsável",
        accessorFn: (row) => findUser(row.owner_id)?.name ?? "",
        cell: ({ row }) => {
          const owner = findUser(row.original.owner_id);
          if (!owner) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2">
              <UserAvatar name={owner.name} src={owner.avatar_url} className="size-6 shrink-0" />
              <span className="truncate text-sm">{owner.name}</span>
            </div>
          );
        },
      },
      {
        id: "next_contact",
        header: "Próximo contato",
        accessorFn: (row) => row.next_contact_at ?? "",
        cell: ({ row }) => {
          const when = row.original.next_contact_at;
          if (!when) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
              <CalendarClock className="size-3.5 text-muted-foreground" />
              {format(new Date(when), "dd MMM yyyy, HH:mm", { locale: ptBR })}
            </span>
          );
        },
      },
      {
        id: "tags",
        header: "Etiquetas",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 overflow-hidden">
            {row.original.tags.slice(0, 3).map((t) => (
              <TagBadge key={t} name={t} color={tagColor(t)} />
            ))}
            {row.original.tags.length === 0 && <span className="text-muted-foreground">—</span>}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        meta: { headClassName: "text-right pr-2", cellClassName: "pr-2" },
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" title="Ações">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}`)}>
                    <SquareArrowOutUpRight /> Abrir
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(lead)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [tagColor, router],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        onRowClick={(c) => (onOpen ? onOpen(c) : router.push(`/leads/${c.id}`))}
        emptyIcon={UserSquare2}
        emptyTitle="Nenhum lead"
        emptyDescription="Crie leads no kanban para vê-los aqui."
        initialSort={[{ id: "name", desc: false }]}
        storageKey="leads"
        autoSizeColumns={["tags"]}
        enableSelection
        getRowId={(c) => c.id}
        bulkActions={(selected, clear) => (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setBulkDelete({ rows: selected, clear })}
          >
            <Trash2 className="size-4" /> Excluir
          </Button>
        )}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir lead"
        description={
          <>
            <strong>{deleteTarget?.name || "Sem nome"}</strong> será movido para a lixeira
            (restaurável por 5 dias).
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={bulkDelete !== null}
        onOpenChange={(o) => !o && setBulkDelete(null)}
        title="Excluir leads selecionados"
        description={
          <>
            <strong>{bulkDelete?.rows.length}</strong> lead(s) serão movidos para a lixeira.
          </>
        }
        confirmLabel="Excluir selecionados"
        variant="destructive"
        loading={bulkDeleting}
        onConfirm={confirmBulkDelete}
      />
    </>
  );
}
