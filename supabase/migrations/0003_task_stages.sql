-- ============================================================================
-- Custom task funnel (Kanban stages) — per-company, fully customizable.
--
-- Replaces the fixed `ticket_status` enum as the source of truth for the
-- board. Each company gets a default set of stages (seeded on creation and
-- backfilled here); tickets reference a stage via `stage_id`.
-- ============================================================================

create table if not exists public.task_stages (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  color       text not null default 'neutral',   -- tone: neutral|primary|success|warning|destructive
  position    int not null default 0,
  is_terminal boolean not null default false,     -- counts as "done" for metrics
  created_at  timestamptz not null default now()
);
create index if not exists task_stages_company_idx on public.task_stages (company_id, position);

alter table public.tickets
  add column if not exists stage_id uuid references public.task_stages (id) on delete set null;
create index if not exists tickets_stage_idx on public.tickets (stage_id);

-- ─────────────────────────── default stages helper ────────────────────────
create or replace function app.seed_default_stages(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_stages (company_id, name, color, position, is_terminal) values
    (p_company, 'Aberto',             'primary', 0, false),
    (p_company, 'Em andamento',       'warning', 1, false),
    (p_company, 'Aguardando cliente', 'neutral', 2, false),
    (p_company, 'Resolvido',          'success', 3, true),
    (p_company, 'Fechado',            'neutral', 4, true);
end; $$;

-- New companies automatically get the default funnel.
create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  return new;
end; $$;

drop trigger if exists on_company_created on public.companies;
create trigger on_company_created
  after insert on public.companies
  for each row execute function app.handle_new_company();

-- ─────────────────────────── backfill existing data ───────────────────────
do $$
declare c record;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.task_stages where company_id = c.id) then
      perform app.seed_default_stages(c.id);
    end if;
  end loop;

  update public.tickets t
  set stage_id = s.id
  from public.task_stages s
  where s.company_id = t.company_id
    and t.stage_id is null
    and s.name = case t.status
      when 'open'             then 'Aberto'
      when 'in_progress'      then 'Em andamento'
      when 'waiting_customer' then 'Aguardando cliente'
      when 'resolved'         then 'Resolvido'
      when 'closed'           then 'Fechado'
    end;
end $$;

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.task_stages enable row level security;

create policy "stages: tenant read" on public.task_stages for select
  using (company_id = app.current_company_id() or app.is_super_admin());

create policy "stages: tenant manage" on public.task_stages for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
