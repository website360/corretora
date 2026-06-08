"use client";

import * as React from "react";
import { applyBrandColor } from "@/lib/branding";

/** Aplica a cor da marca da corretora no portal do cliente. */
export function PortalBrand({ color }: { color?: string | null }) {
  React.useEffect(() => {
    applyBrandColor(color);
    return () => applyBrandColor(null);
  }, [color]);
  return null;
}
