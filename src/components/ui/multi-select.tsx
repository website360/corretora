"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { rankByLabel } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  /** When set, shows a top item for "all". */
  allLabel?: string;
  /** "clear": all = empty selection. "selectAll": all = every option checked. */
  allMode?: "clear" | "selectAll";
}

/** Searchable multi-select; empty selection reads as the placeholder. */
export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = "Todas",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  icon,
  className,
  triggerClassName,
  allLabel,
  allMode = "clear",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ranked = React.useMemo(() => rankByLabel(options, search), [options, search]);

  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  // "clear" → empty means all; "selectAll" → the All item checks every option.
  const allSelected =
    allMode === "selectAll" && options.length > 0 && values.length === options.length;
  const allActive = allMode === "selectAll" ? allSelected : values.length === 0;
  const onAll = () => onChange(allMode === "selectAll" ? options.map((o) => o.value) : []);

  const label =
    values.length === 0
      ? placeholder
      : allSelected
        ? (allLabel ?? placeholder)
        : values.length === 1
          ? (options.find((o) => o.value === values[0])?.label ?? "1 selecionado")
          : `${values.length} selecionados`;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-9 justify-between gap-2 font-normal", triggerClassName)}
        >
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground [&_svg]:size-4">
            {icon}
            <span className={cn("truncate", values.length > 0 && "text-foreground")}>{label}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-60 p-0", className)} align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allLabel && !search.trim() && (
                <CommandItem value={`__all ${allLabel}`} onSelect={onAll}>
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      allActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {allActive && <Check className="size-3" />}
                  </span>
                  <span className="font-medium">{allLabel}</span>
                </CommandItem>
              )}
              {ranked.map((o) => {
                const checked = values.includes(o.value);
                return (
                  <CommandItem key={o.value} value={o.value} onSelect={() => toggle(o.value)}>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate">{o.label}</p>
                      {o.description && (
                        <p className="truncate text-xs text-muted-foreground">{o.description}</p>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {values.length > 0 && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs text-muted-foreground"
                onClick={() => onChange([])}
              >
                Limpar seleção
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
