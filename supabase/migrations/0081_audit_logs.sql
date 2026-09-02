-- 0081_audit_logs.sql
-- Log de auditoria do sistema — aba "Log" do Painel SaaS.
--
-- Toda escrita (INSERT/UPDATE/DELETE) em qualquer tabela de `public` vira uma
-- linha aqui, com quem fez, quando, em qual registro e o que exatamente mudou.
--
-- Por que no banco e não na aplicação: o front fala direto com o PostgREST
-- (src/services/*.service.ts). Um log escrito pela aplicação seria cego às
-- rotas /api, aos webhooks e a qualquer UPDATE rodado à mão no SQL Editor.
-- O trigger é o único ponto por onde tudo passa obrigatoriamente.

-- ============================================================================
-- Tabela
-- ============================================================================
create table if not exists public.audit_logs (
  id           bigint generated always as identity primary key,
  company_id   uuid,
  actor_id     uuid,
  actor_name   text,
  actor_email  text,
  action       text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name   text not null,
  record_id    text,
  record_label text,
  changes      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.audit_logs is
  'Trilha de auditoria: uma linha por escrita em qualquer tabela de public.';
comment on column public.audit_logs.actor_name is
  'Cópia do nome no momento da ação: o log continua legível depois que o usuário é excluído.';
comment on column public.audit_logs.changes is
  '{coluna: {from, to}}. UPDATE guarda só o que mudou; INSERT/DELETE guardam a linha.';

-- Sem foreign keys, de propósito. `company_id` referenciando companies quebraria
-- a exclusão de empresa: o cascade apaga a linha pai antes das filhas, e o log
-- das filhas apontaria para uma empresa que já não existe — a transação inteira
-- falharia. O log é registro histórico, não dado relacional vivo.

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_company_idx on public.audit_logs (company_id, created_at desc);
create index if not exists audit_logs_table_idx   on public.audit_logs (table_name, created_at desc);
create index if not exists audit_logs_actor_idx   on public.audit_logs (actor_id, created_at desc);

-- ============================================================================
-- Acesso: leitura só do super admin; ninguém escreve nem apaga direto
-- ============================================================================
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs: super admin read" on public.audit_logs;
create policy "audit_logs: super admin read" on public.audit_logs
  for select using (app.is_super_admin());

-- Nenhuma política de insert/update/delete: quem grava é o trigger (SECURITY
-- DEFINER, dono da tabela). Nem um admin de corretora consegue apagar o próprio
-- rastro pelo PostgREST.
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

-- ============================================================================
-- Segredos → gravados como *** (a mudança fica registrada, o valor não)
-- ============================================================================
-- Vale para nome de coluna E para chave dentro de jsonb: os segredos das
-- integrações moram aninhados em companies.settings.integrations
-- (smtp.password, clicksign.apiToken, whatsapp.*.token, wordpress.apiKey…).
--
-- As exceções são deliberadas: `modules.key`, `company_modules.module_key` e
-- `platform_settings.key` são NOMES de configuração ('kanban', 'asaas_api_key'),
-- não valores — mascará-los esconderia justamente o que mudou. E
-- `portal_must_change_password` é um sim/não, não uma senha.
create or replace function app.audit_is_secret_key(p_key text)
returns boolean
language sql immutable
as $fn$
  select p_key ~* '(password|senha|secret|token|api_?key|private)'
     and p_key !~* '(must_change_password|^module_key$|^key$)';
$fn$;

-- O valor de platform_settings mora numa coluna genérica chamada `value`;
-- é lá que ficam a chave da Asaas e afins.
create or replace function app.audit_is_secret(p_table text, p_col text)
returns boolean
language sql immutable
as $fn$
  select app.audit_is_secret_key(p_col)
      or (p_table = 'platform_settings' and p_col = 'value');
$fn$;

-- Varre um jsonb inteiro trocando o valor de toda chave secreta por ***,
-- em qualquer profundidade. O resto do objeto continua legível.
create or replace function app.audit_scrub(p_value jsonb)
returns jsonb
language plpgsql immutable
as $fn$
declare
  v_out jsonb;
  v_key text;
begin
  if p_value is null then
    return null;
  end if;

  if jsonb_typeof(p_value) = 'object' then
    v_out := '{}'::jsonb;
    for v_key in select key from jsonb_object_keys(p_value) as t(key) loop
      if app.audit_is_secret_key(v_key) then
        v_out := v_out || jsonb_build_object(v_key,
          case when coalesce(p_value -> v_key, 'null'::jsonb) = 'null'::jsonb
               then 'null'::jsonb else to_jsonb('***'::text) end);
      else
        v_out := v_out || jsonb_build_object(v_key, app.audit_scrub(p_value -> v_key));
      end if;
    end loop;
    return v_out;
  end if;

  if jsonb_typeof(p_value) = 'array' then
    select coalesce(jsonb_agg(app.audit_scrub(e)), '[]'::jsonb)
      into v_out from jsonb_array_elements(p_value) as e;
    return v_out;
  end if;

  return p_value;
end;
$fn$;

-- ============================================================================
-- Quem está escrevendo
-- ============================================================================
-- 1. auth.uid() — cobre tudo que vem do app (o front escreve com a sessão do usuário).
-- 2. header x-actor-id — as rotas /api que usam service_role não têm sessão;
--    elas declaram em nome de quem agem. Só é aceito quando a requisição vem
--    autenticada com a chave de servidor, logo o navegador não consegue forjar.
-- 3. GUC app.actor_id — para scripts/psql: select set_config('app.actor_id', '<uuid>', false);
-- Sem nenhum dos três é webhook, cron ou rotina: fica nulo e a tela mostra
-- "Sistema", que é a verdade.
create or replace function app.audit_actor()
returns uuid
language plpgsql stable security definer
set search_path = public, pg_temp
as $fn$
declare
  v_actor uuid;
begin
  begin
    v_actor := auth.uid();
  exception when others then
    v_actor := null;
  end;
  if v_actor is not null then
    return v_actor;
  end if;

  begin
    if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role' then
      v_actor := nullif(current_setting('request.headers', true)::jsonb ->> 'x-actor-id', '')::uuid;
    end if;
  exception when others then
    v_actor := null;
  end;
  if v_actor is not null then
    return v_actor;
  end if;

  begin
    v_actor := nullif(current_setting('app.actor_id', true), '')::uuid;
  exception when others then
    v_actor := null;
  end;
  return v_actor;
end;
$fn$;

-- ============================================================================
-- O trigger
-- ============================================================================
create or replace function app.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_old        jsonb;
  v_new        jsonb;
  v_row        jsonb;
  v_changes    jsonb := '{}'::jsonb;
  v_key        text;
  v_from       jsonb;
  v_to         jsonb;
  v_secret     boolean;
  v_actor      uuid;
  v_actor_name text;
  v_actor_mail text;
  v_company    uuid;
  v_record_id  text;
  v_label      text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_row := v_old;
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_row := v_new;
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;
  end if;

  -- ── o que mudou ────────────────────────────────────────────────────────
  if tg_op = 'UPDATE' then
    for v_key in select key from jsonb_object_keys(v_new) as t(key) loop
      -- updated_at muda em todo save; sozinho não é informação nenhuma.
      continue when v_key = 'updated_at';
      if (v_old -> v_key) is distinct from (v_new -> v_key) then
        if app.audit_is_secret(tg_table_name, v_key) then
          v_from := case when coalesce(v_old -> v_key, 'null'::jsonb) = 'null'::jsonb
                         then 'null'::jsonb else to_jsonb('***'::text) end;
          v_to   := case when coalesce(v_new -> v_key, 'null'::jsonb) = 'null'::jsonb
                         then 'null'::jsonb else to_jsonb('***'::text) end;
          v_changes := v_changes || jsonb_build_object(
            v_key, jsonb_build_object('from', v_from, 'to', v_to, 'masked', true));
        else
          -- audit_scrub cobre o segredo aninhado dentro de colunas jsonb.
          v_changes := v_changes || jsonb_build_object(
            v_key, jsonb_build_object('from', app.audit_scrub(v_old -> v_key),
                                      'to',   app.audit_scrub(v_new -> v_key)));
        end if;
      end if;
    end loop;

    -- Nada mudou de fato (só o updated_at): não polui o log.
    if v_changes = '{}'::jsonb then
      return null;
    end if;
  else
    -- INSERT guarda a linha nova; DELETE guarda a linha inteira apagada.
    for v_key in select key from jsonb_object_keys(v_row) as t(key) loop
      continue when coalesce(v_row -> v_key, 'null'::jsonb) = 'null'::jsonb;
      v_secret := app.audit_is_secret(tg_table_name, v_key);
      v_to := case when v_secret then to_jsonb('***'::text)
                   else app.audit_scrub(v_row -> v_key) end;
      if tg_op = 'INSERT' then
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('from', 'null'::jsonb, 'to', v_to, 'masked', v_secret));
      else
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('from', v_to, 'to', 'null'::jsonb, 'masked', v_secret));
      end if;
    end loop;
  end if;

  -- ── quem ───────────────────────────────────────────────────────────────
  v_actor := app.audit_actor();
  if v_actor is not null then
    select u.name, u.email into v_actor_name, v_actor_mail
      from public.users u where u.id = v_actor;
  end if;

  -- ── onde ───────────────────────────────────────────────────────────────
  if tg_table_name = 'companies' then
    v_company := (v_row ->> 'id')::uuid;
  elsif v_row ? 'company_id' then
    v_company := (v_row ->> 'company_id')::uuid;
  end if;

  -- Chave primária: os nomes das colunas vêm do instalador, via tg_argv.
  select string_agg(v_row ->> k.col, ' / ' order by k.ord)
    into v_record_id
    from unnest(tg_argv) with ordinality as k(col, ord);

  -- Rótulo humano, para a tela não mostrar só um uuid.
  v_label := nullif(trim(coalesce(
    v_row ->> 'trade_name', v_row ->> 'name',  v_row ->> 'title',
    v_row ->> 'subject',    v_row ->> 'label', v_row ->> 'number',
    v_row ->> 'code',       v_row ->> 'email', ''
  )), '');

  insert into public.audit_logs (
    company_id, actor_id, actor_name, actor_email,
    action, table_name, record_id, record_label, changes
  ) values (
    v_company, v_actor, v_actor_name, v_actor_mail,
    tg_op, tg_table_name, v_record_id, v_label, v_changes
  );

  return null;
exception
  when others then
    -- Um log de auditoria não pode derrubar a operação que ele observa.
    -- A falha vira aviso no log do Postgres; a escrita original segue.
    raise warning 'audit_row falhou em %.% (%): %',
      tg_table_schema, tg_table_name, tg_op, sqlerrm;
    return null;
end;
$fn$;

-- ============================================================================
-- Instalador idempotente — prende o trigger em toda tabela que ainda não tem
-- ============================================================================
create or replace function app.audit_install()
returns integer
language plpgsql
as $fn$
declare
  r      record;
  v_pk   text;
  v_done integer := 0;
begin
  for r in
    select c.oid, c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relname <> 'audit_logs'
       and not exists (
             select 1 from pg_trigger t
              where t.tgrelid = c.oid and t.tgname = 'audit_log_trg')
  loop
    select string_agg(quote_literal(a.attname), ', ' order by k.ord)
      into v_pk
      from pg_index i
      join lateral unnest(i.indkey) with ordinality as k(attnum, ord) on true
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
     where i.indrelid = r.oid and i.indisprimary;

    execute format(
      'create trigger audit_log_trg after insert or update or delete on public.%I '
      'for each row execute function app.audit_row(%s)',
      r.relname, coalesce(v_pk, quote_literal('id')));

    v_done := v_done + 1;
  end loop;
  return v_done;
end;
$fn$;

comment on function app.audit_install() is
  'Prende o trigger de auditoria nas tabelas de public que ainda não têm. Toda migration que criar tabela nova deve terminar com: select app.audit_install();';

select app.audit_install();

-- ============================================================================
-- Limpeza do log (botão "Limpar log" do Painel SaaS)
-- ============================================================================
-- Em `public` porque o PostgREST só expõe RPC deste schema.
create or replace function public.audit_purge()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_count      bigint;
  v_actor      uuid := auth.uid();
  v_actor_name text;
  v_actor_mail text;
  v_company    uuid;
begin
  if not app.is_super_admin() then
    raise exception 'Apenas o administrador do SaaS pode limpar o log.';
  end if;

  select count(*) into v_count from public.audit_logs;
  select u.name, u.email, u.company_id
    into v_actor_name, v_actor_mail, v_company
    from public.users u where u.id = v_actor;

  delete from public.audit_logs;

  -- O log recomeça registrando a própria limpeza.
  insert into public.audit_logs (
    company_id, actor_id, actor_name, actor_email,
    action, table_name, record_id, record_label, changes
  ) values (
    v_company, v_actor, v_actor_name, v_actor_mail,
    'DELETE', 'audit_logs', null, 'Log de auditoria',
    jsonb_build_object('registros_removidos',
      jsonb_build_object('from', v_count, 'to', 0))
  );

  return v_count;
end;
$fn$;

revoke all on function public.audit_purge() from public, anon;
grant execute on function public.audit_purge() to authenticated;
