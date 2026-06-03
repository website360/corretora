-- ============================================================================
-- Corretora SaaS — Initial schema (multi-tenant)
-- PostgreSQL / Supabase
--
-- Conventions:
--   * Every tenant-scoped table carries `company_id` and is protected by RLS.
--   * `auth.uid()` is the Supabase Auth user id and equals public.users.id.
--   * Helper functions in the `app` schema centralise tenant/role checks.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────── Enums ────────────────────────────────────
create type user_role        as enum ('super_admin', 'admin', 'broker', 'assistant');
create type entity_status     as enum ('active', 'inactive');
create type plan_tier         as enum ('starter', 'professional', 'enterprise');
create type person_type       as enum ('individual', 'company');
create type customer_kind      as enum ('lead', 'client');
create type ticket_status     as enum ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
create type ticket_priority   as enum ('low', 'medium', 'high', 'urgent');
create type ticket_category   as enum ('claim', 'renewal', 'new_policy', 'billing', 'support', 'internal');
create type ticket_msg_kind   as enum ('message', 'internal_note');
create type calendar_evt_type as enum ('meeting', 'reminder', 'task', 'renewal');
create type notification_type as enum ('ticket_assigned', 'ticket_message', 'mention', 'task_due', 'event_reminder', 'system');

-- ───────────────────────────── companies ──────────────────────────────────
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  legal_name  text not null,
  trade_name  text not null,
  cnpj        text not null unique,
  email       text not null,
  phone       text not null,
  address     jsonb,
  logo_url    text,
  status      entity_status not null default 'active',
  plan        plan_tier not null default 'starter',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────── users ────────────────────────────────────
-- `id` mirrors auth.users.id (1:1). Populated via trigger on sign-up.
create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  company_id   uuid not null references public.companies (id) on delete cascade,
  name         text not null,
  email        text not null,
  phone        text,
  job_title    text,
  avatar_url   text,
  role         user_role not null default 'broker',
  status       entity_status not null default 'active',
  is_owner     boolean not null default false,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);
create index users_company_idx on public.users (company_id);

-- ───────────────────────────── customers ──────────────────────────────────
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  kind        customer_kind not null default 'client',
  person_type person_type not null default 'individual',
  name        text not null,
  document    text not null,
  email       text,
  phone       text,
  birth_date  date,
  address     jsonb,
  notes       text,
  tags        text[] not null default '{}',
  owner_id    uuid references public.users (id) on delete set null,
  status      entity_status not null default 'active',
  created_at  timestamptz not null default now()
);
create index customers_company_idx on public.customers (company_id);
create index customers_kind_idx    on public.customers (company_id, kind);
create index customers_owner_idx   on public.customers (owner_id);
create index customers_name_trgm   on public.customers using gin (to_tsvector('portuguese', name));

create table public.customer_interactions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  type        text not null,
  title       text not null,
  description text,
  author_id   uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index customer_interactions_customer_idx on public.customer_interactions (customer_id);

-- ─────────────────────────────── tickets ──────────────────────────────────
create sequence if not exists ticket_number_seq;

