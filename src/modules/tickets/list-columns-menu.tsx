"use client";

import * as React from "react";
import { Check, GripVertical, Lock, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  LIST_COLUMNS,
  isLockedColumn,
  useListColumnsStore,
  type ListColumnId,
} from "@/stores/list-columns-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const LABELS: Record<ListColumnId, string> = Object.fromEntries(
  LIST_COLUMNS.map((c) => [c.id, c.label]),
) as Record<ListColumnId, string>;

export function ListColumnsMenu() {
  const { order, hidden, toggle, reorder, reset } = useListColumnsStore();
  const [dragId, setDragId] = React.useState<ListColumnId | null>(null);

  function onDrop(targetId: ListColumnId) {
    if (!dragId || dragId === targetId) return;
    if (isLockedColumn(dragId) || isLockedColumn(targetId)) return;
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    reorder(next);
    setDragId(null);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" /> Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Colunas
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Padrão
          </button>
        </div>
        <ul>
          {order.map((id) => {
            const visible = !hidden.includes(id);
            const locked = isLockedColumn(id);
            return (
              <li
                key={id}
                draggable={!locked}
                onDragStart={() => !locked && setDragId(id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(id)}
                onDragEnd={() => setDragId(null)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors",
                  !locked && "hover:bg-accent",
                  dragId === id && "opacity-50",
                )}
              >
                {locked ? (
                  <Lock className="size-3.5 text-muted-foreground/40" />
                ) : (
                  <GripVertical className="size-4 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                )}
                <button
                  onClick={() => toggle(id)}
                  disabled={locked}
                  className={cn(
                    "flex flex-1 items-center gap-2 text-left text-sm",
                    locked && "cursor-default text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      visible ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {visible && <Check className="size-3" />}
                  </span>
                  {LABELS[id]}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
