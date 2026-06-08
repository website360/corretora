"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function PortalLogout() {
  const [loading, setLoading] = React.useState(false);
  async function logout() {
    setLoading(true);
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } finally {
      window.location.href = "/portal/login";
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={logout} loading={loading}>
      <LogOut className="size-4" /> Sair
    </Button>
  );
}
