-- 0053_default_tag_link.sql
-- Vincula a tag da corretora à default de origem por ID (não por nome). Assim,
-- editar/excluir uma tag padrão PROPAGA/REMOVE as cópias nas corretoras — sem
-- gerar órfãs/duplicatas ao renomear (causa do problema relatado).

alter table public.tags
  add column if not exists default_tag_id uuid references public.default_tags (id) on delete cascade;

-- Vincula as existentes pelo nome atual.
update public.tags t
set default_tag_id = dt.id
from public.default_tags dt
where dt.name = t.name and t.default_tag_id is null;

-- Remove órfãs inequívocas: leftovers de default antiga com NOME de espaço
-- duplo (gerado por seed, não digitado por humano), não vinculadas e ausentes
-- do catálogo atual.
delete from public.tags as t
where t.default_tag_id is null
  and position('  ' in t.name) > 0
  and not exists (select 1 from public.default_tags dt where dt.name = t.name);

-- is_system reflete o vínculo.
update public.tags set is_system = (default_tag_id is not null);

-- Seed por ID (não recria ao renomear; evita colisão de nome).
create or replace function app.seed_default_tags(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.tags (company_id, name, color, modules, is_system, default_tag_id)
  select p_company, dt.name, dt.color, dt.modules, true, dt.id
  from public.default_tags dt
  where not exists (
    select 1 from public.tags t
    where t.company_id = p_company and (t.default_tag_id = dt.id or t.name = dt.name)
  );
end; $$;

-- Propaga edições da default para as cópias das corretoras.
create or replace function app.propagate_default_tag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.tags
  set name = new.name, color = new.color, modules = new.modules
  where default_tag_id = new.id;
  return new;
end; $$;

drop trigger if exists trg_propagate_default_tag on public.default_tags;
create trigger trg_propagate_default_tag
  after update on public.default_tags
  for each row execute function app.propagate_default_tag();
