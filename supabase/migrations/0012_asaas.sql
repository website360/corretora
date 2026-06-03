-- ============================================================================
-- Asaas billing references on companies.
--
-- The credit card is captured at plan selection and tokenized at Asaas; a
-- subscription is created with the first charge dated to the trial end, so the
-- customer is only charged after the free period.
-- ============================================================================

alter table public.companies
  add column if not exists asaas_customer_id     text,
  add column if not exists asaas_subscription_id text,
  add column if not exists card_last4 text,
  add column if not exists card_brand text;
