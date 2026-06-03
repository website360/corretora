"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Inline multi-select for tags (etiquetas). Toggles in a draft and persists
 * once the dropdown closes. Stops row-click propagation.
 */
export function InlineTags({
  value,
  options,
  onChange,
  children,
  title,
  align = "start",
}: {
  value: string[];
  options: string[];
  onChange: (tags: string[]) => Promise<void> | void;
  children: React.ReactNode;
  title?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>(value);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  function toggle(name: string) {
    setDraft((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  }

  async function commit(next: boolean) {
    setOpen(next);
    if (next) return;
    if (JSON.stringify([...draft].sort()) === JSON.stringify([...value].sort())) return;
    try {
      await onChange(draft);
    } catch {
      toast.error("Não foi possível salvar as etiquetas.");
    }
  }

  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <DropdownMenu open={open} onOpenChange={commit}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={title ?? "Editar etiquetas"}
            className="group/inline -mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent"
          >
            {children}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="max-h-72 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Nenhuma etiqueta. Crie em Configurações → Etiquetas.
            </p>
          ) : (
            options.map((name) => (
              <DropdownMenuCheckboxItem
                key={name}
                checked={draft.includes(name)}
                onCheckedChange={() => toggle(name)}
                onSelect={(e) => e.preventDefault()}
                className={cn("capitalize")}
              >
                {name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