create table public.tickets (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  number       bigint not null default nextval('ticket_number_seq'),
  title        text not null,
  description  text,
  status       ticket_status not null default 'open',
  priority     ticket_priority not null default 'medium',
  category     ticket_category not null default 'support',
  customer_id  uuid references public.customers (id) on delete set null,
  assignee_id  uuid references public.users (id) on delete set null,
  tags         text[] not null default '{}',
  unread_count int not null default 0,
  due_at       timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tickets_company_idx  on public.tickets (company_id);
create index tickets_assignee_idx on public.tickets (assignee_id);
create index tickets_status_idx   on public.tickets (company_id, status);

create table public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  author_id   uuid references public.users (id) on delete set null,
  kind        ticket_msg_kind not null default 'message',
  body        text not null,
  mentions    uuid[] not null default '{}',
  attachments jsonb not null default '[]',
  read_by     uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

create table public.ticket_participants (
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  user_id   uuid not null references public.users (id) on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

create table public.ticket_logs (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ticket_id  uuid not null references public.tickets (id) on delete cascade,
  actor_id   uuid references public.users (id) on delete set null,
  event      text not null,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index ticket_logs_ticket_idx on public.ticket_logs (ticket_id, created_at);

create table public.ticket_tags (
  company_id uuid not null references public.companies (id) on delete cascade,
  name       text not null,
  color      text,
  primary key (company_id, name)
);

-- ─────────────────────────── calendar_events ──────────────────────────────
create table public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  title       text not null,
  description text,
  type        calendar_evt_type not null default 'meeting',
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  all_day     boolean not null default false,
  customer_id uuid references public.customers (id) on delete set null,
  owner_id    uuid not null references public.users (id) on delete cascade,
  location    text,
  created_at  timestamptz not null default now()
);
create index calendar_events_company_idx on public.calendar_events (company_id, starts_at);

-- ─────────────────────────── modules / billing ────────────────────────────
create table public.modules (
  key         text primary key,
  name        text not null,
  description text,
  min_plan    plan_tier not null default 'starter'
);

create table public.company_modules (
  company_id uuid not null references public.companies (id) on delete cascade,
  module_key text not null references public.modules (key) on delete cascade,
  enabled    boolean not null default true,
  primary key (company_id, module_key)
);

-- ───────────────────────────── notifications ──────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text,
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read);

-- ============================================================================
-- Helper functions (tenant + role resolution) — SECURITY DEFINER avoids
-- recursive RLS evaluation when reading the caller's own row.
-- ============================================================================
create schema if not exists app;

create or replace function app.current_company_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select company_id from public.users where id = auth.uid();
$$;

create or replace function app.current_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function app.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.users where id = auth.uid()), false);
$$;

-- ============================================================================
-- updated_at trigger for tickets
-- ============================================================================
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_touch_updated_at
  before update on public.tickets
  for each row execute function app.touch_updated_at();

-- ============================================================================
-- New-user provisioning: when a user signs up, create their public profile.
-- Company is taken from the invite metadata or a freshly created company.
-- ============================================================================
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
  v_is_owner boolean := false;
begin
  v_company_id := nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid;

  if v_company_id is null then
    insert into public.companies (legal_name, trade_name, cnpj, email, phone)
    values (
      coalesce(new.raw_user_meta_data ->> 'company', 'Minha Corretora'),
      coalesce(new.raw_user_meta_data ->> 'company', 'Minha Corretora'),
      'pendente-' || substr(new.id::text, 1, 8),
      new.email, ''
    )
    returning id into v_company_id;
    v_is_owner := true;
  end if;

  insert into public.users (id, company_id, name, email, role, is_owner)
  values (
    new.id,
    v_company_id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'admin'),
    v_is_owner
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- O dono da conta não pode ser excluído (mas o cascade da empresa é permitido).
create or replace function app.protect_owner_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_owner and exists (select 1 from public.companies where id = old.company_id) then
    raise exception 'O dono da conta não pode ser excluído.';
  end if;
  return old;
end;
$$;

drop trigger if exists users_protect_owner on public.users;
create trigger users_protect_owner
  before delete on public.users
  for each row execute function app.protect_owner_delete();
-- ============================================================================
-- Row Level Security — full multi-tenant isolation.
--
-- Strategy:
--   * Enable RLS on every table.
--   * Tenant rows are visible only when `company_id = app.current_company_id()`.
--   * Super admins bypass tenant scoping (platform operators).
--   * Writes additionally check role where it matters (e.g. user management).
-- ============================================================================

alter table public.companies            enable row level security;
alter table public.users                 enable row level security;
alter table public.customers             enable row level security;
alter table public.customer_interactions enable row level security;
alter table public.tickets               enable row level security;
alter table public.ticket_messages       enable row level security;
alter table public.ticket_participants   enable row level security;
alter table public.ticket_logs           enable row level security;
alter table public.ticket_tags           enable row level security;
alter table public.calendar_events       enable row level security;
alter table public.company_modules       enable row level security;
alter table public.notifications         enable row level security;
alter table public.modules               enable row level security;

-- ───────────────────────────── companies ──────────────────────────────────
create policy "companies: members read own tenant"
  on public.companies for select
  using (id = app.current_company_id() or app.is_super_admin());

create policy "companies: admins update own tenant"
  on public.companies for update
  using ((id = app.current_company_id() and app.current_role() in ('admin','super_admin')) or app.is_super_admin());

create policy "companies: super admin manages all"
  on public.companies for all
  using (app.is_super_admin())
  with check (app.is_super_admin());

