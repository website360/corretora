-- 0036_catalog_idempotent_backfill.sql
-- Garante que TODA empresa tenha o catálogo padrão de seguradoras e produtos.
-- O backfill anterior (0035) só populava empresas 100% vazias, então quem já
-- tinha alguns itens (ex.: Fibria Seguros) ficou sem o restante do padrão.
--
-- Torna os seeds idempotentes (insere cada item só se ainda não existir, por
-- nome, ativo) e reaplica em todas as empresas — sem criar duplicatas.

create or replace function app.seed_default_carriers(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_carriers (company_id, name, website, logo_url)
  select p_company, v.name, v.website, v.logo
  from (values
    ('Porto Seguro',     'https://www.portoseguro.com.br',    'https://logo.clearbit.com/portoseguro.com.br'),
    ('Bradesco Seguros', 'https://www.bradescoseguros.com.br','https://logo.clearbit.com/bradescoseguros.com.br'),
    ('SulAmérica',       'https://www.sulamerica.com.br',     'https://logo.clearbit.com/sulamerica.com.br'),
    ('Allianz Seguros',  'https://www.allianz.com.br',        'https://logo.clearbit.com/allianz.com.br'),
    ('MAPFRE',           'https://www.mapfre.com.br',         'https://logo.clearbit.com/mapfre.com.br'),
    ('Tokio Marine',     'https://www.tokiomarine.com.br',    'https://logo.clearbit.com/tokiomarine.com.br'),
    ('HDI Seguros',      'https://www.hdi.com.br',            'https://logo.clearbit.com/hdi.com.br'),
    ('Yelum',            'https://www.yelum.com.br',          'https://logo.clearbit.com/yelum.com.br'),
    ('Azul Seguros',     'https://www.azulseguros.com.br',    'https://logo.clearbit.com/azulseguros.com.br'),
    ('Itaú Seguros',     'https://www.itau.com.br',           'https://logo.clearbit.com/itau.com.br'),
    ('Zurich Seguros',   'https://www.zurich.com.br',         'https://logo.clearbit.com/zurich.com.br'),
    ('Sompo Seguros',    'https://www.sompo.com.br',          'https://logo.clearbit.com/sompo.com.br')
  ) as v(name, website, logo)
  where not exists (
    select 1 from public.insurance_carriers ic
    where ic.company_id = p_company and ic.name = v.name and ic.deleted_at is null
  );
end; $$;

create or replace function app.seed_default_products(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_products (company_id, name)
  select p_company, v.name
  from (values
    ('Seguro Auto'),
    ('Seguro de Vida'),
    ('Seguro Residencial'),
    ('Seguro Empresarial'),
    ('Seguro Saúde'),
    ('Seguro Viagem'),
    ('Seguro Patrimonial'),
    ('Responsabilidade Civil'),
    ('Seguro de Condomínio'),
    ('Seguro de Frota'),
    ('Acidentes Pessoais'),
    ('Seguro Garantia')
  ) as v(name)
  where not exists (
    select 1 from public.insurance_products ip
    where ip.company_id = p_company and ip.name = v.name and ip.deleted_at is null
  );
end; $$;

-- Reaplica em todas as empresas: agora só adiciona o que falta.
do $$
declare c record;
begin
  for c in select id from public.companies loop
    perform app.seed_default_carriers(c.id);
    perform app.seed_default_products(c.id);
  end loop;
end $$;
