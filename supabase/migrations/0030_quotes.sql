-- ============================================================================
-- Orçamentos (quotes): a quote belongs to a customer and holds several
-- comparable options (carrier + product + premium). The chosen option becomes
-- a contract once the quote is signed (status = won).
-- ============================================================================

do $$ begin
  create type quote_status as enum ('draft', 'sent', 'awaiting_signature', 'won', 'lost');
exception when duplicate_object then null; end $$;

create sequence if not exists quote_number_seq;

create table if not exists public.quotes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  number      bigint not null default nextval('quote_number_seq'),
  customer_id uuid not null references public.customers (id) on delete cascade,
  owner_id    uuid references public.users (id) on delete set null,
  status      quote_status not null default 'draft',
  title       text,
  notes       text,
  created_by  uuid references public.users (id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists quotes_company_idx on public.quotes (company_id);
create index if not exists quotes_customer_idx on public.quotes (customer_id);

create table if not exists public.quote_options (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  quote_id           uuid not null references public.quotes (id) on delete cascade,
  carrier_id         uuid references public.insurance_carriers (id) on delete set null,
  product_id         uuid references public.insurance_products (id) on delete set null,
  premium_cents      int not null default 0,
  commission_percent numeric(6, 2),
  notes              text,
  is_selected        boolean not null default false,
  position           int not null default 0,
  created_at         timestamptz not null default now()
);
create index if not exists quote_options_quote_idx on public.quote_options (quote_id);

-- Link a generated contract back to its originating quote (traceability).
alter table public.contracts
  add column if not exists quote_id uuid references public.quotes (id) on delete set null;

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.quotes        enable row level security;
alter table public.quote_options enable row level security;

create policy "quotes: tenant read" on public.quotes for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "quotes: tenant manage" on public.quotes for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

create policy "quote_options: tenant read" on public.quote_options for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "quote_options: tenant manage" on public.quote_options for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
