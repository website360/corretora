-- Attachments (images + PDF) for contracts. Files live in a PRIVATE storage
-- bucket; metadata is tenant-scoped here. (Plan gating may come later — for now
-- it's available to every plan.)

create table if not exists public.contract_attachments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  contract_id  uuid not null references public.contracts (id) on delete cascade,
  name         text not null,
  size         int not null default 0,
  mime_type    text not null,
  storage_path text not null,
  uploaded_by  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists contract_attachments_contract_idx on public.contract_attachments (contract_id);
create index if not exists contract_attachments_company_idx on public.contract_attachments (company_id);

alter table public.contract_attachments enable row level security;
create policy "contract_attachments: tenant read" on public.contract_attachments for select
  using (company_id = app.current_company_id() or app.is_super_admin());
create policy "contract_attachments: tenant manage" on public.contract_attachments for all
  using (company_id = app.current_company_id())
  with check (company_id = app.current_company_id());

-- Private bucket — access only via signed URLs.
insert into storage.buckets (id, name, public)
values ('contract-files', 'contract-files', false)
on conflict (id) do nothing;

drop policy if exists "contract-files read" on storage.objects;
drop policy if exists "contract-files insert" on storage.objects;
drop policy if exists "contract-files update" on storage.objects;
drop policy if exists "contract-files delete" on storage.objects;

create policy "contract-files read" on storage.objects
  for select to authenticated using (bucket_id = 'contract-files');
create policy "contract-files insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'contract-files');
create policy "contract-files update" on storage.objects
  for update to authenticated using (bucket_id = 'contract-files');
create policy "contract-files delete" on storage.objects
  for delete to authenticated using (bucket_id = 'contract-files');
