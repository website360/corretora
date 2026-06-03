-- ============================================================================
-- Contratos / Apólices — vínculo Cliente + Produto (+ Seguradora).
-- A seguradora vem do produto, mas é gravada no contrato (snapshot).
-- ============================================================================

create type contract_status as enum ('active', 'renewal', 'canceled', 'expired');

create table if not exists public.contracts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  customer_id   uuid not null references public.customers (id) on delete cascade,
  product_id    uuid references public.insurance_products (id) on delete set null,
  carrier_id    uuid references public.insurance_carriers (id) on delete set null,
  policy_number text,
  starts_at     date,
  ends_at       date,
  premium_cents int not null default 0,           -- prêmio em centavos (BRL)
  commission_percent numeric(6,2),                -- comissão da corretora (%)
  status        contract_status not null default 'active',
  notes         text,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists contracts_company_idx  on public.contracts (company_id);
create index if not exists contracts_customer_idx on public.contracts (customer_id);
create index if not exists contracts_deleted_idx  on public.contracts (company_id, deleted_at) where deleted_at is not null;

alter table public.contracts enable row level security;
create policy "contracts: tenant read" on public.contracts for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "contracts: tenant manage" on public.contracts for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
