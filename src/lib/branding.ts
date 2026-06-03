/**
 * White-label branding helpers.
 *
 * Brand colors are stored as hex on `companies.settings.branding.primaryColor`,
 * but the design tokens in globals.css are raw HSL channels (e.g. "221 83% 53%")
 * so Tailwind can apply opacity modifiers. We convert the hex to channels and
 * override the relevant CSS variables on <html> at runtime.
 */

/** Converts "#2563eb" (or "#25e") to the "H S% L%" channel form, or null. */
export function hexToHslChannels(hex: string): string | null {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** CSS variables overridden to recolor the app around the brand primary. */
const BRAND_VARS = [
  "--primary",
  "--ring",
  "--accent",
  "--accent-foreground",
  "--sidebar-accent",
] as const;

/**
 * Applies (or clears) the brand primary color on the document root.
 * Pass null/undefined/invalid to restore the default theme tokens.
 */
export function applyBrandColor(hex: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const channels = hex ? hexToHslChannels(hex) : null;
  if (!channels) {
    for (const v of BRAND_VARS) root.style.removeProperty(v);
    return;
  }

  const [h, s] = channels.split(" "); // e.g. "221", "83%"
  root.style.setProperty("--primary", channels);
  root.style.setProperty("--ring", channels);
  root.style.setProperty("--accent", `${h} ${s} 97%`);
  root.style.setProperty("--accent-foreground", `${h} ${s} 40%`);
  root.style.setProperty("--sidebar-accent", `${h} ${s} 96%`);
}
