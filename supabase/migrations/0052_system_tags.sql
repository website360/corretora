-- 0052_system_tags.sql
-- Tags semeadas a partir do catálogo padrão (default_tags) viram itens do
-- SISTEMA: a corretora não pode editá-las/excluí-las (se quiser outra, cria a
-- sua). Marca com is_system e bloqueia update/delete via RLS para o tenant.

alter table public.tags
  add column if not exists is_system boolean not null default false;

-- Backfill: marca como sistema as tags já semeadas (batem com default_tags).
update public.tags t
set is_system = true
where not t.is_system
  and exists (select 1 from public.default_tags dt where dt.name = t.name);

-- seed_default_tags passa a marcar is_system = true.
create or replace function app.seed_default_tags(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.tags (company_id, name, color, modules, is_system)
  select p_company, dt.name, dt.color, dt.modules, true
  from public.default_tags dt
  where not exists (
    select 1 from public.tags t
    where t.company_id = p_company and t.name = dt.name
  );
end; $$;

-- RLS: separa o "manage" em insert/update/delete; tenant NÃO altera/exclui
-- tags do sistema. (A leitura continua pela policy "tags: tenant read".)
drop policy if exists "tags: tenant manage" on public.tags;

create policy "tags: tenant insert" on public.tags for insert
  with check (company_id = app.current_company_id());

create policy "tags: tenant update" on public.tags for update
  using (company_id = app.current_company_id() and not is_system)
  with check (company_id = app.current_company_id() and not is_system);

create policy "tags: tenant delete" on public.tags for delete
  using (company_id = app.current_company_id() and not is_system);
