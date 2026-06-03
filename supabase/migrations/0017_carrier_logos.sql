-- ============================================================================
-- Logo nas companhias + seed das seguradoras mais comuns (com logos).
-- Logos servidos pela Clearbit Logo API (logo.clearbit.com/<domínio>).
-- ============================================================================

alter table public.insurance_carriers add column if not exists logo_url text;

create or replace function app.seed_default_carriers(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_carriers (company_id, name, website, logo_url) values
    (p_company, 'Porto Seguro',     'https://www.portoseguro.com.br',    'https://logo.clearbit.com/portoseguro.com.br'),
    (p_company, 'Bradesco Seguros', 'https://www.bradescoseguros.com.br','https://logo.clearbit.com/bradescoseguros.com.br'),
    (p_company, 'SulAmérica',       'https://www.sulamerica.com.br',     'https://logo.clearbit.com/sulamerica.com.br'),
    (p_company, 'Allianz Seguros',  'https://www.allianz.com.br',        'https://logo.clearbit.com/allianz.com.br'),
    (p_company, 'MAPFRE',           'https://www.mapfre.com.br',         'https://logo.clearbit.com/mapfre.com.br'),
    (p_company, 'Tokio Marine',     'https://www.tokiomarine.com.br',    'https://logo.clearbit.com/tokiomarine.com.br'),
    (p_company, 'HDI Seguros',      'https://www.hdi.com.br',            'https://logo.clearbit.com/hdi.com.br'),
    (p_company, 'Liberty Seguros',  'https://www.libertyseguros.com.br', 'https://logo.clearbit.com/libertyseguros.com.br'),
    (p_company, 'Azul Seguros',     'https://www.azulseguros.com.br',    'https://logo.clearbit.com/azulseguros.com.br'),
    (p_company, 'Itaú Seguros',     'https://www.itau.com.br',           'https://logo.clearbit.com/itau.com.br'),
    (p_company, 'Zurich Seguros',   'https://www.zurich.com.br',         'https://logo.clearbit.com/zurich.com.br'),
    (p_company, 'Sompo Seguros',    'https://www.sompo.com.br',          'https://logo.clearbit.com/sompo.com.br');
end; $$;

-- New companies get the default carriers too.
create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  perform app.seed_default_kanban(new.id);
  perform app.seed_default_carriers(new.id);
  return new;
end; $$;

-- Backfill: seed carriers for companies that don't have any yet.
do $$
declare c record;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.insurance_carriers where company_id = c.id) then
      perform app.seed_default_carriers(c.id);
    end if;
  end loop;
end $$;
