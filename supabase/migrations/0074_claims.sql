-- ============================================================================
-- Sinistros (claims): a claim belongs to a customer and optionally to a
-- contract/policy. The customer can request one via the portal; the broker
-- manages it internally. Status follows the claim lifecycle.
-- ============================================================================

do $$ begin
  create type claim_status as enum (
    'requested',  -- solicitado pelo cliente (portal), aguardando a corretora
    'analysis',   -- em análise
    'approved',   -- aprovado
    'denied',     -- negado
    'paid',       -- pago / indenizado
    'closed'      -- encerrado
  );
exception when duplicate_object then null; end $$;

create sequence if not exists claim_number_seq;

create table if not exists public.claims (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  number       bigint not null default nextval('claim_number_seq'),
  customer_id  uuid not null references public.customers (id) on delete cascade,
  contract_id  uuid references public.contracts (id) on delete set null,
  product_id   uuid references public.insurance_products (id) on delete set null,
  owner_id     uuid references public.users (id) on delete set null,
  status       claim_status not null default 'requested',
  title        text not null,
  description  text,
  occurred_at  date,
  amount_cents int,
  /** Origem do registro: portal (cliente) ou interno (corretora). */
  source       text not null default 'internal',
  created_by   uuid references public.users (id) on delete set null,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists claims_company_idx on public.claims (company_id);
create index if not exists claims_customer_idx on public.claims (customer_id);
create index if not exists claims_contract_idx on public.claims (contract_id);
create index if not exists claims_trash_idx on public.claims (deleted_at) where deleted_at is not null;

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.claims enable row level security;

create policy "claims: tenant read" on public.claims for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "claims: tenant manage" on public.claims for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
