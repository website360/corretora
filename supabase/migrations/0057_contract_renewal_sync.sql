-- 0057_contract_renewal_sync.sql
-- Ao editar a vigência (ends_at) de um contrato, atualiza automaticamente o
-- prazo da tarefa de renovação vinculada (ticket com contract_id + category
-- 'renewal'), mantendo o lembrete 30 dias antes do novo fim.

create or replace function app.sync_contract_renewal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ends_at is distinct from old.ends_at then
    update public.tickets
    set due_at = case
          when new.ends_at is null then null
          else ((new.ends_at - 30) + time '09:00')::timestamptz
        end,
        updated_at = now()
    where contract_id = new.id
      and category = 'renewal'
      and status <> 'closed'
      and deleted_at is null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_sync_contract_renewal on public.contracts;
create trigger trg_sync_contract_renewal
  after update on public.contracts
  for each row execute function app.sync_contract_renewal();
