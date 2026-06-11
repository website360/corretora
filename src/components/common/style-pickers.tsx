"use client";

import * as React from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  FileText,
  Flag,
  Handshake,
  Heart,
  Inbox,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Rocket,
  Send,
  Shield,
  Sparkles,
  Star,
  Tag as TagIcon,
  Target,
  ThumbsDown,
  ThumbsUp,
  User,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { isHexColor, tagIconStyle } from "@/lib/tag-color";
import { TONE_DOT_CLASS, TONE_TEXT_CLASS } from "@/config/domain";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Ícones disponíveis para etiquetas e colunas (substituem a bolinha). */
export const STAGE_ICONS: Record<string, LucideIcon> = {
  star: Star,
  flag: Flag,
  check: CheckCircle2,
  clock: Clock,
  alert: AlertTriangle,
  phone: Phone,
  mail: Mail,
  user: User,
  users: Users,
  file: FileText,
  dollar: DollarSign,
  handshake: Handshake,
  up: ThumbsUp,
  down: ThumbsDown,
  target: Target,
  rocket: Rocket,
  sparkles: Sparkles,
  heart: Heart,
  tag: TagIcon,
  inbox: Inbox,
  send: Send,
  calendar: Calendar,
  shield: Shield,
  zap: Zap,
  package: Package,
  building: Building2,
  chat: MessageCircle,
};

export function getStageIcon(name?: string | null): LucideIcon | null {
  return name ? (STAGE_ICONS[name] ?? null) : null;
}

const TONES = new Set(["neutral", "primary", "success", "warning", "destructive"]);

/**
 * Marcador de etapa/etiqueta: mostra o ÍCONE escolhido (colorido pela cor/hex)
 * ou, se não houver ícone, a bolinha colorida tradicional.
 */
export function StageDot({
  color,
  icon,
  className,
}: {
  color?: string | null;
  icon?: string | null;
  className?: string;
}) {
  const Icon = getStageIcon(icon);
  if (Icon) {
    const st = tagIconStyle(color);
    return <Icon className={cn("size-3.5 shrink-0", st.className, className)} style={st.style} />;
  }
  if (isHexColor(color)) {
    return (
      <span
        className={cn("size-2.5 shrink-0 rounded-full", className)}
        style={{ backgroundColor: color }}
      />
    );
  }
  const tone = color && TONES.has(color) ? color : "neutral";
  return (
    <span
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        TONE_DOT_CLASS[tone as keyof typeof TONE_DOT_CLASS],
        className,
      )}
    />
  );
}

const COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "neutral", label: "Cinza" },
  { value: "primary", label: "Azul" },
  { value: "success", label: "Verde" },
  { value: "warning", label: "Amarelo" },
  { value: "destructive", label: "Vermelho" },
];

/** Seletor de cor: 5 tons predefinidos + cor livre (hex). */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [hexDraft, setHexDraft] = React.useState(isHexColor(value) ? value : "");
  React.useEffect(() => setHexDraft(isHexColor(value) ? value : ""), [value]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border-2 transition-colors",
            value === c.value ? "border-foreground" : "border-transparent hover:border-border",
          )}
        >
          <Circle
            className={cn("size-4 fill-current", TONE_TEXT_CLASS[c.value as keyof typeof TONE_TEXT_CLASS])}
          />
        </button>
      ))}
      <div className="mx-1 h-6 w-px bg-border" />
      <label
        title="Cor personalizada (hex)"
        className={cn(
          "relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition-colors",
          isHexColor(value) ? "border-foreground" : "border-transparent hover:border-border",
        )}
      >
        <Circle
          className="size-4 fill-current"
          style={{ color: isHexColor(value) ? value : "currentColor" }}
        />
        <input
          type="color"
          value={isHexColor(value) ? value : "#64748b"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Input
        value={hexDraft}
        onChange={(e) => {
          const raw = e.target.value.trim();
          const v = raw && !raw.startsWith("#") ? `#${raw}` : raw;
          setHexDraft(v);
          if (isHexColor(v)) onChange(v);
          else if (v === "") onChange("primary");
        }}
        placeholder="#RRGGBB"
        className="h-9 w-28 font-mono text-sm"
        maxLength={7}
      />
    </div>
  );
}

/** Seletor de ícone (ou nenhum = bolinha). `color` colore a prévia. */
export function IconPicker({
  value,
  onChange,
  color,
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  color?: string | null;
}) {
  const st = tagIconStyle(color);
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        title="Sem ícone (bolinha)"
        onClick={() => onChange(null)}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg border-2 transition-colors",
          !value ? "border-foreground" : "border-transparent hover:border-border",
        )}
      >
        <StageDot color={color} />
      </button>
      {Object.entries(STAGE_ICONS).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border-2 transition-colors",
            value === key ? "border-foreground" : "border-transparent hover:border-border",
          )}
        >
          <Icon className={cn("size-4", st.className)} style={st.style} />
        </button>
      ))}
    </div>
  );
}
