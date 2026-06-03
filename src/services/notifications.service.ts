import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { notifications } from "@/services/mock/data";
import { getCurrentUserId } from "@/services/lookup";
import { sleep } from "@/lib/utils";
import type { AppNotification } from "@/types/domain";

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    if (env.useMocks) {
      await sleep(180);
      const userId = getCurrentUserId();
      return notifications
        .filter((n) => n.user_id === userId)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as AppNotification[]) ?? [];
  },

  async markAsRead(id: string): Promise<void> {
    if (env.useMocks) {
      const n = notifications.find((x) => x.id === id);
      if (n) n.read = true;
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("notifications").update({ read: true }).eq("id", id);
  },

  async markAllAsRead(): Promise<void> {
    if (env.useMocks) {
      const userId = getCurrentUserId();
      notifications.filter((n) => n.user_id === userId).forEach((n) => (n.read = true));
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.from("notifications").update({ read: true }).eq("read", false);
  },
};
