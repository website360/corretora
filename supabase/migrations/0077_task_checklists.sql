-- ============================================================================
-- Checklists dentro das tarefas.
--
-- Uma tarefa pode ter vários checklists nomeados (ex.: "Documentos",
-- "Vistoria"), cada um com seus itens marcáveis e reordenáveis. O progresso
-- (itens concluídos / total) aparece no cartão do kanban e no drawer.
-- ============================================================================

create table if not exists public.task_checklists (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ticket_id  uuid not null references public.tickets (id) on delete cascade,
  title      text not null,
  position   int not null default 0,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists task_checklists_ticket_idx
  on public.task_checklists (ticket_id, position);

create table if not exists public.task_checklist_items (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  checklist_id uuid not null references public.task_checklists (id) on delete cascade,
  -- Desnormalizado de propósito: permite contar o progresso de várias tarefas
  -- numa query só (cartões do kanban) sem join com task_checklists.
  ticket_id    uuid not null references public.tickets (id) on delete cascade,
  content      text not null,
  done         boolean not null default false,
  done_at      timestamptz,
  done_by      uuid references public.users (id) on delete set null,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists task_checklist_items_list_idx
  on public.task_checklist_items (checklist_id, position);
create index if not exists task_checklist_items_ticket_idx
  on public.task_checklist_items (ticket_id);

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.task_checklists enable row level security;
alter table public.task_checklist_items enable row level security;

create policy "task_checklists: tenant read" on public.task_checklists for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "task_checklists: tenant manage" on public.task_checklists for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

create policy "task_checklist_items: tenant read" on public.task_checklist_items for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "task_checklist_items: tenant manage" on public.task_checklist_items for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
