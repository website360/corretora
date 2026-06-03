"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, ChevronsUpDown, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { NAVIGATION } from "@/config/navigation";
import { useSession } from "@/contexts/session-context";
import { isTrialing, trialDaysLeft } from "@/services/billing.service";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  ticketBadge?: number;
}

export function Sidebar({ ticketBadge = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { user, can } = useSession();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Brand / tenant switcher */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        {user.company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.company.logo_url}
            alt={user.company.trade_name}
            className="size-9 shrink-0 rounded-xl bg-white object-contain ring-1 ring-sidebar-border"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#1e3a8a] text-primary-foreground shadow-glow">
            <Shield className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{user.company.trade_name}</p>
          <p className="truncate text-xs text-muted-foreground capitalize">
            Plano {user.company.plan}
          </p>
        </div>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAVIGATION.map((section) => {
          const items = section.items.filter((item) => can(item.roles ?? []));
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                          />
                        )}
                        <Icon className="size-[18px] shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badgeKey === "tickets" && ticketBadge > 0 && (
                          <Badge variant="default" className="h-5 px-1.5">
                            {ticketBadge}
                          </Badge>
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

      <Separator />

      {/* Trial counter / upgrade */}
      <div className="p-3">
        {isTrialing(user.company) ? (
          <TrialCard days={trialDaysLeft(user.company)} />
        ) : (
          <Link
            href="/escolher-plano"
            className="block rounded-xl border border-primary/20 bg-gradient-to-br from-accent to-transparent p-3.5 transition-colors hover:border-primary/40"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Sparkles className="size-4" /> Seu plano
            </div>
            <p className="text-xs text-muted-foreground">Gerencie sua assinatura e limites.</p>
          </Link>
        )}
      </div>
    </aside>
  );
}

function TrialCard({ days }: { days: number }) {
  const pct = Math.max(0, Math.min(100, (days / 7) * 100));
  const urgent = days <= 2;
  return (
    <Link
      href="/escolher-plano"
      className={cn(
        "block rounded-xl border p-3.5 transition-colors",
        urgent
          ? "border-warning/40 bg-warning/10 hover:border-warning/60"
          : "border-primary/20 bg-gradient-to-br from-accent to-transparent hover:border-primary/40",
      )}
    >
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1.5 text-sm font-semibold",
          urgent ? "text-warning" : "text-primary",
        )}
      >
        <Clock className="size-4" /> Teste grátis
      </div>
      <p className="text-xs text-muted-foreground">
        {days === 0
          ? "Termina hoje"
          : `${days} ${days === 1 ? "dia restante" : "dias restantes"}`}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", urgent ? "bg-warning" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn("mt-2 text-xs font-medium", urgent ? "text-warning" : "text-primary")}>
        Ver planos →
      </p>
    </Link>
  );
}
