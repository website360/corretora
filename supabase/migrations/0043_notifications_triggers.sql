-- 0043_notifications_triggers.sql
-- Gera notificações automaticamente para o usuário quando algo relevante muda
-- numa tarefa: vira responsável, é adicionado como envolvido, ou recebe um
-- comentário. O ator (quem fez a ação) nunca é notificado de si mesmo.

create or replace function app.notify_ticket_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  zero  uuid := '00000000-0000-0000-0000-000000000000';
  added uuid;
begin
  -- Responsável definido/alterado
  if new.assignee_id is not null
     and new.assignee_id <> coalesce(actor, zero)
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.notifications (company_id, user_id, type, title, body, href)
    values (new.company_id, new.assignee_id, 'ticket_assigned',
            'Você é o responsável por uma tarefa',
            'Tarefa #' || new.number || ': ' || new.title,
            '/tickets/' || new.id);
  end if;

  -- Envolvidos adicionados (no insert: todos; no update: só os novos)
  for added in
    select x from unnest(coalesce(new.participant_ids, '{}'::uuid[])) as x
    where x is not null
      and x <> coalesce(actor, zero)
      and (tg_op = 'INSERT' or not (x = any (coalesce(old.participant_ids, '{}'::uuid[]))))
  loop
    insert into public.notifications (company_id, user_id, type, title, body, href)
    values (new.company_id, added, 'ticket_assigned',
            'Você foi adicionado a uma tarefa',
            'Tarefa #' || new.number || ': ' || new.title,
            '/tickets/' || new.id);
  end loop;

  return new;
end; $$;

drop trigger if exists trg_notify_ticket_changes on public.tickets;
create trigger trg_notify_ticket_changes
  after insert or update of assignee_id, participant_ids on public.tickets
  for each row execute function app.notify_ticket_changes();


create or replace function app.notify_ticket_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tickets%rowtype;
  recipient uuid;
begin
  select * into t from public.tickets where id = new.ticket_id;
  if t.id is null then return new; end if;

  for recipient in
    select distinct uid
    from (
      select t.assignee_id as uid
      union all
      select unnest(coalesce(t.participant_ids, '{}'::uuid[]))
    ) r
    where uid is not null and uid <> new.author_id
  loop
    insert into public.notifications (company_id, user_id, type, title, body, href)
    values (t.company_id, recipient, 'ticket_message',
            'Novo comentário em uma tarefa',
            'Tarefa #' || t.number || ': ' || t.title,
            '/tickets/' || t.id);
  end loop;

  return new;
end; $$;

drop trigger if exists trg_notify_ticket_message on public.ticket_messages;
create trigger trg_notify_ticket_message
  after insert on public.ticket_messages
  for each row execute function app.notify_ticket_message();
