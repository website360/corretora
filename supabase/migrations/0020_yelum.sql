-- ============================================================================
-- Liberty Seguros agora é Yelum — atualiza o seed das seguradoras padrão.
-- ============================================================================

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
    (p_company, 'Yelum',            'https://www.yelum.com.br',          'https://logo.clearbit.com/yelum.com.br'),
    (p_company, 'Azul Seguros',     'https://www.azulseguros.com.br',    'https://logo.clearbit.com/azulseguros.com.br'),
    (p_company, 'Itaú Seguros',     'https://www.itau.com.br',           'https://logo.clearbit.com/itau.com.br'),
    (p_company, 'Zurich Seguros',   'https://www.zurich.com.br',         'https://logo.clearbit.com/zurich.com.br'),
    (p_company, 'Sompo Seguros',    'https://www.sompo.com.br',          'https://logo.clearbit.com/sompo.com.br');
end; $$;
