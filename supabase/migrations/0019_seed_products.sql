-- ============================================================================
-- Produtos de seguro mais comuns, pré-cadastrados por empresa.
-- ============================================================================

create or replace function app.seed_default_products(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.insurance_products (company_id, name) values
    (p_company, 'Seguro Auto'),
    (p_company, 'Seguro de Vida'),
    (p_company, 'Seguro Residencial'),
    (p_company, 'Seguro Empresarial'),
    (p_company, 'Seguro Saúde'),
    (p_company, 'Seguro Viagem'),
    (p_company, 'Seguro Patrimonial'),
    (p_company, 'Responsabilidade Civil'),
    (p_company, 'Seguro de Condomínio'),
    (p_company, 'Seguro de Frota'),
    (p_company, 'Acidentes Pessoais'),
    (p_company, 'Seguro Garantia');
end; $$;

create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  perform app.seed_default_kanban(new.id);
  perform app.seed_default_carriers(new.id);
  perform app.seed_default_products(new.id);
  return new;
end; $$;

-- Backfill: empresas sem produtos recebem os padrões.
do $$
declare c record;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.insurance_products where company_id = c.id) then
      perform app.seed_default_products(c.id);
    end if;
  end loop;
end $$;
