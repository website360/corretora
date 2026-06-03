-- ============================================================================
-- Lead Kanbans — multiple customizable boards where leads land.
--
-- Each company can have any number of boards; each board has its own columns
-- (blocks). A lead (customer with kind = 'lead') references a board + column.
-- ============================================================================

create table if not exists public.kanban_boards (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists kanban_boards_company_idx on public.kanban_boards (company_id, position);

create table if not exists public.kanban_columns (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  board_id    uuid not null references public.kanban_boards (id) on delete cascade,
  name        text not null,
  color       text not null default 'neutral',   -- tone: neutral|primary|success|warning|destructive
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists kanban_columns_board_idx on public.kanban_columns (board_id, position);

-- A lead's placement on a board.
alter table public.customers
  add column if not exists board_id  uuid references public.kanban_boards (id)  on delete set null,
  add column if not exists column_id uuid references public.kanban_columns (id) on delete set null;
create index if not exists customers_board_idx on public.customers (board_id, column_id);

-- ─────────────────────────── default board helper ─────────────────────────
create or replace function app.seed_default_kanban(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_board uuid;
begin
  insert into public.kanban_boards (company_id, name, description, position)
  values (p_company, 'Funil de Leads', 'Pipeline padrão de captação de leads', 0)
  returning id into v_board;

  insert into public.kanban_columns (company_id, board_id, name, color, position) values
    (p_company, v_board, 'Novo',      'primary', 0),
    (p_company, v_board, 'Em contato','warning', 1),
    (p_company, v_board, 'Proposta',  'neutral', 2),
    (p_company, v_board, 'Ganho',     'success', 3),
    (p_company, v_board, 'Perdido',   'destructive', 4);
end; $$;

-- New companies get the default funnel (stages) and a default lead board.
create or replace function app.handle_new_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform app.seed_default_stages(new.id);
  perform app.seed_default_kanban(new.id);
  return new;
end; $$;

-- ─────────────────────────── backfill existing data ───────────────────────
do $$
declare c record;
begin
  for c in select id from public.companies loop
    if not exists (select 1 from public.kanban_boards where company_id = c.id) then
      perform app.seed_default_kanban(c.id);
    end if;
  end loop;
end $$;

-- ─────────────────────────────────── RLS ──────────────────────────────────
alter table public.kanban_boards  enable row level security;
alter table public.kanban_columns enable row level security;

create policy "boards: tenant read" on public.kanban_boards for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "boards: tenant manage" on public.kanban_boards for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

create policy "columns: tenant read" on public.kanban_columns for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "columns: tenant manage" on public.kanban_columns for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());
