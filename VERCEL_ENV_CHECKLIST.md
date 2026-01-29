# Checklist de Variáveis de Ambiente - Vercel

## ⚠️ IMPORTANTE: Configurar no Dashboard da Vercel

Acesse: **Settings > Environment Variables** no seu projeto Vercel

---

## ✅ Variáveis OBRIGATÓRIAS para Build

Estas variáveis **DEVEM** estar configuradas para que o build funcione:

- [ ] `DATABASE_URL` - Connection string do Neon PostgreSQL
  - Formato: `postgresql://user:password@host/database?sslmode=require`
  - Obtenha em: https://console.neon.tech/

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk Public Key
  - Formato: `pk_test_...` ou `pk_live_...`
  - Obtenha em: https://dashboard.clerk.com/

- [ ] `CLERK_SECRET_KEY` - Clerk Secret Key
  - Formato: `sk_test_...` ou `sk_live_...`
  - Obtenha em: https://dashboard.clerk.com/

---

## ✅ Variáveis OBRIGATÓRIAS para Runtime

Estas variáveis são necessárias para o funcionamento da aplicação em produção:

- [ ] `CLERK_WEBHOOK_SECRET` - Secret para webhooks do Clerk
  - Formato: `whsec_...`
  - Obtenha em: https://dashboard.clerk.com/

- [ ] `OPENROUTER_API_KEY` - API Key do OpenRouter (LLMs)
  - Formato: `sk-or-v1-...`
  - Obtenha em: https://openrouter.ai/keys

- [ ] `VOYAGE_API_KEY` - API Key do Voyage AI (Embeddings)
  - Formato: `voyage-...`
  - Obtenha em: https://dash.voyageai.com/api-keys

- [ ] `UPSTASH_REDIS_REST_URL` - URL do Upstash Redis
  - Formato: `https://xxx.upstash.io`
  - Obtenha em: https://upstash.com/

- [ ] `UPSTASH_REDIS_REST_TOKEN` - Token do Upstash Redis
  - Formato: `AXXX...`
  - Obtenha em: https://upstash.com/

- [ ] `ENCRYPTION_KEY` - Chave para criptografia
  - Gerar: `openssl rand -base64 32`
  - **IMPORTANTE**: Use a mesma chave em todos os ambientes

- [ ] `WORKER_SECRET` - Secret para autenticação de workers
  - Use uma chave forte em produção
  - Exemplo: `openssl rand -base64 32`

- [ ] `CRON_SECRET` - Secret para autenticação de cron jobs
  - Use uma chave forte em produção
  - Pode ser igual ao `WORKER_SECRET` se preferir

---

## 📋 Variáveis OPCIONAIS

Estas variáveis são opcionais, mas habilitam funcionalidades extras:

- [ ] `FIRECRAWL_API_KEY` - Web scraping (opcional)
- [ ] `TAVILY_API_KEY` - Busca web em tempo real (opcional)
- [ ] `APIFY_API_KEY` - Scraping alternativo (opcional)
- [ ] `SCREENSHOT_ONE_ACCESS_KEY` - Geração de imagens HTML (opcional)
- [ ] `META_APP_ID` - OAuth Instagram/Facebook (opcional)
- [ ] `META_APP_SECRET` - OAuth Instagram/Facebook (opcional)
- [ ] `META_REDIRECT_URI` - OAuth redirect URI (opcional)
- [ ] `R2_ACCOUNT_ID` - Cloudflare R2 storage (opcional)
- [ ] `R2_ACCESS_KEY_ID` - Cloudflare R2 storage (opcional)
- [ ] `R2_SECRET_ACCESS_KEY` - Cloudflare R2 storage (opcional)
- [ ] `R2_BUCKET_NAME` - Cloudflare R2 bucket name (opcional)
- [ ] `R2_CUSTOM_DOMAIN` - Domínio customizado R2 (opcional)

---

## 🔧 Configuração no Dashboard Vercel

Para cada variável:

1. **Nome**: Copie exatamente o nome da variável (case-sensitive)
2. **Valor**: Cole o valor completo
3. **Ambientes**: Marque TODOS os ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

**IMPORTANTE**: 
- Variáveis com prefixo `NEXT_PUBLIC_` são expostas ao cliente
- Não exponha secrets com `NEXT_PUBLIC_`
- Use valores diferentes para Production vs Development quando apropriado

---

## ✅ Verificação Pós-Deploy

Após configurar as variáveis e fazer deploy:

1. Verifique os logs do build na Vercel
2. Confirme que não há erros relacionados a variáveis de ambiente
3. Teste funcionalidades críticas:
   - Login/Registro (Clerk)
   - Conexão com banco de dados
   - Geração de conteúdo (OpenRouter)
   - Busca semântica (Voyage)

---

## 📝 Notas

- As variáveis são carregadas durante o build e runtime
- Mudanças nas variáveis requerem novo deploy
- Use variáveis de ambiente diferentes para cada ambiente (dev/staging/prod)
- Nunca commite arquivos `.env` ou `.env.local` no git
