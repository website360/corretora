# Deploy — Vercel + Supabase

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique o schema (SQL Editor ou CLI):

   **Via CLI**
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase db push                          # migrations/0001_init.sql + 0002_rls.sql
   supabase db execute -f supabase/seed.sql  # catálogo de módulos + tenant demo
   ```

   **Via painel** — copie e execute, em ordem:
   `supabase/migrations/0001_init.sql` → `0002_rls.sql` → `supabase/seed.sql`.

3. **Realtime** — _Database → Replication_ → adicione à publicação `supabase_realtime`:
   `tickets`, `ticket_messages`, `notifications`.
4. **Storage** — crie o bucket `attachments` (privado) para anexos de tickets.
5. **Auth** — _Authentication → URL Configuration_: defina o Site URL e os Redirect URLs
   (ex.: `https://seuapp.vercel.app`). Habilite e-mail/senha.
6. Copie em _Project Settings → API_: `URL`, `anon key` e `service_role key`.

## 2. Vercel

1. Faça push do projeto para um repositório Git.
2. Em [vercel.com](https://vercel.com) → **New Project** → importe o repositório.
   O framework **Next.js** é detectado automaticamente.
3. **Environment Variables** (Production + Preview):

   | Variável                          | Valor                          |
   | --------------------------------- | ------------------------------ |
   | `NEXT_PUBLIC_SUPABASE_URL`        | URL do projeto Supabase        |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | anon key                       |
   | `SUPABASE_SERVICE_ROLE_KEY`       | service role key (server-only) |
   | `NEXT_PUBLIC_APP_URL`             | `https://seuapp.vercel.app`    |
   | `NEXT_PUBLIC_APP_NAME`            | `Corretora SaaS`               |
   | `NEXT_PUBLIC_USE_MOCKS`           | `false`                        |

4. **Deploy**. O App Router e o `middleware.ts` rodam nativamente (Edge/Node) na Vercel.

## 3. Pós-deploy

- Crie a primeira conta em `/cadastro` — o trigger `handle_new_user` provisiona a
  empresa e o perfil `admin`.
- Convide a equipe em **Usuários**.
- Verifique o Realtime abrindo o mesmo ticket em duas abas.

## Checklist de produção

- [ ] `NEXT_PUBLIC_USE_MOCKS=false` em produção.
- [ ] RLS habilitado (já vem nas migrations) e testado com 2 tenants.
- [ ] `service_role key` **somente** em variáveis de servidor (nunca no client).
- [ ] Backups automáticos do Postgres ativados no Supabase.
- [ ] Tipos regenerados: `supabase gen types typescript --project-id <ref> > src/types/database.ts`.
