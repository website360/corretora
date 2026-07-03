-- ============================================================================
-- Fixed (locked) kanban columns — every lead board keeps three non-removable
-- blocks: the FIRST is "Novo" (slot='new') and the LAST TWO are "Ganho"
-- (slot='won') and "Perdido" (slot='lost'). Custom blocks live in between.
--
-- `slot` marks these anchors. UI/service block deleting a slotted column and
-- always insert new columns before the won/lost pair.
-- ============================================================================

alter table public.kanban_columns
  add column if not exists slot text
    check (slot is null or slot in ('new', 'won', 'lost'));

-- At most one column per slot per board.
create unique index if not exists kanban_columns_board_slot_idx
  on public.kanban_columns (board_id, slot) where slot is not null;

-- ─────────────────────────── backfill existing boards ─────────────────────
-- Match the anchors by name (Novo / Ganho / Perdido); create any that are
-- missing; then normalize positions so Novo is first and Ganho/Perdido last.
do $$
declare
  b        record;
  v_new    uuid;
  v_won    uuid;
  v_lost   uuid;
  v_maxpos int;
begin
  for b in select id, company_id from public.kanban_boards loop
    -- NEW: prefer a column literally named "Novo", else the first one.
    select id into v_new from public.kanban_columns
      where board_id = b.id and lower(name) = 'novo' order by position limit 1;
    if v_new is null then
      select id into v_new from public.kanban_columns
        where board_id = b.id order by position limit 1;
    end if;

    select id into v_won from public.kanban_columns
      where board_id = b.id and lower(name) = 'ganho' order by position limit 1;
    select id into v_lost from public.kanban_columns
      where board_id = b.id and lower(name) = 'perdido' order by position limit 1;

    select coalesce(max(position), -1) into v_maxpos
      from public.kanban_columns where board_id = b.id;

    if v_won is null then
      insert into public.kanban_columns (company_id, board_id, name, color, position)
      values (b.company_id, b.id, 'Ganho', 'success', v_maxpos + 1)
      returning id into v_won;
      v_maxpos := v_maxpos + 1;
    end if;

    if v_lost is null then
      insert into public.kanban_columns (company_id, board_id, name, color, position)
      values (b.company_id, b.id, 'Perdido', 'destructive', v_maxpos + 1)
      returning id into v_lost;
      v_maxpos := v_maxpos + 1;
    end if;

    -- Board with no columns at all — create Novo up front.
    if v_new is null then
      insert into public.kanban_columns (company_id, board_id, name, color, position)
      values (b.company_id, b.id, 'Novo', 'primary', -1)
      returning id into v_new;
    end if;

    update public.kanban_columns set slot = 'new'  where id = v_new;
    update public.kanban_columns set slot = 'won'  where id = v_won;
    update public.kanban_columns set slot = 'lost' where id = v_lost;

    -- Force the anchors to the edges, then resequence 0..n by current order.
    update public.kanban_columns set position = -1     where id = v_new;
    update public.kanban_columns set position = 100000 where id = v_won;
    update public.kanban_columns set position = 100001 where id = v_lost;

    with ordered as (
      select id, row_number() over (order by position) - 1 as rn
      from public.kanban_columns where board_id = b.id
    )
    update public.kanban_columns c set position = o.rn
      from ordered o where c.id = o.id;
  end loop;
end $$;

-- ─────────────────────────── default board helper ─────────────────────────
create or replace function app.seed_default_kanban(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_board uuid;
begin
  insert into public.kanban_boards (company_id, name, description, position)
  values (p_company, 'Funil de Leads', 'Pipeline padrão de captação de leads', 0)
  returning id into v_board;

  insert into public.kanban_columns (company_id, board_id, name, color, position, slot) values
    (p_company, v_board, 'Novo',       'primary',     0, 'new'),
    (p_company, v_board, 'Em contato', 'warning',     1, null),
    (p_company, v_board, 'Proposta',   'neutral',     2, null),
    (p_company, v_board, 'Ganho',      'success',     3, 'won'),
    (p_company, v_board, 'Perdido',    'destructive', 4, 'lost');
end; $$;
