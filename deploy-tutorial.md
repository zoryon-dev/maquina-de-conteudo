# Deploy Tutorial - Máquina de Conteúdo

Guia completo para realizar o deploy da Máquina de Conteúdo na Vercel.

---

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Serviços Externos Obrigatórios](#serviços-externos-obrigatórios)
3. [Configuração do Neon (Database)](#configuração-do-neon-database)
4. [Configuração do Clerk (Autenticação)](#configuração-do-clerk-autenticação)
5. [Configuração do Upstash (Fila)](#configuração-do-upstash-fila)
6. [Configuração da Vercel](#configuração-da-vercel)
7. [Deploy Inicial](#deploy-inicial)
8. [Configurações Pós-Deploy](#configurações-pós-deploy)
9. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Vercel](https://vercel.com)
- Cartão de crédito (para serviços gratuitos que exigem verificação)

---

## Serviços Externos Obrigatórios

| Serviço | Uso | Plano Gratuito |
|---------|-----|----------------|
| [Neon](https://console.neon.tech/) | Banco de dados PostgreSQL | ✅ 0.5GB / 3 projetos |
| [Clerk](https://dashboard.clerk.com/) | Autenticação | ✅ 5.000 usuários/mês |
| [Upstash](https://upstash.com/) | Redis para fila de jobs | ✅ 10.000 comandos/dia |
| [OpenRouter](https://openrouter.ai/) | LLMs (GPT-4, Claude, etc) | ✅ Pay-as-you-go |
| [Voyage AI](https://dash.voyageai.com/) | Embeddings para RAG | ✅ $50 free créditos |
| [Zep Cloud](https://app.getzep.com/) | Context engineering | ✅ Plano gratuito |

**Opcionais:**
- [Firecrawl](https://www.firecrawl.dev/) - Web scraping
- [Tavily](https://tavily.com/) - Busca web em tempo real
- [Cloudflare R2](https://dash.cloudflare.com/) - Storage de arquivos
- [ScreenshotOne](https://dash.screenshotone.com/) - HTML to Image

---

## Configuração do Neon (Database)

### 1. Criar Projeto Neon

1. Acesse [https://console.neon.tech/](https://console.neon.tech/)
2. Clique em **"Create a project"**
3. Configure:
   - **Project name**: `maquina-de-conteudo`
   - **Region**: Escolha a mais próxima do público (ex: `us-east-1`)
   - **PostgreSQL version**: `16`
4. Clique em **"Create project"**

### 2. Obter Connection String

1. No dashboard do Neon, vá em **SQL Editor**
2. Ou copie a **Connection String** na página do projeto:

```
postgresql://[user]:[password]@[neon-host]/[database]?sslmode=require
```

**Guarde esta string** - será usada na Vercel.

### 3. Rodar Migrations (Opcional - First-Time)

Se preferir criar as tabelas antes do primeiro deploy:

```bash
# Localmente
npx drizzle-kit push
```

Ou use o **Drizzle Studio** para visualizar:

```bash
npx drizzle-kit studio
```

---

## Configuração do Clerk (Autenticação)

### 1. Criar Aplicação Clerk

1. Acesse [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
2. Clique em **"Add application"**
3. Configure:
   - **Application name**: `Máquina de Conteúdo`
   - **Sign in**: Enable `Email code`, `Google`, `GitHub`
4. Clique em **"Create application"**

### 2. Configurar Domínios

Vá em ****Domain Settings** > **Paths**:

| Path | URL |
|------|-----|
| Sign in URL | `/sign-in` |
| Sign up URL | `/sign-up` |
| After sign in URL | `/` |
| After sign up URL | `/` |

### 3. Configurar Webhooks

Vá em ****Webhooks** > **Add endpoint**:

- **URL**: `https://[seu-dominio].vercel.app/api/webhooks/clerk`
- **Events**: Selecione `user.created`, `user.updated`, `user.deleted`

Guarde o **Signing Secret** (`whsec_...`).

### 4. Obter Keys

Vá em ****API Keys**** e copie:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 5. Configurar JWT Template

Vá em ****JWT Templates** > **New Template** > **Clone (Clerk Default)****

Adicione claims customizados se necessário.

---

## Configuração do Upstash (Fila)

### 1. Criar Banco Redis

1. Acesse [https://console.upstash.com/](https://console.upstash.com/)
2. Clique em **"Create Redis Database"**
3. Configure:
   - **Database Name**: `maquina-de-conteudo-queue`
   - **Region**: Mesma região do Neon
4. Clique em **"Create"**

### 2. Obter Credentials

Na página do database, vá em ****Details** > **REST API**:

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

---

## Configuração da Vercel

### 1. Importar Projeto

1. Acesse [https://vercel.com/new](https://vercel.com/new)
2. Conecte sua conta GitHub (se ainda não conectou)
3. Importe o repositório `zoryon-dev/maquina-de-conteudo`
4. Configure:

| Setting | Valor |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |

5. Clique em **"Continue"**

### 2. Configurar Variáveis de Ambiente

Na Vercel, vá em **Settings > Environment Variables** e adicione:

#### Obrigatórias

```bash
# Database
DATABASE_URL=postgresql://...

# Encryption
ENCRYPTION_KEY=base64-encoded-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Upstash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# AI Services
OPENROUTER_API_KEY=sk-or-...
VOYAGE_API_KEY=voyage-...
ZEP_API_KEY=sk_...

# App
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
NEXT_PUBLIC_APP_NAME=contentMachine

# Worker
WORKER_SECRET=use-strong-random-here
```

#### Opcionais

```bash
# Storage (R2 ou local)
STORAGE_PROVIDER=local

# Meta (Instagram/Facebook)
META_APP_ID=xxx
META_APP_SECRET=xxx
META_REDIRECT_URI=https://seu-dominio.vercel.app/api/social/callback

# Outros
FIRECRAWL_API_KEY=fc-...
TAVILY_API_KEY=tvly-...
SCREENSHOT_ONE_ACCESS_KEY=xxx
```

> **⚠️ Importante:** Configure as variáveis para **todos os ambientes** (Production, Preview, Development)

### 3. Configurar Cron Jobs

O arquivo `vercel.json` já contém a configuração dos cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/workers",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/social-publish",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Certifique-se de que a opção **Cron Jobs** está habilitada nas configurações do projeto na Vercel.

---

## Deploy Inicial

### 1. Deploy Manual

1. Na Vercel, clique em **"Deploy"**
2. Aguarde o build (aprox. 2-3 minutos)
3. Acesse a URL gerada: `https://seu-projeto.vercel.app`

### 2. Executar Migrations no Banco

**Primeira vez - Opção A (via Neon Dashboard):**

1. Acesse o [Neon Console](https://console.neon.tech/)
2. Vá em **SQL Editor**
3. Cole o schema completo de `src/db/schema.ts` convertido para SQL
4. Execute

**Primeira vez - Opção B (via terminal local):**

```bash
# Aponte para o banco de produção
DATABASE_URL="postgresql://..." npx drizzle-kit push
```

### 3. Testar Aplicação

1. Acesse a URL da Vercel
2. Teste autenticação (criar conta, login)
3. Verifique se não há erros no console

---

## Configurações Pós-Deploy

### 1. Domínio Personalizado

1. Na Vercel, vá em **Settings > Domains**
2. Adicione seu domínio (ex: `app.seudominio.com`)
3. Configure DNS conforme instruções:
   - **Type**: `CNAME`
   - **Name**: `app`
   - **Value**: `cname.vercel-dns.com`

### 2. Atualizar variáveis de ambiente

Após configurar domínio personalizado, atualize:

```bash
NEXT_PUBLIC_APP_URL=https://app.seudominio.com

# Se usar Meta OAuth
META_REDIRECT_URI=https://app.seudominio.com/api/social/callback
```

### 3. Configurar Meta App (Instagram/Facebook)

1. Acesse [Meta for Developers](https://developers.facebook.com/apps/)
2. Criar novo App ou usar existente
3. Adicione **Instagram Basic Display** ou **Facebook Login**
4. Configure **Redirect OAuth URI**:
   - `https://app.seudominio.com/api/social/callback`
5. Copie `APP_ID` e `APP_SECRET` para as variáveis da Vercel

### 4. Configurar Webhook do Clerk

Se ainda não configurou:

1. Vá em [Clerk Dashboard](https://dashboard.clerk.com/)
2. Configure o webhook endpoint:
   - `https://app.seudominio.com/api/webhooks/clerk`
3. Ative os eventos necessários

---

## Troubleshooting

### Erro: "No response is returned from route handler"

**Causa:** Route handler não retorna Response em todos os branches.

**Solução:** Verifique se todos os `export async function GET/POST` retornam `NextResponse`.

### Erro: "Database connection failed"

**Causa:** `DATABASE_URL` incorreta ou banco não acessível.

**Solução:**
1. Verifique se a URL está correta
2. Confirme que o IP da Vercel está autorizado no Neon (Neon aceita qualquer IP por padrão)
3. Teste a conexão localmente com as mesmas credenciais

### Erro: "Clerk dev browser is not available"

**Causa:** Clerk em produção com keys de dev.

**Solução:** Use keys de produção (`pk_live_` e `sk_live_`).

### Erro: "Cron job not executing"

**Causa:** Cron jobs precisam estar habilitados.

**Solução:**
1. Na Vercel, vá em **Settings > Cron Jobs**
2. Verifique se os jobs estão listados
3. Os logs dos cron jobs ficam em **Deployments > [deployment] > Functions**

### Build falha com "Module not found"

**Causa:** Dependência não instalada ou caminho incorreto.

**Solução:**
1. Verifique `package.json`
2. Rode `npm install` localmente para confirmar
3. Se o erro persistir, pode ser caminho relativo com maiúsculas/minúsculas

### Erro: "Upload directory not found"

**Causa:** Storage local em produção (Vercel é read-only).

**Solução:** Configure `STORAGE_PROVIDER=r2` com Cloudflare R2 ou use outro storage S3-compatible.

---

## Checklist Final

- [ ] Neon criado e migrations rodadas
- [ ] Clerk configurado com domínios corretos
- [ ] Upstash Redis criado
- [ ] OpenRouter API key configurada
- [ ] Voyage AI API key configurada
- [ ] Zep Cloud API key configurada
- [ ] Todas as variáveis de ambiente na Vercel
- [ ] Cron jobs habilitados na Vercel
- [ ] Webhook do Clerk configurado
- [ ] Domínio personalizado (opcional)
- [ ] Meta App configurado (se usar Instagram/Facebook)
- [ ] Storage R2 configurado (se necessário)
- [ ] Deploy testado e funcionando

---

## Monitoramento

### Logs da Vercel

1. Vá em **Deployments** > selecione um deployment
2. Clique na aba **Functions**
3. Clique em qualquer função para ver os logs

### Monitoramento de Jobs

Os cron jobs executam:
- `/api/workers` - A cada 1 minuto
- `/api/cron/social-publish` - A cada 5 minutos

Veja os status em **Settings > Cron Jobs**.

---

## Suporte

Para problemas específicos:
- **Next.js**: https://nextjs.org/docs
- **Vercel**: https://vercel.com/docs
- **Drizzle**: https://orm.drizzle.team/docs
- **Clerk**: https://clerk.com/docs

---

**Documento atualizado em:** 2026-01-27
