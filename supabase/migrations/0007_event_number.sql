-- ============================================================================
-- Sequential, human-readable number for calendar events (e.g. #E-001).
-- ============================================================================

create sequence if not exists event_number_seq;

alter table public.calendar_events add column if not exists number bigint;

-- Backfill existing events in chronological order.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.calendar_events
  where number is null
)
update public.calendar_events e
set number = o.rn
from ordered o
where e.id = o.id;

-- Advance the sequence past the highest existing number.
select setval('event_number_seq', (select max(number) from public.calendar_events))
where (select max(number) from public.calendar_events) is not null;

alter table public.calendar_events
  alter column number set default nextval('event_number_seq');
