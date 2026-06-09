"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [100, 200, 500, 1000];

/**
 * Larguras-padrão (px) por id de coluna, para a tabela já abrir organizada
 * (título/cliente mais largos; id/ações estreitos). Só se aplica quando a
 * coluna não define `size` e o usuário ainda não a redimensionou.
 */
const COLUMN_DEFAULT_SIZE: Record<string, number> = {
  __select: 44,
  type: 60,
  id: 90,
  actions: 96,
  title: 300,
  name: 240,
  customer: 240,
  company: 220,
  notes: 280,
  contact: 210,
  link: 210,
  owner: 180,
  author: 180,
  channel: 150,
  product: 210,
  status: 130,
  priority: 140,
  role: 140,
  when: 165,
  date: 165,
  created: 150,
  signed: 150,
  validity: 175,
  deletedAt: 160,
  daysLeft: 120,
  premium: 140,
  value: 140,
  tags: 220,
  stage: 165,
  plan: 140,
  sub: 150,
  trial: 140,
  card: 150,
  phone: 150,
  job_title: 170,
  last_seen_at: 160,
};

/** Optional per-column classNames, read from `columnDef.meta`. */
export interface ColumnMeta {
  headClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  /** Enables a leading checkbox column for multi-row selection. */
  enableSelection?: boolean;
  /** Stable id per row, so selection survives sorting/re-renders. */
  getRowId?: (row: TData) => string;
  /** Renders the bulk-action bar shown while rows are selected. */
  bulkActions?: (selected: TData[], clear: () => void) => React.ReactNode;
  /** Initial sorting state (e.g. alphabetical by name). */
  initialSort?: SortingState;
  /** When set, column widths (drag-to-resize) are persisted to localStorage under this key. */
  storageKey?: string;
}

/** Reads the persisted column widths for a table, guarded for SSR. */
function loadColumnSizing(storageKey?: string): ColumnSizingState {
  if (!storageKey || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`dt-cols:${storageKey}`);
    return raw ? (JSON.parse(raw) as ColumnSizingState) : {};
  } catch {
    return {};
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  pageSize = 100,
  onRowClick,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Os dados aparecerão aqui assim que forem criados.",
  emptyIcon,
  enableSelection,
  getRowId,
  bulkActions,
  initialSort,
  storageKey,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSort ?? []);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(() =>
    loadColumnSizing(storageKey),
  );

  // Persist manually-dragged column widths so they survive reloads.
  React.useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`dt-cols:${storageKey}`, JSON.stringify(columnSizing));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [storageKey, columnSizing]);

  const selectionColumn = React.useMemo<ColumnDef<TData, TValue>>(
    () => ({
      id: "__select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Selecionar todos"
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Selecionar linha"
          />
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 44,
      meta: { headClassName: "w-px pl-3 pr-1", cellClassName: "w-px pl-3 pr-1" },
    }),
    [],
  );

  const tableColumns = React.useMemo(() => {
    // Aplica larguras-padrão sensatas (sem sobrescrever um `size` já definido).
    const sized = columns.map((c) => {
      const id = (c.id ?? (c as { accessorKey?: string }).accessorKey) as string | undefined;
      if ((c as { size?: number }).size != null || !id) return c;
      const s = COLUMN_DEFAULT_SIZE[id];
      return s != null ? { ...c, size: s } : c;
    });
    return enableSelection ? [selectionColumn, ...sized] : sized;
  }, [enableSelection, selectionColumn, columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, rowSelection, columnSizing },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    enableRowSelection: enableSelection,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const clearSelection = React.useCallback(() => setRowSelection({}), []);

  const gridRef = React.useRef<HTMLDivElement>(null);

  /**
   * Auto-ajusta a largura de uma coluna ao seu conteúdo (duplo-clique no
   * divisor, como no Excel). Mede o conteúdo REAL de cada célula clonando-a
   * fora da tela sem truncamento, pega o maior e fixa essa largura.
   */
  const autoFitColumn = React.useCallback(
    (columnId: string) => {
      const root = gridRef.current;
      if (!root) return;
      const cells = root.querySelectorAll<HTMLElement>(
        `[data-col-id="${CSS.escape(columnId)}"]`,
      );
      if (cells.length === 0) return;

      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;left:-99999px;top:-99999px;visibility:hidden;white-space:nowrap;";
      document.body.appendChild(probe);

      let max = 0;
      cells.forEach((cell) => {
        const clone = cell.cloneNode(true) as HTMLElement;
        clone.style.width = "auto";
        clone.style.maxWidth = "none";
        clone.style.display = "inline-block";
        clone.style.whiteSpace = "nowrap";
        // Remove o clamp/truncamento de qualquer descendente para medir tudo.
        clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
          el.style.maxWidth = "none";
          el.style.overflow = "visible";
          el.style.whiteSpace = "nowrap";
          el.style.textOverflow = "clip";
        });
        // Ignora a alça de redimensionar (que vive dentro do cabeçalho).
        clone.querySelectorAll<HTMLElement>('[role="separator"]').forEach((el) => el.remove());
        probe.appendChild(clone);
        max = Math.max(max, clone.scrollWidth);
        probe.removeChild(clone);
      });

      document.body.removeChild(probe);
      // +2px de folga; limites sãos para não estourar o layout.
      const next = Math.min(Math.max(Math.ceil(max) + 2, 56), 640);
      setColumnSizing((s) => ({ ...s, [columnId]: next }));
    },
    [],
  );

  if (loading) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      {enableSelection && bulkActions && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedRows.length} selecionado(s)
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {bulkActions(selectedRows, clearSelection)}
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="size-4" /> Limpar
            </Button>
          </div>
        </div>
      )}

      <div ref={gridRef} className="overflow-hidden rounded-xl border bg-card">
        {/* table-layout fixed → cada coluna tem EXATAMENTE a largura definida
            (resize individual, sem redistribuir entre as outras). */}
        <Table style={{ width: table.getTotalSize(), tableLayout: "fixed" }}>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const canResize = header.column.getCanResize();
                  const meta = header.column.columnDef.meta as ColumnMeta | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      data-col-id={header.column.id}
                      className={cn("relative overflow-hidden", meta?.headClassName)}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="inline-flex items-center gap-1.5 uppercase transition-colors hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <ArrowUpDown className="size-3" />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                      {canResize && (
                        <span
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            autoFitColumn(header.column.id);
                          }}
                          title="Arraste para redimensionar · duplo-clique para ajustar ao conteúdo"
                          role="separator"
                          aria-orientation="vertical"
                          className={cn(
                            "absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none",
                            "after:absolute after:right-0 after:top-1/2 after:h-1/2 after:w-px after:-translate-y-1/2 after:bg-border",
                            "hover:after:w-0.5 hover:after:bg-primary",
                            header.column.getIsResizing() && "after:w-0.5 after:bg-primary",
                          )}
                        />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
                  return (
                    <TableCell
                      key={cell.id}
                      data-col-id={cell.column.id}
                      className={cn("truncate whitespace-nowrap", meta?.cellClassName)}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Itens por página</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[84px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="hidden sm:inline">· {data.length} registros</span>
        </div>

        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Próxima <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
