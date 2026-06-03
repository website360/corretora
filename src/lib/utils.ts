import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Build initials from a person/company name (max 2 chars). */
export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Deterministic pause used to simulate latency in the mock data layer. */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a short, reasonably-unique id for client-side mock records. */
export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Ensures a URL has a protocol so it opens as an absolute link (not relative). */
export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

/** E-mails are always stored/displayed lower-case. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const NAME_LOWER = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del"]);

/** Title-cases a person/company name (fixes ALL CAPS / all lowercase input). */
export function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && NAME_LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
