import { SessionProvider } from "@/contexts/session-context";
import { Sidebar } from "@/layouts/sidebar";
import { Topbar } from "@/layouts/topbar";
import { CommandPalette } from "@/layouts/command-palette";
import { PlanGate } from "@/layouts/plan-gate";
import { BrandProvider } from "@/layouts/brand-provider";
import { VersionWatcher } from "@/layouts/version-watcher";
import { PresenceHeartbeat } from "@/layouts/presence-heartbeat";
import { env } from "@/config/env";
import { getSessionUser } from "@/services/lookup";
import { getServerSessionUser, getServerTicketBadge } from "@/services/session.server";
import { tickets as mockTickets } from "@/services/mock/data";
import type { SessionUser } from "@/types/domain";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  let ticketBadge: number;

  if (env.useMocks) {
    user = getSessionUser();
    ticketBadge = mockTickets.filter(
      (t) =>
        t.company_id === user.company_id &&
        ["open", "in_progress", "waiting_customer"].includes(t.status),
    ).length;
  } else {
    user = await getServerSessionUser();
    ticketBadge = await getServerTicketBadge();
  }

  return (
    <SessionProvider user={user}>
      <BrandProvider />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar ticketBadge={ticketBadge} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar ticketBadge={ticketBadge} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <CommandPalette />
        <PlanGate />
        <VersionWatcher />
        <PresenceHeartbeat />
      </div>
    </SessionProvider>
  );
}
