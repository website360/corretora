import { Tag as TagIcon } from "lucide-react";
import { tagBadgeStyle } from "@/lib/tag-color";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Badge de etiqueta com ícone, colorido pelo tom (StageColor) ou HEX da etiqueta.
 *
 * O nome aparece SEMPRE por inteiro: sem corte por caracteres e sem `truncate`.
 * Quando falta largura o texto quebra em mais de uma linha — some espaço, nunca
 * texto. Era o `truncate` que transformava "Automóvel" em "A…" nas colunas
 * estreitas.
 *
 * Em célula de tabela não há quebra de linha (a célula é `whitespace-nowrap`) e
 * a largura vem do auto-ajuste da coluna. Se ainda assim faltar espaço — coluna
 * estreitada à mão, nome maior que o teto de largura — o `overflow-hidden`
 * mantém o corte dentro da borda do badge, e o `title` entrega o nome inteiro.
 */
export function TagBadge({
  name,
  color = "neutral",
  className,
}: {
  name: string;
  color?: string;
  className?: string;
}) {
  const tone = tagBadgeStyle(color);
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full items-start gap-1 overflow-hidden capitalize",
        tone.className,
        className,
      )}
      style={tone.style}
      title={name}
    >
      <TagIcon className="mt-0.5 size-3 shrink-0" />
      <span className="min-w-0 break-words">{name}</span>
    </Badge>
  );
}
