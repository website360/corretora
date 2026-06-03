"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Domain to fall back to a favicon when the primary logo fails. */
function domainOf(src?: string | null): string | null {
  if (!src) return null;
  try {
    const u = new URL(src);
    // Clearbit URLs carry the domain in the path: logo.clearbit.com/<domain>
    if (u.hostname.includes("clearbit")) return u.pathname.replace(/^\//, "") || null;
    return u.hostname;
  } catch {
    return null;
  }
}

/**
 * Carrier logo with a resilient fallback chain:
 * given logo → Google favicon (by domain) → ShieldCheck icon.
 */
export function CarrierLogo({ src, className }: { src?: string | null; className?: string }) {
  const candidates = React.useMemo(() => {
    const domain = domainOf(src);
    return [
      src ?? null,
      domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null,
    ].filter(Boolean) as string[];
  }, [src]);

  const [stage, setStage] = React.useState(0);
  React.useEffect(() => setStage(0), [src]);

  const current = candidates[stage];

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-card",
        className,
      )}
    >
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt=""
          className="size-full object-contain p-1"
          onError={() => setStage((s) => s + 1)}
          loading="lazy"
        />
      ) : (
        <ShieldCheck className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}
