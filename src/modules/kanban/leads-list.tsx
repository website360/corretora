"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, UserSquare2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import type { Customer, StageColor } from "@/types/domain";
import { findUser } from "@/services/lookup";
import { formatPhone } from "@/utils/format";
import { TONE_BADGE_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/user-avatar";

/** Tabular view of leads — mirrors the task list experience. */
export function LeadsList({
  leads,
  loading,
  tagColor,
}: {
  leads: Customer[];
  loading?: boolean;
  tagColor: (name: string) => StageColor;
}) {
  const router = useRouter();

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
          <div className="flex flex-wrap gap-1">
            {row.original.tags.slice(0, 3).map((t) => (
              <Badge
                key={t}
                variant="outline"
                className={cn("capitalize", TONE_BADGE_CLASS[tagColor(t)])}
              >
                {t}
              </Badge>
            ))}
            {row.original.tags.length === 0 && <span className="text-muted-foreground">—</span>}
          </div>
        ),
      },
    ],
    [tagColor],
  );

  return (
    <DataTable
      columns={columns}
      data={leads}
      loading={loading}
      onRowClick={(c) => router.push(`/clientes/${c.id}`)}
      emptyIcon={UserSquare2}
      emptyTitle="Nenhum lead"
      emptyDescription="Crie leads no kanban para vê-los aqui."
      initialSort={[{ id: "name", desc: false }]}
      storageKey="leads"
    />
  );
}
