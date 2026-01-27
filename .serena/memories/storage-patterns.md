# Cloudflare R2 Storage Integration

## Overview
The project uses Cloudflare R2 as S3-compatible object storage for document files (PDF, TXT, MD). Implemented in January 2026 with a storage abstraction layer.

## Architecture

### Storage Abstraction Layer
```
src/lib/storage/
├── types.ts           # StorageProvider enum, IStorageProvider interface
├── config.ts          # R2 credentials, getR2PublicUrl()
├── providers/
│   ├── index.ts       # getStorageProvider() factory function
│   ├── local.ts       # LocalStorageProvider (filesystem)
│   └── r2.ts          # R2StorageProvider (S3 client via AWS SDK v3)
└── utils/
    └── file-url.ts    # getDocumentUrl(), hasStorageLocation()
```

### Environment Variables
```env
STORAGE_PROVIDER=local|r2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=maquina-de-conteudo
R2_CUSTOM_DOMAIN=storage-mc.zoryon.org
```

### Database Schema
```typescript
documents table:
- storageProvider: "local" | "r2"
- storageKey: R2 object key or local filename
- filePath: Legacy local file path (deprecated)
```

### Storage Key Pattern
- R2: `documents/{userId}/{timestamp}-{sanitizedFilename}`
- Example: `documents/user_abc123/1234567890-my-document.pdf`

### Public URL Generation
- Custom domain: `https://storage-mc.zoryon.org/{key}`
- Fallback: `https://pub-xxx.r2.dev/{bucket}/{key}`
- Local: `{appUrl}/uploads/documents/{userId}/{filename}`

### CORS Configuration
R2 CORS must be configured as array (NOT object wrapper):
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://maquina-de-conteudo.vercel.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**IMPORTANT:** R2 does NOT support:
- OPTIONS method (remove from AllowedMethods)
- ExposeHeaders (remove from config)

### API Endpoints
- `POST /api/documents/upload` - Upload with storage abstraction
- `GET /api/documents/[id]` - Download from storage
- `DELETE /api/documents/[id]` - Delete document + storage file
- `DELETE /api/admin/clear-documents` - Bulk delete all user documents

### Usage Pattern
```typescript
import { getStorageProvider } from "@/lib/storage/providers"
import { getDocumentUrl } from "@/lib/storage/utils/file-url"

// Upload
const storage = getStorageProvider()
const result = await storage.uploadFile(buffer, key)

// Get URL
const url = getDocumentUrl(document)

// Delete
await storage.deleteFile(document.storageKey)
```

## Migration Status
✅ Complete - January 17, 2026
- All 7 phases implemented
- Custom domain configured
- CORS validated
- TypeScript compilation: 0 errors
