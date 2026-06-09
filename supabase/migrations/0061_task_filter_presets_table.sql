-- 0061_task_filter_presets_table.sql
-- Filtros salvos da tela de Tarefas viram uma TABELA própria, para suportar
-- compartilhar com a equipe. Cada preset tem dono (user_id) e uma flag `shared`.
-- Visibilidade: o dono vê os seus; todos da empresa veem os marcados como
-- compartilhados. Só o dono edita/exclui. O "último filtro" continua por
-- usuário em users.task_filter_last (não muda).

create table if not exists public.task_filter_presets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default app.current_company_id() references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  name text not null,
  filters jsonb not null,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists task_filter_presets_company_idx
  on public.task_filter_presets (company_id);
create index if not exists task_filter_presets_user_idx
  on public.task_filter_presets (user_id);

alter table public.task_filter_presets enable row level security;

-- Vê: os próprios + os compartilhados, sempre dentro da empresa.
create policy "presets: read own or shared"
  on public.task_filter_presets for select
  using (
    company_id = app.current_company_id()
    and (shared or user_id = auth.uid())
  );

-- Cria: só para si, dentro da própria empresa.
create policy "presets: insert own"
  on public.task_filter_presets for insert
  with check (company_id = app.current_company_id() and user_id = auth.uid());

-- Edita / exclui: só o dono.
create policy "presets: update own"
  on public.task_filter_presets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "presets: delete own"
  on public.task_filter_presets for delete
  using (user_id = auth.uid());

-- Migra os presets que estavam em users.task_filter_presets (jsonb) para linhas
-- pessoais (shared = false), preservando nome e filtros.
insert into public.task_filter_presets (company_id, user_id, name, filters, shared)
select u.company_id, u.id, elem ->> 'name', elem -> 'filters', false
from public.users u,
     lateral jsonb_array_elements(coalesce(u.task_filter_presets, '[]'::jsonb)) elem
where jsonb_typeof(u.task_filter_presets) = 'array'
  and elem ? 'name'
  and elem ? 'filters';
