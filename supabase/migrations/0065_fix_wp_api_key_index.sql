-- 0065_fix_wp_api_key_index.sql
-- A chave é salva no jsonb como `apiKey` (camelCase), mas o índice 0063 usava
-- `api_key` (snake_case) — não casava, e o lookup do /api/leads sempre falhava
-- ("Chave de API inválida"). Recria o índice no caminho correto.

drop index if exists companies_wp_api_key_idx;

create index if not exists companies_wp_api_key_idx
  on public.companies (((settings -> 'integrations' -> 'wordpress' ->> 'apiKey')));
