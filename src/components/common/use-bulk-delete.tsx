"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface UseBulkDeleteOptions<T> {
  /** Permanently or soft removes a single row by id. */
  remove: (id: string) => Promise<void>;
  /** Singular noun, e.g. "contrato". The plural just appends "(s)". */
  noun: string;
  /** Refetch the list after the batch finishes. */
  onDone: () => void;
  /** Gender for the verb agreement: "movido(a)". Defaults to masculine. */
  feminine?: boolean;
}

/**
 * Shared "delete selected" behaviour for any DataTable with `enableSelection`.
 * Returns the bulk-action button render-prop and the confirmation dialog.
 */
export function useBulkDelete<T extends { id: string }>({
  remove,
  noun,
  onDone,
  feminine,
}: UseBulkDeleteOptions<T>) {
  const [target, setTarget] = React.useState<{ rows: T[]; clear: () => void } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const moved = feminine ? "movida(s)" : "movido(s)";

  async function confirm() {
    if (!target) return;
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const row of target.rows) {
      try {
        await remove(row.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setBusy(false);
    toast.success(`${ok} ${noun}(s) ${moved} para a lixeira${fail ? `, ${fail} com erro` : ""}.`);
    target.clear();
    setTarget(null);
    onDone();
  }

  const bulkAction = (selected: T[], clear: () => void) => (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={() => setTarget({ rows: selected, clear })}
    >
      <Trash2 className="size-4" /> Excluir
    </Button>
  );

  const dialog = (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(o) => !o && setTarget(null)}
      title="Excluir selecionados"
      description={
        <>
          <strong>{target?.rows.length}</strong> {noun}(s) serão movidos para a lixeira.
        </>
      }
      confirmLabel="Excluir selecionados"
      variant="destructive"
      loading={busy}
      onConfirm={confirm}
    />
  );

  return { bulkAction, dialog };
}
