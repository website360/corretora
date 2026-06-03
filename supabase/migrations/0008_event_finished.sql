-- ============================================================================
-- Allow events to be marked as finished (concluded).
-- ============================================================================

alter table public.calendar_events
  add column if not exists finished boolean not null default false;
