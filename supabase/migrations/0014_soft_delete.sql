-- ============================================================================
-- Soft delete / Trash — deleted items are kept for 5 days so an admin can
-- review and restore them. After that they are purged (lazily on trash open,
-- or via the optional pg_cron job below).
-- ============================================================================

alter table public.tickets         add column if not exists deleted_at timestamptz;
alter table public.calendar_events add column if not exists deleted_at timestamptz;
alter table public.customers       add column if not exists deleted_at timestamptz;

-- Index the soft-deleted rows (the trash is a small subset).
create index if not exists tickets_deleted_idx   on public.tickets         (company_id, deleted_at) where deleted_at is not null;
create index if not exists events_deleted_idx     on public.calendar_events (company_id, deleted_at) where deleted_at is not null;
create index if not exists customers_deleted_idx  on public.customers       (company_id, deleted_at) where deleted_at is not null;

-- Optional hard-purge helper (call from pg_cron daily for guaranteed cleanup):
--   select cron.schedule('purge-trash', '0 3 * * *', $$select app.purge_trash()$$);
create or replace function app.purge_trash()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.tickets         where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.calendar_events where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.customers       where deleted_at is not null and deleted_at < now() - interval '5 days';
end; $$;
