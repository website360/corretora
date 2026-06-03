"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ListChecks, Moon, Plus, Sun, UserSquare2 } from "lucide-react";
import { useTheme } from "next-themes";
import { ALL_NAV_ITEMS } from "@/config/navigation";
import { useUIStore } from "@/stores/ui-store";
import { useDirectory } from "@/stores/directory-store";
import { customersService } from "@/services/customers.service";
import { ticketsService } from "@/services/tickets.service";
import { calendarService } from "@/services/calendar.service";
import { findCustomer, findUser } from "@/services/lookup";
import { eventCode, taskCode } from "@/utils/format";
import type { CalendarEvent, Customer, Ticket } from "@/types/domain";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

/** Concatenates resolved people names so a person's name matches their records. */
function peopleNames(ids: (string | null | undefined)[]): string {
  return ids
    .map((id) => findUser(id)?.name)
    .filter(Boolean)
    .join(" ");
}

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  useDirectory();
  const { commandOpen, setCommandOpen, toggleCommand } = useUIStore();

  const [query, setQuery] = React.useState("");
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleCommand();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleCommand]);

  // Lazy-load searchable data the first time the palette opens.
  React.useEffect(() => {
    if (!commandOpen || loadedRef.current) return;
    loadedRef.current = true;
    customersService.list().then(setCustomers).catch(() => {});
    ticketsService.list().then(setTickets).catch(() => {});
    calendarService.list().then(setEvents).catch(() => {});
  }, [commandOpen]);

  const run = (fn: () => void) => {
    setCommandOpen(false);
    setQuery("");
    fn();
  };

  const searching = query.trim().length >= 2;

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(o) => {
        setCommandOpen(o);
        if (!o) setQuery("");
      }}
    >
      <CommandInput
        placeholder="Buscar contatos, tarefas, eventos..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {searching && customers.length > 0 && (
          <CommandGroup heading="Contatos">
            {customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`contato ${c.name} ${c.document} ${c.email ?? ""} ${c.tags.join(" ")} ${c.id}`}
                onSelect={() => run(() => router.push(`/clientes/${c.id}`))}
              >
                <UserSquare2 />
                <span className="flex-1 truncate">{c.name || "Sem nome"}</span>
                <span className="text-xs text-muted-foreground">
                  {c.kind === "client" ? "Cliente" : "Lead"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searching && tickets.length > 0 && (
          <CommandGroup heading="Tarefas">
            {tickets.map((t) => {
              const customer = findCustomer(t.customer_id);
              const people = peopleNames([t.assignee_id, ...(t.participant_ids ?? [])]);
              return (
                <CommandItem
                  key={t.id}
                  value={`tarefa ${t.title} ${taskCode(t.number)} ${people} ${customer?.name ?? ""} ${t.tags.join(" ")} ${t.id}`}
                  onSelect={() => run(() => router.push(`/tickets/${t.id}`))}
                >
                  <ListChecks />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {taskCode(t.number)}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {searching && events.length > 0 && (
          <CommandGroup heading="Eventos">
            {events.map((e) => {
              const people = peopleNames([e.owner_id, ...(e.participant_ids ?? [])]);
              return (
                <CommandItem
                  key={e.id}
                  value={`evento ${e.title} ${e.number != null ? eventCode(e.number) : ""} ${people} ${(e.tags ?? []).join(" ")} ${e.id}`}
                  onSelect={() => run(() => router.push(`/tickets?event=${e.id}`))}
                >
                  <CalendarDays />
                  <span className="flex-1 truncate">{e.title}</span>
                  {e.number != null && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {eventCode(e.number)}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {searching && (customers.length > 0 || tickets.length > 0 || events.length > 0) && (
          <CommandSeparator />
        )}

        <CommandGroup heading="Navegação">
          {ALL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => run(() => router.push(item.href))}
              >
                <Icon />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações rápidas">
          <CommandItem value="nova tarefa ticket" onSelect={() => run(() => router.push("/tickets?new=1"))}>
            <Plus /> Nova tarefa
          </CommandItem>
          <CommandItem
            value="novo contato cliente lead"
            onSelect={() => run(() => router.push("/clientes?new=1"))}
          >
            <Plus /> Novo contato
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Aparência">
          <CommandItem value="tema claro" onSelect={() => run(() => setTheme("light"))}>
            <Sun /> Tema claro
          </CommandItem>
          <CommandItem value="tema escuro" onSelect={() => run(() => setTheme("dark"))}>
            <Moon /> Tema escuro
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Search trigger rendered in the topbar. */
export function CommandTrigger() {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  return (
    <button
      onClick={() => setCommandOpen(true)}
      className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent/40"
    >
      <span className="flex-1 text-left">Buscar...</span>
      <CommandShortcut>⌘K</CommandShortcut>
    </button>
  );
}
