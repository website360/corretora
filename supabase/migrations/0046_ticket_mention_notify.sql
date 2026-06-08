-- 0046_ticket_mention_notify.sql
-- Notifica no sininho os usuários mencionados (@) numa mensagem de tarefa.
-- Atualiza notify_ticket_message (ver 0043): primeiro avisa os mencionados com
-- type 'mention'; depois avisa responsável/envolvidos com 'ticket_message',
-- exceto o autor e quem já recebeu a menção (evita notificação dupla).

create or replace function app.notify_ticket_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tickets%rowtype;
  recipient uuid;
begin
  select * into t from public.tickets where id = new.ticket_id;
  if t.id is null then return new; end if;

  -- Menções explícitas (@) — notificação específica.
  for recipient in
    select distinct x
    from unnest(coalesce(new.mentions, '{}'::uuid[])) as x
    where x is not null and x <> new.author_id
  loop
    insert into public.notifications (company_id, user_id, type, title, body, href)
    values (t.company_id, recipient, 'mention',
            'Você foi mencionado em uma tarefa',
            'Tarefa #' || t.number || ': ' || t.title,
            '/tickets/' || t.id);
  end loop;

  -- Responsável + envolvidos, exceto o autor e quem já recebeu a menção.
  for recipient in
    select distinct uid
    from (
      select t.assignee_id as uid
      union all
      select unnest(coalesce(t.participant_ids, '{}'::uuid[]))
    ) r
    where uid is not null
      and uid <> new.author_id
      and not (uid = any (coalesce(new.mentions, '{}'::uuid[])))
  loop
    insert into public.notifications (company_id, user_id, type, title, body, href)
    values (t.company_id, recipient, 'ticket_message',
            'Novo comentário em uma tarefa',
            'Tarefa #' || t.number || ': ' || t.title,
            '/tickets/' || t.id);
  end loop;

  return new;
end; $$;
