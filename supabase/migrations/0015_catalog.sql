-- ============================================================================
-- Catálogo: Companhias (seguradoras) e Produtos (ramos/produtos de seguro).
-- Um produto pode pertencer a uma companhia. Ambos tenant-scoped com RLS.
-- ============================================================================

create table if not exists public.insurance_carriers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  cnpj        text,
  email       text,
  phone       text,
  website     text,
  notes       text,
  status      entity_status not null default 'active',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists carriers_company_idx on public.insurance_carriers (company_id);
create index if not exists carriers_deleted_idx on public.insurance_carriers (company_id, deleted_at) where deleted_at is not null;

create table if not exists public.insurance_products (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  carrier_id  uuid references public.insurance_carriers (id) on delete set null,
  name        text not null,
  category    text not null default 'outros',   -- ramo: auto|vida|residencial|empresarial|saude|viagem|patrimonial|outros
  description text,
  status      entity_status not null default 'active',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists products_company_idx on public.insurance_products (company_id);
create index if not exists products_carrier_idx on public.insurance_products (carrier_id);
create index if not exists products_deleted_idx on public.insurance_products (company_id, deleted_at) where deleted_at is not null;

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.insurance_carriers enable row level security;
alter table public.insurance_products enable row level security;

create policy "carriers: tenant read" on public.insurance_carriers for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "carriers: tenant manage" on public.insurance_carriers for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

create policy "products: tenant read" on public.insurance_products for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "products: tenant manage" on public.insurance_products for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
