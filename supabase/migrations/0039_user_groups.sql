-- 0039_user_groups.sql
-- Grupos de usuários (por empresa). Usados para referenciar vários usuários de
-- uma vez nas tarefas/eventos (ao escolher um grupo, seus membros entram como
-- envolvidos). Tenant-scoped com RLS.
create table if not exists public.user_groups (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  member_ids  uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists user_groups_company_idx on public.user_groups (company_id);

alter table public.user_groups enable row level security;

create policy "groups: tenant read" on public.user_groups for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "groups: tenant manage" on public.user_groups for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
