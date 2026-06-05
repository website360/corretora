-- 0035_reseed_catalog.sql
-- Correção: a redefinição de app.handle_new_company() na 0029 deixou de chamar
-- o seed de seguradoras e produtos, então empresas criadas depois passaram a
-- vir com o catálogo vazio. Restaura essas chamadas e faz o backfill das
-- empresas que ainda não têm nenhuma seguradora/produto.

create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  perform app.seed_default_kanban(new.id);
  perform app.seed_default_task_board(new.id);
  perform app.seed_default_carriers(new.id);
  perform app.seed_default_products(new.id);
  return new;
end; $$;

-- Backfill: só empresas SEM nenhuma linha (inclusive soft-deletadas) recebem o
-- padrão — quem já tem catálogo (ou apagou de propósito) não é tocado.
do $$
declare c record;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.insurance_carriers where company_id = c.id) then
      perform app.seed_default_carriers(c.id);
    end if;
    if not exists (select 1 from public.insurance_products where company_id = c.id) then
      perform app.seed_default_products(c.id);
    end if;
  end loop;
end $$;
