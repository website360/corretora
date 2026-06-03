"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Shield } from "lucide-react";
import { NAVIGATION } from "@/config/navigation";
import { useSession } from "@/contexts/session-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function MobileNav({ ticketBadge = 0 }: { ticketBadge?: number }) {
  const pathname = usePathname();
  const { user, can } = useSession();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-full max-w-[280px] translate-x-0 translate-y-0 rounded-none rounded-r-xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
        <DialogTitle className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#1e3a8a] text-primary-foreground">
            <Shield className="size-5" />
          </span>
          {user.company.trade_name}
        </DialogTitle>
        <nav className="mt-4 space-y-5 overflow-y-auto">
          {NAVIGATION.map((section) => {
            const items = section.items.filter((item) => can(item.roles ?? []));
            if (!items.length) return null;
            return (
              <div key={section.title}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-accent text-primary"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="size-[18px]" />
                          <span className="flex-1">{item.label}</span>
                          {item.badgeKey === "tickets" && ticketBadge > 0 && (
                            <Badge className="h-5 px-1.5">{ticketBadge}</Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
