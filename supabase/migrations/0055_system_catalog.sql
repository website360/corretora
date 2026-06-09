-- 0055_system_catalog.sql
-- Aplica a regra "item padrão travado + vínculo por ID" (igual às tags) a
-- SEGURADORAS e PRODUTOS. Editar/excluir um item padrão no /admin propaga/
-- remove nas corretoras; a corretora não edita/exclui os padrão (cria os seus).

-- ── Colunas ──
alter table public.insurance_carriers
  add column if not exists is_system boolean not null default false,
  add column if not exists default_carrier_id uuid references public.default_carriers (id) on delete cascade;

alter table public.insurance_products
  add column if not exists is_system boolean not null default false,
  add column if not exists default_product_id uuid references public.default_products (id) on delete cascade;

-- ── Vínculo pelo nome (estado atual) ──
update public.insurance_carriers ic
set default_carrier_id = dc.id
from public.default_carriers dc
where dc.name = ic.name and ic.default_carrier_id is null;

update public.insurance_products ip
set default_product_id = dp.id
from public.default_products dp
where dp.name = ip.name and ip.default_product_id is null;

update public.insurance_carriers set is_system = (default_carrier_id is not null);
update public.insurance_products set is_system = (default_product_id is not null);

-- ── Seeds por ID (marcam is_system + vínculo; propagação via trigger) ──
create or replace function app.seed_default_carriers(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_carriers (company_id, name, website, logo_url, is_system, default_carrier_id)
  select p_company, dc.name, dc.website, dc.logo_url, true, dc.id
  from public.default_carriers dc
  where not exists (
    select 1 from public.insurance_carriers ic
    where ic.company_id = p_company
      and (ic.default_carrier_id = dc.id or ic.name = dc.name)
      and ic.deleted_at is null
  );
end; $$;

create or replace function app.seed_default_products(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_products (company_id, name, category, is_system, default_product_id)
  select p_company, dp.name, dp.category, true, dp.id
  from public.default_products dp
  where not exists (
    select 1 from public.insurance_products ip
    where ip.company_id = p_company
      and (ip.default_product_id = dp.id or ip.name = dp.name)
      and ip.deleted_at is null
  );
end; $$;

-- ── Triggers de propagação (edição da default → cópias das corretoras) ──
create or replace function app.propagate_default_carrier()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.insurance_carriers
  set name = new.name, website = new.website, logo_url = new.logo_url
  where default_carrier_id = new.id and deleted_at is null;
  return new;
end; $$;
drop trigger if exists trg_propagate_default_carrier on public.default_carriers;
create trigger trg_propagate_default_carrier
  after update on public.default_carriers
  for each row execute function app.propagate_default_carrier();

create or replace function app.propagate_default_product()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.insurance_products
  set name = new.name, category = new.category
  where default_product_id = new.id and deleted_at is null;
  return new;
end; $$;
drop trigger if exists trg_propagate_default_product on public.default_products;
create trigger trg_propagate_default_product
  after update on public.default_products
  for each row execute function app.propagate_default_product();

-- ── RLS: tenant não edita/exclui itens do sistema (delete é soft = update) ──
drop policy if exists "carriers: tenant manage" on public.insurance_carriers;
create policy "carriers: tenant insert" on public.insurance_carriers for insert
  with check (company_id = app.current_company_id());
create policy "carriers: tenant update" on public.insurance_carriers for update
  using (company_id = app.current_company_id() and not is_system)
  with check (company_id = app.current_company_id() and not is_system);
create policy "carriers: tenant delete" on public.insurance_carriers for delete
  using (company_id = app.current_company_id() and not is_system);

drop policy if exists "products: tenant manage" on public.insurance_products;
create policy "products: tenant insert" on public.insurance_products for insert
  with check (company_id = app.current_company_id());
create policy "products: tenant update" on public.insurance_products for update
  using (company_id = app.current_company_id() and not is_system)
  with check (company_id = app.current_company_id() and not is_system);
create policy "products: tenant delete" on public.insurance_products for delete
  using (company_id = app.current_company_id() and not is_system);
