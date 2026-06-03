import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Currency in Brazilian Real. */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Compact number, e.g. 1.2k / 3.4M. */
export function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1) {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Long date — 29 de maio de 2026. */
export function formatDate(date: string | Date) {
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Short date — 29/05/2026. */
export function formatShortDate(date: string | Date) {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatTime(date: string | Date) {
  return format(new Date(date), "HH:mm", { locale: ptBR });
}

/** Smart, chat-style timestamp. */
export function formatSmartDate(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return `Hoje, ${formatTime(d)}`;
  if (isYesterday(d)) return `Ontem, ${formatTime(d)}`;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** "há 3 horas" */
export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

/* ───────────────── Brazilian document & contact masks ───────────────── */

export function formatCPF(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCNPJ(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatDocument(value: string) {
  const d = value.replace(/\D/g, "");
  return d.length > 11 ? formatCNPJ(value) : formatCPF(value);
}

export function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  const ddd = d.slice(0, 2);
  // 11 digits → mobile (5+4); up to 10 → landline (4+4).
  const split = d.length > 10 ? 7 : 6;
  const mid = d.slice(2, split);
  const rest = d.slice(split);
  // Only append the hyphen once there's a digit after it, otherwise backspace
  // gets stuck on a dash the mask keeps re-adding.
  return rest ? `(${ddd}) ${mid}-${rest}` : `(${ddd}) ${mid}`;
}

/* ───────────────────── Human-readable record codes ───────────────────── */

export function taskCode(n?: number) {
  return `T-${String(n ?? 0).padStart(4, "0")}`;
}

export function eventCode(n?: number) {
  return `E-${String(n ?? 0).padStart(4, "0")}`;
}

export function formatCEP(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})/, "$1-$2");
}
