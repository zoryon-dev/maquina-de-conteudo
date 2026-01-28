# Cron Jobs com Upstash QStash

Guia completo para configurar cron jobs usando Upstash QStash como alternativa gratuita ao Vercel Cron.

## Por que usar QStash?

| Característica | Vercel Cron (Hobby) | Vercel Cron (Pro) | Upstash QStash |
|----------------|---------------------|------------------|----------------|
| Preço | Grátis | $20/mês | **Grátis** |
| Frequência mínima | 1 hora | 1 minuto | 1 minuto |
| Limites | 1 job/hora | Ilimitado | 500k/mês |

## Arquitetura

```
┌─────────────────┐      schedule       ┌──────────────────┐
│   QStash        │ ───────────────────>│  /api/cron/qstash│
│  (External)     │     (cron expr)     │   (Callback)     │
└─────────────────┘                     └────────┬─────────┘
                                                  │
                                                  v
┌─────────────────┐    HTTP call     ┌──────────────────┐
│   /api/workers  │ <──────────────── │  Worker Router   │
│                 │     Authorization │                  │
└─────────────────┘                  └──────────────────┘
```

## Setup Rápido

### 1. Obter Token QStash

1. Acesse https://console.upstash.com/qstash
2. Crie um token ou use o mesmo do Upstash Redis
3. Copie o token

### 2. Configurar Variáveis de Ambiente

No `.env.local` ou na Vercel:

```bash
# Opcional - se não definido, usa UPSTASH_REDIS_REST_TOKEN
QSTASH_TOKEN=sig_...

# Necessário
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx...

# URL da aplicação em produção
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Secret para autenticação dos cron jobs
CRON_SECRET=uma-chave-segura-aqui
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar Setup

```bash
# Configura todos os cron jobs no QStash
npm run cron:setup

# Verificar se está funcionando
npm run cron:health

# Remover todos os cron jobs
npm run cron:remove

# Trigger manual de um job (para testes)
npm run cron:trigger workers
```

## Cron Jobs Configurados

| Nome | Frequência | Endpoint | Descrição |
|------|------------|----------|-----------|
| `workers` | `* * * * *` | `/api/workers` | Processa fila de jobs (IA, embeddings, etc) |
| `socialPublish` | `*/5 * * * *` | `/api/cron/social-publish` | Publica posts agendados no Instagram/Facebook |

## Segurança

O sistema usa múltiplas camadas de segurança:

1. **Assinatura QStash** - Verifica que a requisição veio do QStash
2. **CRON_SECRET** - Header `Authorization: Bearer <secret>`
3. **Timestamp validation** - Evita replay attacks
4. **Test mode** - Apenas localhost em desenvolvimento

## Monitoramento

### Health Check

```bash
curl https://seu-app.com/api/cron/qstash?action=health
```

Resposta:
```json
{
  "status": "healthy",
  "configured": true,
  "schedulesCount": 2
}
```

### Logs

No painel do QStash:
1. Acesse https://console.upstash.com/qstash
2. Vá em "Requests"
3. Veja o histórico de requisições e status

## Troubleshooting

### Jobs não estão executando

1. **Verificar se QStash está configurado:**
   ```bash
   npm run cron:health
   ```

2. **Verificar se os schedules existem:**
   ```bash
   npm run cron:setup
   ```

3. **Verificar logs no QStash Console**

### Erro 401 Unauthorized

- Verifique se `CRON_SECRET` está configurado
- Verifique se `NEXT_PUBLIC_APP_URL` está correto

### Erro 503 Service Unavailable

- O worker pode estar com erro
- Verifique os logs da aplicação
- O QStash vai fazer retry automático

## Deploy na Vercel

### 1. Configurar Variáveis de Ambiente

No dashboard da Vercel:
1. Vá em Settings → Environment Variables
2. Adicione:
   - `QSTASH_TOKEN` (ou use `UPSTASH_REDIS_REST_TOKEN`)
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_APP_URL` = https://seu-projeto.vercel.app
   - `CRON_SECRET`

### 2. Executar Setup após Deploy

Após o primeiro deploy:
```bash
npm run cron:setup
```

Ou via API:
```bash
curl -X PUT https://seu-projeto.vercel.app/api/cron/qstash?action=setup \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Remover Vercel Cron (Opcional)

Se estiver usando QStash, pode remover a seção `crons` do `vercel.json`.

## Fallback

Se o QStash falhar por algum motivo, o sistema tem um fallback:

```typescript
import { fallbackPollingWorker } from "@/lib/cron/qstash";

// Chama diretamente o worker sem QStash
await fallbackPollingWorker();
```

## Comandos Úteis

```bash
# Setup inicial
npm run cron:setup

# Health check
npm run cron:health

# Trigger manual de um job específico
npm run cron:trigger workers
npm run cron:trigger socialPublish

# Remover todos (antes de reconfigurar)
npm run cron:remove
```

## Referências

- [Upstash QStash Docs](https://upstash.com/docs/qstash)
- [QStash Console](https://console.upstash.com/qstash)
- [Cron Expressions](https://crontab.guru/)
