/**
 * Minimal hand-written `Database` type for the Supabase client generics.
 * In production, regenerate this file with:
 *
 *   supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * It intentionally mirrors the public schema in supabase/migrations.
 */
import type {
  AppNotification,
  CalendarEvent,
  Company,
  Customer,
  Ticket,
  TicketLog,
  TicketMessage,
  User,
} from "@/types/domain";

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

interface TableShape<T> {
  Row: Row<T>;
  Insert: Insert<T>;
  Update: Update<T>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      companies: TableShape<Company>;
      users: TableShape<User>;
      customers: TableShape<Customer>;
      tickets: TableShape<Ticket>;
      ticket_messages: TableShape<TicketMessage>;
      ticket_logs: TableShape<TicketLog>;
      calendar_events: TableShape<CalendarEvent>;
      notifications: TableShape<AppNotification>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
