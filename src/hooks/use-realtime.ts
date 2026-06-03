"use client";

import * as React from "react";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeOptions<T> {
  /** Postgres table to listen to (e.g. "ticket_messages"). */
  table: string;
  /** Optional row filter, e.g. `ticket_id=eq.${id}`. */
  filter?: string;
  event?: PostgresEvent | "*";
  onChange?: (payload: { eventType: PostgresEvent; new: T; old: T }) => void;
}

/**
 * Subscribes to Supabase Postgres Changes for live updates.
 *
 * When mocks are enabled this becomes a no-op so the UI runs offline,
 * but the production wiring is fully in place: enable Realtime on the
 * table and disable NEXT_PUBLIC_USE_MOCKS to go live.
 */
export function useRealtime<T = Record<string, unknown>>({
  table,
  filter,
  event = "*",
  onChange,
}: UseRealtimeOptions<T>) {
  const handlerRef = React.useRef(onChange);
  handlerRef.current = onChange;

  React.useEffect(() => {
    if (env.useMocks) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? "all"}`)
      .on(
        "postgres_changes",
        { event, schema: "public", table, filter },
        (payload) =>
          handlerRef.current?.({
            eventType: payload.eventType as PostgresEvent,
            new: payload.new as T,
            old: payload.old as T,
          }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event]);
}
