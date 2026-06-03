-- ============================================================================
-- Richer calendar events: modality, attribution (creator/responsible/involved)
-- and tags.
-- ============================================================================

alter table public.calendar_events
  add column if not exists modality text not null default 'not_applicable';
alter table public.calendar_events
  add column if not exists created_by uuid references public.users (id) on delete set null;
alter table public.calendar_events
  add column if not exists participant_ids uuid[] not null default '{}';
alter table public.calendar_events
  add column if not exists tags text[] not null default '{}';

-- The existing owner_id now represents the "responsável"; backfill creator.
update public.calendar_events set created_by = owner_id where created_by is null;
