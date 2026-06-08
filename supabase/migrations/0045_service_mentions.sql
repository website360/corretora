-- 0045_service_mentions.sql
-- Menções (@usuário) nos atendimentos: guarda os IDs mencionados e notifica
-- cada um no sininho (mesmo padrão das tarefas, ver 0043). O autor nunca é
-- notificado de si mesmo.

alter table public.service_records
  add column if not exists mentions uuid[] not null default '{}';

create or replace function app.notify_service_mention()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  zero  uuid := '00000000-0000-0000-0000-000000000000';
  recipient uuid;
begin
  for recipient in
    select distinct x
    from unnest(coalesce(new.mentions, '{}'::uuid[])) as x
    where x is not null and x <> coalesce(actor, zero)
  loop
    insert into public.notifications (company_id, user_id, type, title, body, href)
    values (new.company_id, recipient, 'mention',
            'Você foi mencionado em um atendimento',
            left(new.notes, 140),
            '/clientes/' || new.customer_id);
  end loop;

  return new;
end; $$;

drop trigger if exists trg_notify_service_mention on public.service_records;
create trigger trg_notify_service_mention
  after insert on public.service_records
  for each row execute function app.notify_service_mention();