-- ─────────────────────────────── users ────────────────────────────────────
create policy "users: read same tenant"
  on public.users for select
  using (company_id = app.current_company_id() or app.is_super_admin());

create policy "users: self update"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users: admins manage tenant members"
  on public.users for all
  using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
  with check (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- ─── Generic tenant policies (select/insert/update/delete) for tenant tables ─
-- customers
create policy "customers: tenant read"   on public.customers for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "customers: tenant write"  on public.customers for insert with check (company_id = app.current_company_id());
create policy "customers: tenant update" on public.customers for update using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
create policy "customers: tenant delete" on public.customers for delete using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- customer_interactions
create policy "interactions: tenant read"  on public.customer_interactions for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "interactions: tenant write" on public.customer_interactions for insert with check (company_id = app.current_company_id());

-- tickets
create policy "tickets: tenant read"   on public.tickets for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "tickets: tenant write"  on public.tickets for insert with check (company_id = app.current_company_id());
create policy "tickets: tenant update" on public.tickets for update using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
create policy "tickets: tenant delete" on public.tickets for delete using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- ticket_messages
create policy "messages: tenant read"  on public.ticket_messages for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "messages: tenant write" on public.ticket_messages for insert with check (company_id = app.current_company_id() and author_id = auth.uid());
create policy "messages: author update" on public.ticket_messages for update using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ticket_logs
create policy "logs: tenant read"  on public.ticket_logs for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "logs: tenant write" on public.ticket_logs for insert with check (company_id = app.current_company_id());

-- ticket_participants (scoped via the parent ticket)
create policy "participants: tenant read" on public.ticket_participants for select
  using (exists (select 1 from public.tickets t where t.id = ticket_id and t.company_id = app.current_company_id()));
create policy "participants: tenant write" on public.ticket_participants for all
  using (exists (select 1 from public.tickets t where t.id = ticket_id and t.company_id = app.current_company_id()))
  with check (exists (select 1 from public.tickets t where t.id = ticket_id and t.company_id = app.current_company_id()));

-- ticket_tags
create policy "tags: tenant all" on public.ticket_tags for all
  using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());

-- calendar_events
create policy "events: tenant read"  on public.calendar_events for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "events: tenant write" on public.calendar_events for insert with check (company_id = app.current_company_id());
create policy "events: tenant update" on public.calendar_events for update using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
create policy "events: tenant delete" on public.calendar_events for delete using (company_id = app.current_company_id());

-- company_modules
create policy "company_modules: tenant read"  on public.company_modules for select using (company_id = app.current_company_id() or app.is_super_admin());
create policy "company_modules: admin write"  on public.company_modules for all
  using (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'))
  with check (company_id = app.current_company_id() and app.current_role() in ('admin','super_admin'));

-- notifications (scoped to the recipient)
create policy "notifications: own read"   on public.notifications for select using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: tenant insert" on public.notifications for insert with check (company_id = app.current_company_id());

-- modules catalogue is public read-only
create policy "modules: read all" on public.modules for select using (true);
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
-- ============================================================================
-- Storage bucket for avatars / logos (public read, authenticated write).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Public can read avatars; authenticated users can upload/replace/remove.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars authenticated insert" on storage.objects;
create policy "avatars authenticated insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars authenticated update" on storage.objects;
create policy "avatars authenticated update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

drop policy if exists "avatars authenticated delete" on storage.objects;
create policy "avatars authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');
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
-- ============================================================================
-- Allow events to be marked as finished (concluded).
-- ============================================================================

alter table public.calendar_events
  add column if not exists finished boolean not null default false;
-- ============================================================================
-- Seed data
--
-- The modules catalogue is always safe to seed. Demo tenant data (company,
-- customers, tickets) is inserted with a fixed company id so you can explore
-- the schema immediately. Users are created through Supabase Auth sign-up
-- (the on_auth_user_created trigger provisions public.users), so assignees
-- start NULL here — assign them once real users exist.
-- ============================================================================

-- ─────────────────────────── modules catalogue ────────────────────────────
insert into public.modules (key, name, description, min_plan) values
  ('dashboard',   'Dashboard',            'Visão geral, KPIs e métricas.',                 'starter'),
  ('customers',   'Clientes',             'Gestão da carteira de clientes.',               'starter'),
  ('tickets',     'Tickets & Atendimento','Helpdesk, tarefas e colaboração.',              'starter'),
  ('calendar',    'Agenda',               'Calendário, reuniões e lembretes.',             'professional'),
  ('users',       'Equipe & Permissões',  'Usuários, RBAC e convites.',                    'professional'),
  ('billing',     'Billing & Assinaturas','Planos e cobrança recorrente.',                 'enterprise'),
  ('automations', 'Automações & IA',      'Fluxos automáticos, chatbot e integrações.',    'enterprise')
on conflict (key) do nothing;

-- ─────────────────────────────── demo tenant ──────────────────────────────
insert into public.companies (id, legal_name, trade_name, cnpj, email, phone, status, plan)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Apex Corretora de Seguros LTDA', 'Apex Seguros',
  '12.345.678/0001-90', 'contato@apexseguros.com.br', '(11) 4002-8922',
  'active', 'enterprise'
)
on conflict (id) do nothing;

