-- ============================================================================
-- Billing — subscription plans, 7-day trial and per-plan limits.
--
-- Plans are a global catalog (not tenant-scoped). Each company references a
-- chosen plan and carries a subscription status + trial expiry. Real charging
-- (Asaas) is wired separately; this is the data foundation.
-- ============================================================================

create table if not exists public.plans (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,            -- starter | professional | enterprise
  name         text not null,
  description  text,
  price_cents  int not null default 0,          -- monthly price in cents (BRL)
  max_users    int,                             -- null = unlimited
  max_contacts int,                             -- null = unlimited
  highlight    boolean not null default false,  -- "most popular"
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

-- ─────────────────────────── company subscription ─────────────────────────
alter table public.companies
  add column if not exists plan_id uuid references public.plans (id) on delete set null,
  add column if not exists subscription_status text not null default 'trialing', -- trialing|active|past_due|canceled
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '7 days');

-- Existing companies: start them on a Professional trial so the counter shows.
update public.companies c
set plan_id = p.id,
    subscription_status = 'trialing',
    trial_ends_at = now() + interval '7 days'
from public.plans p
where p.code = 'professional'
  and c.plan_id is null;

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.plans enable row level security;

-- Plans are a public catalog — any authenticated user may read them.
drop policy if exists "plans: read" on public.plans;
create policy "plans: read" on public.plans for select using (true);
