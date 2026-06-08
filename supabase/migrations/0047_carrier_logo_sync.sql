-- 0047_carrier_logo_sync.sql
-- Corrige o "Aplicar a todas as empresas": o seed só INSERIA as seguradoras
-- faltantes e nunca atualizava as já existentes, então o logo (e o site) do
-- catálogo padrão nunca chegava às empresas que já tinham a seguradora pelo
-- nome. Agora também preenche logo/site faltantes — sem sobrescrever o que a
-- corretora já definiu.

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

  -- 2) Preenche logo/site faltantes nas que já existem (não sobrescreve).
  update public.insurance_carriers ic
  set logo_url = coalesce(ic.logo_url, dc.logo_url),
      website  = coalesce(ic.website, dc.website)
  from public.default_carriers dc
  where ic.company_id = p_company
    and ic.name = dc.name
    and ic.deleted_at is null
    and (ic.logo_url is null or ic.website is null)
    and (dc.logo_url is not null or dc.website is not null);
end; $$;

-- Backfill imediato para todas as empresas já ativas.
do $$
declare c record;
begin
  for c in select id from public.companies loop
    perform app.seed_default_carriers(c.id);
  end loop;
end $$;