-- Enable all modules for the demo tenant.
insert into public.company_modules (company_id, module_key, enabled)
select '00000000-0000-0000-0000-0000000000a1', key, true from public.modules
on conflict do nothing;

-- ───────────────────────────── demo customers ─────────────────────────────
insert into public.customers (company_id, person_type, name, document, email, phone, tags, status)
values
  ('00000000-0000-0000-0000-0000000000a1', 'company',    'Construtora Horizonte LTDA', '21.345.678/0001-22', 'financeiro@horizonteconstrutora.com.br', '(11) 3344-5566', '{frota,empresarial,premium}', 'active'),
  ('00000000-0000-0000-0000-0000000000a1', 'individual', 'Carlos Eduardo Tavares',     '123.456.789-09',     'carlos.tavares@gmail.com',               '(11) 99876-5544', '{auto,residencial}',         'active'),
  ('00000000-0000-0000-0000-0000000000a1', 'individual', 'Patrícia Nogueira',          '987.654.321-00',     'patricia.nogueira@outlook.com',          '(11) 98123-9090', '{vida}',                     'active')
on conflict do nothing;

-- ─────────────────────────────── demo tickets ─────────────────────────────
insert into public.tickets (company_id, title, description, status, priority, category, tags)
values
  ('00000000-0000-0000-0000-0000000000a1', 'Sinistro veículo frota', 'Colisão traseira reportada pelo cliente.', 'in_progress', 'high',   'claim',      '{frota,urgente}'),
  ('00000000-0000-0000-0000-0000000000a1', 'Renovação seguro auto',  'Apólice vence em 15 dias.',                'open',        'medium', 'renewal',    '{renovação}'),
  ('00000000-0000-0000-0000-0000000000a1', 'Emissão nova apólice',   'Cliente aprovou a proposta empresarial.',  'open',        'high',   'new_policy', '{empresarial}')
on conflict do nothing;

