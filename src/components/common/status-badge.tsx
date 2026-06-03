import { Badge } from "@/components/ui/badge";
import { TONE_BADGE_CLASS, type DisplayMeta } from "@/config/domain";
import { cn } from "@/lib/utils";

/** Renders a status/priority badge from a DisplayMeta entry. */
export function StatusBadge({ meta, className }: { meta: DisplayMeta; className?: string }) {
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE_BADGE_CLASS[meta.tone],
        className,
      )}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

export { Badge };
