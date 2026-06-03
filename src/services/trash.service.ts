import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { eventCode, taskCode } from "@/utils/format";

export type TrashType =
  | "task"
  | "event"
  | "contact"
  | "carrier"
  | "product"
  | "contract"
  | "service";

export interface TrashItem {
  type: TrashType;
  id: string;
  title: string;
  code: string | null;
  deletedAt: string;
  daysLeft: number;
}

const RETENTION_DAYS = 5;
const TABLE: Record<TrashType, string> = {
  task: "tickets",
  event: "calendar_events",
  contact: "customers",
  carrier: "insurance_carriers",
  product: "insurance_products",
  contract: "contracts",
  service: "service_records",
};

function daysLeft(deletedAt: string): number {
  const elapsedMs = Date.now() - new Date(deletedAt).getTime();
  const left = RETENTION_DAYS - elapsedMs / 86_400_000;
  return Math.max(0, Math.ceil(left));
}

export const trashService = {
  /** Lists trashed items, purging anything older than the retention window. */
  async list(): Promise<TrashItem[]> {
    if (env.useMocks) return [];
    const sb = getSupabaseBrowserClient();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();

    // Lazy purge of expired items.
    await Promise.all(
      (Object.values(TABLE) as string[]).map((t) =>
        sb.from(t).delete().not("deleted_at", "is", null).lt("deleted_at", cutoff),
      ),
    );

    const [tasks, events, contacts, carriers, products, contracts, services] = await Promise.all([
      sb.from("tickets").select("id, title, number, deleted_at").not("deleted_at", "is", null),
      sb
        .from("calendar_events")
        .select("id, title, number, deleted_at")
        .not("deleted_at", "is", null),
      sb.from("customers").select("id, name, deleted_at").not("deleted_at", "is", null),
      sb.from("insurance_carriers").select("id, name, deleted_at").not("deleted_at", "is", null),
      sb.from("insurance_products").select("id, name, deleted_at").not("deleted_at", "is", null),
      sb.from("contracts").select("id, policy_number, deleted_at").not("deleted_at", "is", null),
      sb.from("service_records").select("id, notes, deleted_at").not("deleted_at", "is", null),
    ]);

    const items: TrashItem[] = [
      ...((tasks.data as { id: string; title: string; number: number; deleted_at: string }[]) ?? []).map(
        (t) => ({
          type: "task" as const,
          id: t.id,
          title: t.title,
          code: taskCode(t.number),
          deletedAt: t.deleted_at,
          daysLeft: daysLeft(t.deleted_at),
        }),
      ),
      ...((events.data as { id: string; title: string; number: number; deleted_at: string }[]) ?? []).map(
        (e) => ({
          type: "event" as const,
          id: e.id,
          title: e.title,
          code: e.number != null ? eventCode(e.number) : null,
          deletedAt: e.deleted_at,
          daysLeft: daysLeft(e.deleted_at),
        }),
      ),
      ...((contacts.data as { id: string; name: string; deleted_at: string }[]) ?? []).map((c) => ({
        type: "contact" as const,
        id: c.id,
        title: c.name || "Sem nome",
        code: null,
        deletedAt: c.deleted_at,
        daysLeft: daysLeft(c.deleted_at),
      })),
      ...((carriers.data as { id: string; name: string; deleted_at: string }[]) ?? []).map((c) => ({
        type: "carrier" as const,
        id: c.id,
        title: c.name,
        code: null,
        deletedAt: c.deleted_at,
        daysLeft: daysLeft(c.deleted_at),
      })),
      ...((products.data as { id: string; name: string; deleted_at: string }[]) ?? []).map((p) => ({
        type: "product" as const,
        id: p.id,
        title: p.name,
        code: null,
        deletedAt: p.deleted_at,
        daysLeft: daysLeft(p.deleted_at),
      })),
      ...((contracts.data as { id: string; policy_number: string | null; deleted_at: string }[]) ??
        []).map((c) => ({
        type: "contract" as const,
        id: c.id,
        title: c.policy_number ? `Apólice ${c.policy_number}` : "Contrato",
        code: null,
        deletedAt: c.deleted_at,
        daysLeft: daysLeft(c.deleted_at),
      })),
      ...((services.data as { id: string; notes: string | null; deleted_at: string }[]) ?? []).map(
        (s) => ({
          type: "service" as const,
          id: s.id,
          title: s.notes ? s.notes.slice(0, 40) : "Atendimento",
          code: null,
          deletedAt: s.deleted_at,
          daysLeft: daysLeft(s.deleted_at),
        }),
      ),
    ];

    return items.sort((a, b) => +new Date(b.deletedAt) - +new Date(a.deletedAt));
  },

  /** Restores an item from the trash. */
  async restore(type: TrashType, id: string): Promise<void> {
    if (env.useMocks) return;
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from(TABLE[type]).update({ deleted_at: null }).eq("id", id);
    if (error) throw error;
  },

  /** Permanently deletes an item. */
  async purge(type: TrashType, id: string): Promise<void> {
    if (env.useMocks) return;
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from(TABLE[type]).delete().eq("id", id);
    if (error) throw error;
  },

  /** Permanently deletes every trashed item across all tables (current company). */
  async purgeAll(): Promise<void> {
    if (env.useMocks) return;
    const sb = getSupabaseBrowserClient();
    for (const table of Object.values(TABLE)) {
      const { error } = await sb.from(table).delete().not("deleted_at", "is", null);
      if (error) throw error;
    }
  },
};
