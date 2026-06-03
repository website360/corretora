# Deploy na DigitalOcean (App Platform)

O app roda como um serviço web Node (Next.js 15) no **DigitalOcean App
Platform**, conectado ao repositório GitHub. O banco continua no **Supabase**
(nada de banco é provisionado na DO).

## 1. Pré-requisitos

- Repo no GitHub: `website360/corretora` (branch `main`).
- Projeto Supabase já criado, com as migrations aplicadas (`supabase/migrations`).
- Em mãos: `NEXT_PUBLIC_SUPABASE_URL`, a **anon key** e a **service role key**
  (Supabase → Project Settings → API).

## 2. Criar o app

**Opção A — painel (mais simples):**
1. DigitalOcean → **Apps → Create App**.
2. Conecte o GitHub e selecione `website360/corretora`, branch `main`.
   Marque **Autodeploy** (deploy a cada push).
3. A DO detecta Next.js. Confirme:
   - Build command: `npm run build`
   - Run command: `npm run start`
   - HTTP port: `8080`
4. Em **Environment Variables**, preencha as vars da seção 3.

**Opção B — via App Spec (recomendado p/ reprodutibilidade):**
- O arquivo [`.do/app.yaml`](../.do/app.yaml) já descreve o app. Em
  **Create App → Import from App Spec**, cole/aponte para ele e preencha
  os valores. Ou via CLI:
  ```bash
  doctl apps create --spec .do/app.yaml
  ```

## 3. Variáveis de ambiente

> ⚠️ As `NEXT_PUBLIC_*` são **embutidas no build**. Se faltar
> `NEXT_PUBLIC_SUPABASE_URL` no build, o app sobe em **modo mock** (sem
> backend). Marque-as como **Build & Run time**.

| Variável | Escopo | Secret? | Valor |
|---|---|---|---|
| `NODE_ENV` | Build & Run | não | `production` |
| `NEXT_PUBLIC_USE_MOCKS` | Build & Run | não | `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | Build & Run | não | `https://SEU-PROJETO.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build & Run | não | anon key |
| `NEXT_PUBLIC_APP_URL` | Build & Run | não | URL pública do app |
| `NEXT_PUBLIC_APP_NAME` | Build & Run | não | `Corretora SaaS` |
| `SUPABASE_SERVICE_ROLE_KEY` | Run | **sim** | service role key |
| `ASAAS_BASE_URL` | Run | não | `https://api.asaas.com/v3` (opcional) |
| `ASAAS_API_KEY` | Run | **sim** | chave Asaas (opcional) |
| `ASAAS_WEBHOOK_TOKEN` | Run | **sim** | token webhook Asaas (opcional) |

`SUPABASE_DB_URL` e `SA_PASS` **não** vão para a DO — são usados só
localmente (migrations via `npm run db:exec` e criação de super-admin).

## 4. Primeiro deploy e domínio

1. Suba o app. O primeiro build leva ~3–5 min.
2. A DO gera uma URL `*.ondigitalocean.app`. **Atualize `NEXT_PUBLIC_APP_URL`**
   para essa URL (ou para o domínio próprio) e faça redeploy — ela é usada
   em links, no PWA e no callback do ClickSign.
3. **Domínio próprio:** App → Settings → Domains → adicione o domínio e
   aponte o CNAME indicado. HTTPS (Let's Encrypt) é automático.

## 5. Pós-deploy (checklist)

- [ ] Supabase → **Authentication → URL Configuration**: inclua a URL de
      produção em *Site URL* e *Redirect URLs*.
- [ ] Supabase → **Storage**: confirme os buckets `avatars` e
      `contract-files` e suas policies.
- [ ] ClickSign (se usar): cadastre o webhook apontando para
      `https://SEU-DOMINIO/api/clicksign/webhook`.
- [ ] Asaas (se usar billing real): configure as 3 vars e o webhook.
- [ ] Teste login, criação de registro e upload de anexo em produção.

## 6. Atualizações

Com **Autodeploy** ligado, todo `git push` na `main` dispara build+deploy.
Migrations de banco continuam manuais: rode `npm run db:exec <arquivo>`
localmente apontando para o `SUPABASE_DB_URL` de produção.
