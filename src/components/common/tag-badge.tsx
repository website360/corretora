import { Tag as TagIcon } from "lucide-react";
import { TONE_BADGE_CLASS } from "@/config/domain";
import type { StageColor } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Badge de etiqueta com ícone, colorido pelo tom da etiqueta. */
export function TagBadge({
  name,
  color = "neutral",
  className,
}: {
  name: string;
  color?: StageColor;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("max-w-[10rem] gap-1 capitalize", TONE_BADGE_CLASS[color], className)}
    >
      <TagIcon className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{name}</span>
    </Badge>
  );
}
