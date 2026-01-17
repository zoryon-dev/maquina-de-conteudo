# Cloudflare R2 Storage Migration - Insights

**Date:** January 17, 2026
**Phase:** Storage Migration (Post-Fase 8)
**Status:** ✅ Complete

## Overview

Migração do armazenamento de arquivos de sistema de arquivos local para Cloudflare R2 (S3-compatible object storage). A migração foi implementada com uma camada de abstração que permite alternar entre provedores via variável de ambiente.

## Architecture Decisions

### 1. Storage Abstraction Pattern

Em vez de substituir diretamente todas as referências ao sistema de arquivos, implementei uma camada de abstração com interface `IStorageProvider`:

```typescript
interface IStorageProvider {
  uploadFile(buffer: Buffer, key: string): Promise<StorageResult>
  deleteFile(key: string): Promise<void>
  batchDelete(keys: string[]): Promise<BatchResult>
  getFileUrl(key: string): string
}
```

**Benefícios:**
- Troca de provedor via configuração (`STORAGE_PROVIDER=local|r2`)
- Fácil testabilidade (mock de storage)
- Isolamento de mudanças de API

### 2. Factory Pattern

```typescript
export function getStorageProvider(): IStorageProvider {
  if (STORAGE_PROVIDER_ENV === "r2" && isR2Configured()) {
    return new R2StorageProvider()
  }
  return new LocalStorageProvider()
}
```

**Decisão:** Usar validação em tempo de execução ao invés de build-time. Isso permite alternar sem rebuild.

### 3. Storage Key Pattern

Padrão de chave: `documents/{userId}/{timestamp}-{sanitizedFilename}`

**Razões:**
- Namespace por usuário para segurança
- Timestamp para evitar colisões de nome
- Nome sanitizado para caracteres inválidos

### 4. Custom Domain Support

Adicionado suporte para domínio personalizado (`storage-mc.zoryon.org`) que tem precedência sobre a URL pública do R2.

**Benefício:** URLs amigáveis e branded para arquivos públicos.

## Technical Challenges

### Challenge 1: CORS Configuration Format

**Problema:** R2 não aceita formato AWS S3 tradicional.

**Diferenças:**
| AWS S3 | Cloudflare R2 |
|--------|---------------|
| Object wrapper `{CORSConfiguration: [...]}` | Array direto `[...]` |
| Suporta `OPTIONS` | Não suporta `OPTIONS` |
| Suporta `ExposeHeaders` | Não suporta `ExposeHeaders` |

**Solução:** Criar configuração específica para R2 no arquivo `.context/docs/cloudflare-r2-cors.json`

### Challenge 2: TypeScript Configuration

AWS SDK v3 requer configuração específica para Node.js environment:

```typescript
import { S3Client } from "@aws-sdk/client-s3"
import { NodeHttpHandler } from "@smithy/node-http-handler"

const client = new S3Client({
  region: "auto",
  requestHandler: new NodeHttpHandler({
    requestTimeout: 30000,
    connectionTimeout: 10000,
  }),
})
```

### Challenge 3: Preserving Legacy Data

O schema do banco foi estendido, não substituído:
- `filePath` mantido para backward compatibility
- `storageProvider` e `storageKey` adicionados para novo sistema

## Database Schema Changes

```sql
-- Adicionados em migration 0044
ALTER TABLE documents ADD COLUMN "storage_provider" text;
ALTER TABLE documents ADD COLUMN "storage_key" text;

-- filePath mantido para compatibilidade
-- mas marcado como legacy na documentação
```

## Files Created/Modified

### Created:
- `src/lib/storage/types.ts`
- `src/lib/storage/config.ts`
- `src/lib/storage/providers/index.ts`
- `src/lib/storage/providers/local.ts`
- `src/lib/storage/providers/r2.ts`
- `src/lib/storage/utils/file-url.ts`
- `src/app/api/documents/[id]/route.ts` (download endpoint)
- `src/app/api/admin/clear-documents/route.ts`

### Modified:
- `src/app/api/documents/upload/route.ts` (usa storage abstraction)
- `src/db/schema.ts` (adicionados campos storageProvider, storageKey)

## Environment Variables

Nova seção adicionada ao `.env.example`:

```env
# ─────────────────────────────────────────────────────────────────────────────
# 📦 CLOUDFLARE R2 STORAGE (Opcional - para armazenamento de arquivos)
# ─────────────────────────────────────────────────────────────────────────────
STORAGE_PROVIDER=local
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=maquina-de-conteudo
R2_PUBLIC_URL=https://pub-xxx.r2.dev
R2_CUSTOM_DOMAIN=storage-mc.zoryon.org
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

## Validation Results

```bash
npm run build
# ✓ Built in 45s
# ✓ 0 TypeScript errors

tsc --noEmit
# ✓ 0 errors
```

## Next Steps (Optional)

1. **Data Migration:** Script para migrar arquivos existentes de `filePath` para R2
2. **Presigned URLs:** Implementar URLs assinadas para arquivos privados
3. **CDN Integration:** Considerar Cloudflare CDN para distribuição global
4. **Lifecycle Policies:** Configurar regras de retenção no R2

## Documentation Updates

- `.context/docs/architecture.md` - Added Storage Architecture section
- `CLAUDE.md` - Added Cloudflare R2 Storage Integration section
- `.serena/memories/storage-patterns` - New memory created
- `.context/docs/known-and-corrected-errors/029-r2-cors-configuration.md` - CORS error documented

## Key Takeaways

1. **Abstraction first:** Sempre criar abstração antes de integrar serviços externos
2. **CORS differences:** R2 não é 100% compatível com AWS S3 (especialmente CORS)
3. **Custom domain:** Facilita migração futura e melhora branding
4. **Legacy compatibility:** Manter campos antigos durante transição reduz risco
