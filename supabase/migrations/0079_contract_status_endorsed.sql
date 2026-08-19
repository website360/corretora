-- 0079_contract_status_endorsed.sql
-- Status de contrato passam a ser: Ativo, Renovado, Endossado, Cancelado, Vencido.
--   'renewal' (Em renovação) → 'renewed' (Renovado)
--   novo valor 'endorsed' (Endossado), entre 'renewed' e 'canceled'
-- Os contratos existentes com 'renewal' migram para 'renewed' pelo próprio rename.

do $$ begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'contract_status' and e.enumlabel = 'renewal'
  ) then
    alter type contract_status rename value 'renewal' to 'renewed';
  end if;
end $$;

alter type contract_status add value if not exists 'endorsed' after 'renewed';
