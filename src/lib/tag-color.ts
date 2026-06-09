import type { CSSProperties } from "react";
import { TONE_BADGE_CLASS, TONE_TEXT_CLASS } from "@/config/domain";
import type { StageColor } from "@/types/domain";

/**
 * Cor de etiqueta: pode ser um TOM predefinido (StageColor) ou um HEX livre
 * (#rrggbb / #rgb). Estes helpers devolvem className (tom) ou style inline (hex).
 */
export function isHexColor(c?: string | null): c is string {
  return !!c && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);
}

const TONES = new Set(["neutral", "primary", "success", "warning", "destructive"]);
function asTone(c?: string | null): StageColor {
  return (c && TONES.has(c) ? c : "neutral") as StageColor;
}

/** Classe/estilo para o BADGE da etiqueta (borda + texto coloridos). */
export function tagBadgeStyle(color?: string | null): { className: string; style?: CSSProperties } {
  if (isHexColor(color)) return { className: "", style: { borderColor: color, color } };
  return { className: TONE_BADGE_CLASS[asTone(color)] };
}

/** Classe/estilo para o ÍCONE de etiqueta (cor do tom/hex). */
export function tagIconStyle(color?: string | null): { className: string; style?: CSSProperties } {
  if (isHexColor(color)) return { className: "", style: { color } };
  return { className: TONE_TEXT_CLASS[asTone(color)] };
}
