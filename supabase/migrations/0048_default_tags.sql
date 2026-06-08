-- 0048_default_tags.sql
-- Tags padrão do sistema (geridas pelo super admin). Semeadas para toda empresa
-- nova e aplicáveis às existentes via sync. Espelha o catálogo padrão (0040).

create table if not exists public.default_tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default 'neutral',
  modules    text[] not null default '{}',
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.default_tags enable row level security;
-- Só o super admin lê/gerencia as tags padrão.
drop policy if exists "default_tags: super admin" on public.default_tags;
create policy "default_tags: super admin" on public.default_tags for all
  using (app.is_super_admin()) with check (app.is_super_admin());

-- Copia as tags padrão para uma empresa (sem duplicar pelo nome).
create or replace function app.seed_default_tags(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.tags (company_id, name, color, modules)
  select p_company, dt.name, dt.color, dt.modules
  from public.default_tags dt
  where not exists (
    select 1 from public.tags t
    where t.company_id = p_company and t.name = dt.name
  );
end; $$;

-- Inclui as tags padrão no provisionamento de empresa nova (mantém os demais seeds).
create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  perform app.seed_default_kanban(new.id);
  perform app.seed_default_task_board(new.id);
  perform app.seed_default_carriers(new.id);
  perform app.seed_default_products(new.id);
  perform app.seed_default_tags(new.id);
  return new;
end; $$;

-- Aplica as tags padrão a TODAS as empresas existentes (só super admin).
create or replace function public.sync_default_tags()
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if not app.is_super_admin() then
    raise exception 'Apenas o super admin pode sincronizar as tags padrão.';
  end if;
  for c in select id from public.companies loop
    perform app.seed_default_tags(c.id);
  end loop;
end; $$;

grant execute on function public.sync_default_tags() to authenticated;
