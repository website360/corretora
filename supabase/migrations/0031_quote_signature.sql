-- ClickSign signature references on quotes.
alter table public.quotes
  add column if not exists clicksign_key text,
  add column if not exists signed_url   text,
  add column if not exists signed_at    timestamptz;

create index if not exists quotes_clicksign_idx on public.quotes (clicksign_key)
  where clicksign_key is not null;
