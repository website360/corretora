"use client";

import * as React from "react";
import { TagBadge } from "@/components/common/tag-badge";
import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Lista de etiquetas em espaço apertado (tabela, card): mostra a primeira com
 * o nome inteiro e resume as demais num "+N". O restante aparece ao passar o
 * mouse OU ao clicar — o clique existe por causa do celular, onde não há hover.
 *
 * Em telas de detalhe (perfil, drawer) as etiquetas continuam listadas por
 * inteiro com <TagBadge>; aqui o objetivo é caber numa linha.
 */
export function TagList({
  tags,
  colorOf,
  empty = null,
  className,
}: {
  tags: string[];
  colorOf?: (name: string) => string;
  /** O que exibir quando não há etiqueta (ex.: <span>—</span>). */
  empty?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  if (!tags.length) return <>{empty}</>;

  const [first, ...rest] = tags;

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <TagBadge name={first!} color={colorOf?.(first!)} />
      {rest.length > 0 && (
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                badgeVariants({ variant: "outline" }),
                "shrink-0 cursor-pointer tabular-nums",
              )}
              aria-label={`Mais ${rest.length} etiqueta${rest.length > 1 ? "s" : ""}`}
              onClick={(e) => {
                // A linha/card em volta costuma navegar no clique; o "+N" não
                // pode disparar essa navegação.
                e.stopPropagation();
                e.preventDefault();
                setOpen((v) => !v);
              }}
            >
              +{rest.length}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">
            <ul className="space-y-0.5">
              {rest.map((t) => (
                <li key={t} className="truncate capitalize">
                  {t}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
