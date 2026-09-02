-- Isolamento multi-tenant no bucket `contract-files`.
--
-- Achado da auditoria de 2026-08-10: a tabela `contract_attachments` estava
-- corretamente escopada por empresa (0028), mas as policies do bucket exigiam
-- apenas `authenticated`. Na prática, qualquer usuário logado de QUALQUER
-- corretora podia ler, sobrescrever ou APAGAR os arquivos de contrato de outra
-- — bastava conhecer o caminho do objeto.
--
-- O caminho é montado em src/services/storage.service.ts como
--   {companyId}/{contractId}/{timestamp}.{ext}
-- então o primeiro segmento identifica o dono. `storage.foldername(name)`
-- devolve os segmentos como array (base 1).

drop policy if exists "contract-files read" on storage.objects;
drop policy if exists "contract-files insert" on storage.objects;
drop policy if exists "contract-files update" on storage.objects;
drop policy if exists "contract-files delete" on storage.objects;

create policy "contract-files read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contract-files'
    and (
      (storage.foldername(name))[1] = app.current_company_id()::text
      or app.is_super_admin()
    )
  );

create policy "contract-files insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contract-files'
    and (storage.foldername(name))[1] = app.current_company_id()::text
  );

create policy "contract-files update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'contract-files'
    and (storage.foldername(name))[1] = app.current_company_id()::text
  )
  with check (
    bucket_id = 'contract-files'
    and (storage.foldername(name))[1] = app.current_company_id()::text
  );

create policy "contract-files delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contract-files'
    and (storage.foldername(name))[1] = app.current_company_id()::text
  );

-- Nota: o portal do cliente (src/app/api/portal/attachment/[id]/route.ts) lê
-- pelo cliente admin (service role), que ignora RLS — não é afetado por isto.
