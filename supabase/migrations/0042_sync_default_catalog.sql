-- 0042_sync_default_catalog.sql
-- Permite ao super admin aplicar o catálogo padrão (seguradoras + produtos) a
-- TODAS as empresas existentes — adicionando o que faltar (idempotente, por
-- nome). Usado quando se adiciona um item novo ao catálogo padrão para que ele
-- também apareça nas empresas já criadas.
create or replace function public.sync_default_catalog()
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if not app.is_super_admin() then
    raise exception 'Apenas o super admin pode sincronizar o catálogo padrão.';
  end if;
  for c in select id from public.companies loop
    perform app.seed_default_carriers(c.id);
    perform app.seed_default_products(c.id);
  end loop;
end; $$;

grant execute on function public.sync_default_catalog() to authenticated;
