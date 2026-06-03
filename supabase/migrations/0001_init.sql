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
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);
create index users_company_idx on public.users (company_id);

-- ───────────────────────────── customers ──────────────────────────────────
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
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
  end if;

  insert into public.users (id, company_id, name, email, role)
  values (
    new.id,
    v_company_id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'admin')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
