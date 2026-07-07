import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { calendarEvents } from "@/services/mock/data";
import { getCurrentCompanyId, getViewCompanyId } from "@/services/lookup";
import { sleep, uid } from "@/lib/utils";
import type { CalendarEvent } from "@/types/domain";

export const calendarService = {
  async list(): Promise<CalendarEvent[]> {
    if (env.useMocks) {
      await sleep(240);
      const companyId = getCurrentCompanyId();
      return calendarEvents
        .filter((e) => e.company_id === companyId)
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
    }
    const sb = getSupabaseBrowserClient();
    let query = sb.from("calendar_events").select("*");
    const cid = getViewCompanyId();
    if (cid) query = query.eq("company_id", cid);
    const { data, error } = await query
      .is("deleted_at", null)
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return (data as CalendarEvent[]) ?? [];
  },

  /** Todos os eventos de agenda vinculados a um cliente (timeline do perfil). */
  async listByCustomer(customerId: string): Promise<CalendarEvent[]> {
    if (env.useMocks) {
      await sleep(180);
      return calendarEvents
        .filter((e) => e.customer_id === customerId)
        .sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("calendar_events")
      .select("*")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("starts_at", { ascending: false });
    if (error) throw error;
    return (data as CalendarEvent[]) ?? [];
  },

  async create(input: Omit<CalendarEvent, "id" | "company_id" | "created_at">): Promise<CalendarEvent> {
    if (env.useMocks) {
      await sleep(380);
      const nextNumber = Math.max(0, ...calendarEvents.map((e) => e.number ?? 0)) + 1;
      const record: CalendarEvent = {
        ...input,
        id: uid("ev"),
        number: nextNumber,
        company_id: getCurrentCompanyId(),
        created_at: new Date().toISOString(),
      };
      calendarEvents.push(record);
      return record;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("calendar_events")
      .insert({ ...input, company_id: getCurrentCompanyId() })
      .select("*")
      .single();
    if (error) throw error;
    return data as CalendarEvent;
  },

  async update(id: string, patch: Partial<Omit<CalendarEvent, "id" | "company_id" | "created_at">>): Promise<CalendarEvent> {
    if (env.useMocks) {
      await sleep(320);
      const e = calendarEvents.find((x) => x.id === id);
      if (!e) throw new Error("Evento não encontrado");
      Object.assign(e, patch);
      return e;
    }
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("calendar_events")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as CalendarEvent;
  },

  /** Soft delete — moves the event to the trash (restorable for 5 days). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      await sleep(220);
      const idx = calendarEvents.findIndex((e) => e.id === id);
      if (idx !== -1) calendarEvents.splice(idx, 1);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("calendar_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
