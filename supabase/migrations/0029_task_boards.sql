-- ============================================================================
-- Multi-board kanban for TASKS & EVENTS (mirrors the lead kanbans).
-- Each company keeps a default "Tarefas" board (seeded from the existing
-- funnel) and may create more. Tasks and events reference a board + column.
-- ============================================================================

create table if not exists public.task_boards (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  description text,
  position    int not null default 0,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists task_boards_company_idx on public.task_boards (company_id, position);

create table if not exists public.task_columns (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  board_id    uuid not null references public.task_boards (id) on delete cascade,
  name        text not null,
  color       text not null default 'neutral',   -- neutral|primary|success|warning|destructive
  position    int not null default 0,
  is_terminal boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists task_columns_board_idx on public.task_columns (board_id, position);

alter table public.tickets
  add column if not exists board_id  uuid references public.task_boards (id)  on delete set null,
  add column if not exists column_id uuid references public.task_columns (id) on delete set null;
create index if not exists tickets_board_idx on public.tickets (board_id, column_id);

alter table public.calendar_events
  add column if not exists board_id  uuid references public.task_boards (id)  on delete set null,
  add column if not exists column_id uuid references public.task_columns (id) on delete set null;
create index if not exists calendar_events_board_idx on public.calendar_events (board_id, column_id);

-- ─────────────────── default board helper (from stages) ───────────────────
create or replace function app.seed_default_task_board(p_company uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_board uuid;
begin
  insert into public.task_boards (company_id, name, description, position, is_default)
  values (p_company, 'Tarefas', 'Quadro padrão de tarefas', 0, true)
  returning id into v_board;

  if exists (select 1 from public.task_stages where company_id = p_company) then
    insert into public.task_columns (company_id, board_id, name, color, position, is_terminal)
    select p_company, v_board, name, color, position, is_terminal
    from public.task_stages where company_id = p_company order by position;
  else
    insert into public.task_columns (company_id, board_id, name, color, position, is_terminal) values
      (p_company, v_board, 'Aberto',       'primary', 0, false),
      (p_company, v_board, 'Em andamento', 'warning', 1, false),
      (p_company, v_board, 'Concluído',    'success', 2, true);
  end if;
  return v_board;
end; $$;

-- New companies get funnel + lead board + default task board.
create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  perform app.seed_default_kanban(new.id);
  perform app.seed_default_task_board(new.id);
  return new;
end; $$;

-- ─────────────────────────── backfill existing data ───────────────────────
do $$
declare c record; v_board uuid;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.task_boards where company_id = c.id) then
      v_board := app.seed_default_task_board(c.id);

      -- map each ticket's stage to the equivalent column (same name + position)
      update public.tickets t
      set board_id = v_board, column_id = col.id
      from public.task_stages s
      join public.task_columns col
        on col.board_id = v_board and col.name = s.name and col.position = s.position
      where t.company_id = c.id and t.stage_id = s.id;

      -- tickets without a recognized stage → first column
      update public.tickets t
      set board_id = v_board,
          column_id = (select id from public.task_columns where board_id = v_board order by position limit 1)
      where t.company_id = c.id and t.column_id is null;

      -- events: finished → a terminal column, else the first column
      update public.calendar_events e
      set board_id = v_board,
          column_id = coalesce(
            case when e.finished
              then (select id from public.task_columns where board_id = v_board and is_terminal order by position limit 1)
            end,
            (select id from public.task_columns where board_id = v_board order by position limit 1)
          )
      where e.company_id = c.id;
    end if;
  end loop;
end $$;

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.task_boards  enable row level security;
alter table public.task_columns enable row level security;

create policy "task_boards: tenant read" on public.task_boards for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "task_boards: tenant manage" on public.task_boards for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

create policy "task_columns: tenant read" on public.task_columns for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "task_columns: tenant manage" on public.task_columns for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
