-- ============================================================================
-- Tags catalogue (per company, with module scope) + task attribution fields.
-- ============================================================================

-- Attribution: who created the task and who is involved (envolvidos).
alter table public.tickets
  add column if not exists created_by uuid references public.users (id) on delete set null;
alter table public.tickets
  add column if not exists participant_ids uuid[] not null default '{}';

-- Backfill created_by from the earliest "created" log entry.
update public.tickets t
set created_by = l.actor_id
from (
  select distinct on (ticket_id) ticket_id, actor_id
  from public.ticket_logs
  where event = 'created'
  order by ticket_id, created_at
) l
where l.ticket_id = t.id and t.created_by is null;

-- ─────────────────────────────── tags ─────────────────────────────────────
-- `modules` lists the modules a tag applies to (empty = all modules).
-- Valid module keys: 'tasks', 'events', 'customers'.
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name       text not null,
  color      text not null default 'neutral',
  modules    text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (company_id, name)
);
create index if not exists tags_company_idx on public.tags (company_id);

alter table public.tags enable row level security;

drop policy if exists "tags: tenant read" on public.tags;
create policy "tags: tenant read" on public.tags for select
  using (company_id = app.current_company_id() or app.is_super_admin());

drop policy if exists "tags: tenant manage" on public.tags;
create policy "tags: tenant manage" on public.tags for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

-- Seed a few starter tags per company (from tags already used on tickets).
insert into public.tags (company_id, name, color, modules)
select distinct t.company_id, tag, 'primary', '{}'::text[]
from public.tickets t, unnest(t.tags) as tag
on conflict (company_id, name) do nothing;
