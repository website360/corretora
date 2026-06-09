"use client";

import { CommandTrigger } from "@/layouts/command-palette";
import { CompanyFilter } from "@/layouts/company-filter";
import { NotificationsMenu } from "@/layouts/notifications-menu";
import { ThemeToggle } from "@/layouts/theme-toggle";
import { UserMenu } from "@/layouts/user-menu";
import { MobileNav } from "@/layouts/mobile-nav";
import { UpdateButton } from "@/layouts/version-watcher";
import { Separator } from "@/components/ui/separator";

export function Topbar({ ticketBadge }: { ticketBadge?: number }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border glass px-4 lg:px-6">
      <MobileNav ticketBadge={ticketBadge} />
      <div className="flex-1">
        <CommandTrigger />
      </div>
      <CompanyFilter />
      <div className="flex items-center gap-1.5">
        <UpdateButton />
        <NotificationsMenu />
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <UserMenu />
      </div>
    </header>
  );
}
