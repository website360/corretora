"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
}: {
  value: string | null | undefined;
  options: InlineOption[];
  onChange: (value: string) => Promise<void> | void;
  /** Current value display (the trigger). */
  children: React.ReactNode;
  title?: string;
  align?: "start" | "end";
  className?: string;
}) {
  const [saving, setSaving] = React.useState(false);

  async function pick(next: string) {
    if (next === value) return;
    setSaving(true);
    try {
      await onChange(next);
    } catch {
      toast.error("Não foi possível salvar a alteração.");
    } finally {
      setSaving(false);
    }
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
    </span>
  );
}
