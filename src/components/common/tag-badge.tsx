import { Tag as TagIcon } from "lucide-react";
import { tagBadgeStyle } from "@/lib/tag-color";
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
  return (
    <Badge
      variant="outline"
      className={cn("max-w-[10rem] gap-1 capitalize", tone.className, className)}
      style={tone.style}
    >
      <TagIcon className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{name}</span>
    </Badge>
  );
}
