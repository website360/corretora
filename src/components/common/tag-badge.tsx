import { Tag as TagIcon } from "lucide-react";
import { tagBadgeStyle } from "@/lib/tag-color";
import { truncateTagName } from "@/lib/tag-name";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Badge de etiqueta com ícone, colorido pelo tom (StageColor) ou HEX da etiqueta. */
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
  const shown = truncateTagName(name);
  const cut = shown !== name;
  return (
    <Badge
      variant="outline"
      className={cn("max-w-full gap-1 whitespace-nowrap capitalize", tone.className, className)}
      style={tone.style}
      // Nome cortado em 40 caracteres: o inteiro fica no hover. `title` nativo
      // em vez de Tooltip porque o badge aparece dentro de dropdown e de célula
      // de tabela, onde outro portal atrapalharia.
      title={cut ? name : undefined}
    >
      <TagIcon className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{shown}</span>
    </Badge>
  );
}
