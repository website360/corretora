-- ============================================================================
-- Links por seguradora — cada companhia pode ter vários links úteis
-- (portal do corretor, cotação, sinistro, 2ª via, etc.).
-- Armazenados como JSON: [{ "label": "...", "url": "..." }, ...]
-- ============================================================================

alter table public.insurance_carriers
  add column if not exists links jsonb not null default '[]'::jsonb;
