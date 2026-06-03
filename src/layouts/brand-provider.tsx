"use client";

import * as React from "react";
import { useSession } from "@/contexts/session-context";
import { applyBrandColor } from "@/lib/branding";

/**
 * Applies the company's white-label primary color (if any) to the document.
 * Renders nothing; lives inside <SessionProvider> in the app shell.
 */
export function BrandProvider() {
  const { user } = useSession();
  const color = user.company.settings?.branding?.primaryColor ?? null;

  React.useEffect(() => {
    applyBrandColor(color);
  }, [color]);

  return null;
}
