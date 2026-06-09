-- 0063_wordpress_lead_key.sql
-- Integração de captura de leads do site/WordPress. A chave de API por empresa
-- fica em companies.settings.integrations.wordpress.api_key (jsonb). O endpoint
-- público /api/leads valida a chave com o admin client (bypass RLS), então só
-- precisamos de um índice para o lookup ser rápido.

create index if not exists companies_wp_api_key_idx
  on public.companies (((settings -> 'integrations' -> 'wordpress' ->> 'api_key')));
