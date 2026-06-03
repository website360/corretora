"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, Settings, UserCircle } from "lucide-react";
import { useSession } from "@/contexts/session-context";
import { env } from "@/config/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/types/domain";
import { UserAvatar } from "@/components/common/user-avatar";
import { InstallAppItem } from "@/components/common/install-app-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { user } = useSession();
  const router = useRouter();

  async function handleLogout() {
    if (!env.useMocks) {
      await getSupabaseBrowserClient().auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-ring focus-visible:ring-2">
        <UserAvatar name={user.name} src={user.avatar_url} className="size-9" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <div className="flex items-center gap-2.5 py-1">
            <UserAvatar name={user.name} src={user.avatar_url} className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <div className="px-2 pb-1.5">
          <span className="inline-flex rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {ROLE_LABELS[user.role]}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <UserCircle /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <Settings /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cobrancas">
            <CreditCard /> Planos & Cobranças
          </Link>
        </DropdownMenuItem>
        <InstallAppItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
