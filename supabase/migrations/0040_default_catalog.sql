-- 0040_default_catalog.sql
-- Catálogo padrão do SISTEMA (seguradoras + produtos), gerenciado pelo super
-- admin no painel /admin. Empresas novas passam a ser semeadas a partir destas
-- tabelas (em vez de uma lista fixa no código).

create table if not exists public.default_carriers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  website    text,
  logo_url   text,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.default_products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null default 'outros',
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.default_carriers enable row level security;
alter table public.default_products enable row level security;

-- Só o super admin lê/gerencia o catálogo padrão.
create policy "default_carriers: super admin" on public.default_carriers for all
  using (app.is_super_admin()) with check (app.is_super_admin());
create policy "default_products: super admin" on public.default_products for all
  using (app.is_super_admin()) with check (app.is_super_admin());

-- Seed inicial a partir da lista padrão atual (idempotente por nome).
insert into public.default_carriers (name, website, logo_url, position)
select v.name, v.website, v.logo, v.pos
from (values
  ('Porto Seguro',     'https://www.portoseguro.com.br',    'https://logo.clearbit.com/portoseguro.com.br',     0),
  ('Bradesco Seguros', 'https://www.bradescoseguros.com.br','https://logo.clearbit.com/bradescoseguros.com.br', 1),
  ('SulAmérica',       'https://www.sulamerica.com.br',     'https://logo.clearbit.com/sulamerica.com.br',      2),
  ('Allianz Seguros',  'https://www.allianz.com.br',        'https://logo.clearbit.com/allianz.com.br',         3),
  ('MAPFRE',           'https://www.mapfre.com.br',         'https://logo.clearbit.com/mapfre.com.br',          4),
  ('Tokio Marine',     'https://www.tokiomarine.com.br',    'https://logo.clearbit.com/tokiomarine.com.br',     5),
  ('HDI Seguros',      'https://www.hdi.com.br',            'https://logo.clearbit.com/hdi.com.br',             6),
  ('Yelum',            'https://www.yelum.com.br',          'https://logo.clearbit.com/yelum.com.br',           7),
  ('Azul Seguros',     'https://www.azulseguros.com.br',    'https://logo.clearbit.com/azulseguros.com.br',     8),
  ('Itaú Seguros',     'https://www.itau.com.br',           'https://logo.clearbit.com/itau.com.br',            9),
  ('Zurich Seguros',   'https://www.zurich.com.br',         'https://logo.clearbit.com/zurich.com.br',         10),
  ('Sompo Seguros',    'https://www.sompo.com.br',          'https://logo.clearbit.com/sompo.com.br',          11)
) as v(name, website, logo, pos)
where not exists (select 1 from public.default_carriers dc where dc.name = v.name);

insert into public.default_products (name, position)
select v.name, v.pos
from (values
  ('Seguro Auto', 0),
  ('Seguro de Vida', 1),
  ('Seguro Residencial', 2),
  ('Seguro Empresarial', 3),
  ('Seguro Saúde', 4),
  ('Seguro Viagem', 5),
  ('Seguro Patrimonial', 6),
  ('Responsabilidade Civil', 7),
  ('Seguro de Condomínio', 8),
  ('Seguro de Frota', 9),
  ('Acidentes Pessoais', 10),
  ('Seguro Garantia', 11)
) as v(name, pos)
where not exists (select 1 from public.default_products dp where dp.name = v.name);

-- Seeds de empresa nova agora LEEM do catálogo padrão editável.
create or replace function app.seed_default_carriers(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_carriers (company_id, name, website, logo_url)
  select p_company, dc.name, dc.website, dc.logo_url
  from public.default_carriers dc
  where not exists (
    select 1 from public.insurance_carriers ic
    where ic.company_id = p_company and ic.name = dc.name and ic.deleted_at is null
  );
end; $$;

create or replace function app.seed_default_products(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_products (company_id, name, category)
  select p_company, dp.name, dp.category
  from public.default_products dp
  where not exists (
    select 1 from public.insurance_products ip
    where ip.company_id = p_company and ip.name = dp.name and ip.deleted_at is null
  );
end; $$;