-- ───────────────────────── Lead Kanbans (boards + columns) ─────────────────
create table if not exists public.kanban_boards (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists kanban_boards_company_idx on public.kanban_boards (company_id, position);

create table if not exists public.kanban_columns (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  board_id    uuid not null references public.kanban_boards (id) on delete cascade,
  name        text not null,
  color       text not null default 'neutral',
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists kanban_columns_board_idx on public.kanban_columns (board_id, position);

alter table public.customers
  add column if not exists board_id  uuid references public.kanban_boards (id)  on delete set null,
  add column if not exists column_id uuid references public.kanban_columns (id) on delete set null;
create index if not exists customers_board_idx on public.customers (board_id, column_id);

create or replace function app.seed_default_kanban(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_board uuid;
begin
  insert into public.kanban_boards (company_id, name, description, position)
  values (p_company, 'Funil de Leads', 'Pipeline padrão de captação de leads', 0)
  returning id into v_board;
  insert into public.kanban_columns (company_id, board_id, name, color, position) values
    (p_company, v_board, 'Novo',      'primary', 0),
    (p_company, v_board, 'Em contato','warning', 1),
    (p_company, v_board, 'Proposta',  'neutral', 2),
    (p_company, v_board, 'Ganho',     'success', 3),
    (p_company, v_board, 'Perdido',   'destructive', 4);
end; $$;

create or replace function app.seed_default_carriers(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_carriers (company_id, name, website, logo_url) values
    (p_company, 'Porto Seguro',     'https://www.portoseguro.com.br',    'https://logo.clearbit.com/portoseguro.com.br'),
    (p_company, 'Bradesco Seguros', 'https://www.bradescoseguros.com.br','https://logo.clearbit.com/bradescoseguros.com.br'),
    (p_company, 'SulAmérica',       'https://www.sulamerica.com.br',     'https://logo.clearbit.com/sulamerica.com.br'),
    (p_company, 'Allianz Seguros',  'https://www.allianz.com.br',        'https://logo.clearbit.com/allianz.com.br'),
    (p_company, 'MAPFRE',           'https://www.mapfre.com.br',         'https://logo.clearbit.com/mapfre.com.br'),
    (p_company, 'Tokio Marine',     'https://www.tokiomarine.com.br',    'https://logo.clearbit.com/tokiomarine.com.br'),
    (p_company, 'HDI Seguros',      'https://www.hdi.com.br',            'https://logo.clearbit.com/hdi.com.br'),
    (p_company, 'Yelum',            'https://www.yelum.com.br',          'https://logo.clearbit.com/yelum.com.br'),
    (p_company, 'Azul Seguros',     'https://www.azulseguros.com.br',    'https://logo.clearbit.com/azulseguros.com.br'),
    (p_company, 'Itaú Seguros',     'https://www.itau.com.br',           'https://logo.clearbit.com/itau.com.br'),
    (p_company, 'Zurich Seguros',   'https://www.zurich.com.br',         'https://logo.clearbit.com/zurich.com.br'),
    (p_company, 'Sompo Seguros',    'https://www.sompo.com.br',          'https://logo.clearbit.com/sompo.com.br');
end; $$;

create or replace function app.seed_default_products(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_products (company_id, name) values
    (p_company, 'Seguro Auto'), (p_company, 'Seguro de Vida'), (p_company, 'Seguro Residencial'),
    (p_company, 'Seguro Empresarial'), (p_company, 'Seguro Saúde'), (p_company, 'Seguro Viagem'),
    (p_company, 'Seguro Patrimonial'), (p_company, 'Responsabilidade Civil'),
    (p_company, 'Seguro de Condomínio'), (p_company, 'Seguro de Frota'),
    (p_company, 'Acidentes Pessoais'), (p_company, 'Seguro Garantia');
end; $$;

create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  perform app.seed_default_kanban(new.id);
  perform app.seed_default_carriers(new.id);
  perform app.seed_default_products(new.id);
  return new;
end; $$;

do $$
declare c record;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.kanban_boards where company_id = c.id) then
      perform app.seed_default_kanban(c.id);
    end if;
  end loop;
end $$;

alter table public.kanban_boards  enable row level security;
alter table public.kanban_columns enable row level security;
create policy "boards: tenant read" on public.kanban_boards for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "boards: tenant manage" on public.kanban_boards for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
create policy "columns: tenant read" on public.kanban_columns for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "columns: tenant manage" on public.kanban_columns for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

-- ───────────────────────── Billing: plans + subscription ──────────────────
create table if not exists public.plans (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  description  text,
  price_cents  int not null default 0,
  max_users    int,
  max_contacts int,
  highlight    boolean not null default false,
  position     int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

insert into public.plans (code, name, description, price_cents, max_users, max_contacts, highlight, position)
values
  ('starter',      'Starter',      'Para começar a organizar sua corretora.',     9900,  5,    500,  false, 0),
  ('professional', 'Professional', 'Para equipes em crescimento.',               24900, 15,   2000, true,  1),
  ('enterprise',   'Enterprise',   'Recursos ilimitados para grandes operações.', 59900, null, null, false, 2)
on conflict (code) do nothing;

alter table public.companies
  add column if not exists plan_id uuid references public.plans (id) on delete set null,
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '7 days');

update public.companies c
set plan_id = p.id, subscription_status = 'trialing', trial_ends_at = now() + interval '7 days'
from public.plans p
where p.code = 'professional' and c.plan_id is null;

alter table public.plans enable row level security;
drop policy if exists "plans: read" on public.plans;
create policy "plans: read" on public.plans for select using (true);

-- Asaas billing references on companies.
alter table public.companies
  add column if not exists asaas_customer_id     text,
  add column if not exists asaas_subscription_id text,
  add column if not exists card_last4 text,
  add column if not exists card_brand text;

-- Formas de pagamento (múltiplos cartões tokenizados, um padrão).
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  asaas_token text not null, last4 text, brand text, holder_name text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists payment_methods_company_idx on public.payment_methods (company_id);
alter table public.payment_methods enable row level security;
create policy "cards: tenant read" on public.payment_methods for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "cards: tenant manage" on public.payment_methods for all
  using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());

-- Company-wide system preferences (admin-managed; applies to all members).
alter table public.companies
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Soft delete / Trash — deleted items kept 5 days for admin review/restore.
alter table public.tickets         add column if not exists deleted_at timestamptz;
alter table public.calendar_events add column if not exists deleted_at timestamptz;
alter table public.customers       add column if not exists deleted_at timestamptz;
create index if not exists tickets_deleted_idx   on public.tickets         (company_id, deleted_at) where deleted_at is not null;
create index if not exists events_deleted_idx     on public.calendar_events (company_id, deleted_at) where deleted_at is not null;
create index if not exists customers_deleted_idx  on public.customers       (company_id, deleted_at) where deleted_at is not null;
create or replace function app.purge_trash()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.tickets            where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.calendar_events    where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.customers          where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.insurance_carriers where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.insurance_products where deleted_at is not null and deleted_at < now() - interval '5 days';
end; $$;

-- ───────────────────────── Catálogo: Companhias e Produtos ─────────────────
create table if not exists public.insurance_carriers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null, cnpj text, email text, phone text, website text, logo_url text, notes text,
  links jsonb not null default '[]'::jsonb,
  status entity_status not null default 'active',
  deleted_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists carriers_company_idx on public.insurance_carriers (company_id);
create index if not exists carriers_deleted_idx on public.insurance_carriers (company_id, deleted_at) where deleted_at is not null;

create table if not exists public.insurance_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  carrier_id uuid references public.insurance_carriers (id) on delete set null,
  name text not null, category text not null default 'outros', description text,
  status entity_status not null default 'active',
  deleted_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists products_company_idx on public.insurance_products (company_id);
create index if not exists products_carrier_idx on public.insurance_products (carrier_id);
create index if not exists products_deleted_idx on public.insurance_products (company_id, deleted_at) where deleted_at is not null;

alter table public.insurance_carriers enable row level security;
alter table public.insurance_products enable row level security;
create policy "carriers: tenant read" on public.insurance_carriers for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "carriers: tenant manage" on public.insurance_carriers for all
  using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
create policy "products: tenant read" on public.insurance_products for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "products: tenant manage" on public.insurance_products for all
  using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());

-- ───────────────────────── Contratos / Apólices ───────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type contract_status as enum ('active', 'renewal', 'canceled', 'expired');
  end if;
end $$;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid references public.insurance_products (id) on delete set null,
  carrier_id uuid references public.insurance_carriers (id) on delete set null,
  policy_number text, starts_at date, ends_at date,
  premium_cents int not null default 0, commission_percent numeric(6,2),
  status contract_status not null default 'active', notes text,
  deleted_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists contracts_company_idx  on public.contracts (company_id);
create index if not exists contracts_customer_idx on public.contracts (customer_id);
create index if not exists contracts_deleted_idx  on public.contracts (company_id, deleted_at) where deleted_at is not null;
alter table public.contracts enable row level security;
create policy "contracts: tenant read" on public.contracts for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "contracts: tenant manage" on public.contracts for all
  using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());

-- Update trash purge to include the catalog + contracts.
create or replace function app.purge_trash()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.tickets            where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.calendar_events    where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.customers          where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.insurance_carriers where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.insurance_products where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.contracts          where deleted_at is not null and deleted_at < now() - interval '5 days';
  delete from public.service_records    where deleted_at is not null and deleted_at < now() - interval '5 days';
end; $$;

-- ───────────────────────────── Atendimentos ───────────────────────────────
create table if not exists public.service_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid references public.insurance_products (id) on delete set null,
  channel text not null default 'whatsapp', notes text not null default '',
  author_id uuid references public.users (id) on delete set null,
  deleted_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists service_company_idx  on public.service_records (company_id, created_at desc);
create index if not exists service_customer_idx on public.service_records (customer_id);
create index if not exists service_deleted_idx  on public.service_records (company_id, deleted_at) where deleted_at is not null;
alter table public.service_records enable row level security;
create policy "service: tenant read" on public.service_records for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "service: tenant manage" on public.service_records for all
  using (company_id = app.current_company_id()) with check (company_id = app.current_company_id());
