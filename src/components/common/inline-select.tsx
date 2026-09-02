"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface InlineOption {
  value: string;
  label: React.ReactNode;
  /** Optional leading node (dot / icon / avatar). */
  leading?: React.ReactNode;
}

/** Confirmação exigida antes de aplicar uma escolha. */
export interface InlineConfirm {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  variant?: "default" | "destructive";
}

/**
 * A list-cell value that turns into a dropdown on click, persisting the change
 * inline. Stops row-click propagation so editing never opens the row.
 */
export function InlineSelect({
  value,
  options,
  onChange,
  children,
  title,
  align = "start",
  className,
  confirm,
}: {
  value: string | null | undefined;
  options: InlineOption[];
  onChange: (value: string) => Promise<void> | void;
  /** Current value display (the trigger). */
  children: React.ReactNode;
  title?: string;
  align?: "start" | "end";
  className?: string;
  /**
   * Pergunta antes de aplicar. Recebe a opção escolhida e o valor atual;
   * devolver `null` aplica direto. Existe porque a célula fica numa linha
   * clicável: sem a pergunta, um clique fora de mira altera o dado sem
   * ninguém perceber.
   */
  confirm?: (next: string, current: string | null | undefined) => InlineConfirm | null;
}) {
  const [saving, setSaving] = React.useState(false);
  const [pending, setPending] = React.useState<{ value: string; ask: InlineConfirm } | null>(null);

  async function apply(next: string) {
    setSaving(true);
    try {
      await onChange(next);
      setPending(null);
    } catch {
      toast.error("Não foi possível salvar a alteração.");
    } finally {
      setSaving(false);
    }
  }

  function pick(next: string) {
    if (next === value) return;
    const ask = confirm?.(next, value) ?? null;
    if (ask) {
      setPending({ value: next, ask });
      return;
    }
    void apply(next);
  }

  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={title ?? "Alterar"}
            disabled={saving}
            className={cn(
              "group/inline -mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent disabled:opacity-60",
              className,
            )}
          >
            {children}
            <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover/inline:text-muted-foreground/70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="max-h-72 overflow-y-auto">
          {options.map((o) => (
            <DropdownMenuItem key={o.value} onClick={() => pick(o.value)} className="gap-2">
              {o.leading}
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={pending.ask.title}
          description={pending.ask.description}
          confirmLabel={pending.ask.confirmLabel ?? "Confirmar"}
          variant={pending.ask.variant ?? "default"}
          loading={saving}
          onConfirm={() => void apply(pending.value)}
        />
      )}
    </span>
  );
}
