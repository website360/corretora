-- 0049_carrier_logo_overwrite.sql
-- Ajusta o sync de seguradoras: o logo/site do CATÁLOGO PADRÃO passa a
-- prevalecer sobre o da empresa (logos de seguradora são da marca, iguais para
-- todas). Antes só preenchia quando estava nulo, então atualizar um logo no
-- padrão não propagava para empresas que já tinham um logo antigo.

create or replace function app.seed_default_carriers(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- 1) Adiciona as seguradoras que faltam.
  insert into public.insurance_carriers (company_id, name, website, logo_url)
  select p_company, dc.name, dc.website, dc.logo_url
  from public.default_carriers dc
  where not exists (
    select 1 from public.insurance_carriers ic
    where ic.company_id = p_company and ic.name = dc.name and ic.deleted_at is null
  );

  -- 2) Padrão prevalece: sobrescreve logo/site quando o padrão tem valor e difere.
  update public.insurance_carriers ic
  set logo_url = coalesce(dc.logo_url, ic.logo_url),
      website  = coalesce(dc.website, ic.website)
  from public.default_carriers dc
  where ic.company_id = p_company
    and ic.name = dc.name
    and ic.deleted_at is null
    and (
      (dc.logo_url is not null and ic.logo_url is distinct from dc.logo_url) or
      (dc.website  is not null and ic.website  is distinct from dc.website)
    );
end; $$;

-- Backfill imediato para todas as empresas já ativas.
do $$
declare c record;
begin
  for c in select id from public.companies loop
    perform app.seed_default_carriers(c.id);
  end loop;
end $$;
