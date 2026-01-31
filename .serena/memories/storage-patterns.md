# Cloudflare R2 Storage Integration

**Atualizado:** 2026-01-31

## Overview
The project uses Cloudflare R2 as S3-compatible object storage for:
- Document files (PDF, TXT, MD)
- Library images (PNG, JPG, WebP, GIF) - **NOVO**

## Architecture

### Storage Abstraction Layer
```
src/lib/storage/
├── types.ts           # StorageProvider enum, IStorageProvider interface
├── config.ts          # R2 credentials, getR2PublicUrl()
├── index.ts           # getStorageProvider() factory, generateStorageKey()
├── encoding.ts        # Unicode/S3 metadata encoding utilities
├── providers/
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

libraryItems table:
- mediaUrl: JSON stringified array of URLs
  Example: '["https://storage-mc.zoryon.org/library-123/slide-1.png"]'
```

---

## Storage Key Patterns

### Documents
```
documents/{userId}/{timestamp}-{randomSuffix}-{sanitizedFilename}
Example: documents/user_abc123/1234567890-a1b2c3-my-document.pdf
```

### Library Images (NOVO)
```
library-{libraryItemId}/custom-{slideIndex}-{timestamp}.{ext}
Example: library-456/custom-0-1706745600000.png
```

### Wizard Generated Images
```
library-{libraryItemId}/slide-{slideNumber}-{timestamp}.{ext}
Example: library-456/slide-1-1706745600000.png
```

---

## Public URL Generation

- Custom domain: `https://storage-mc.zoryon.org/{key}`
- Fallback: `https://pub-xxx.r2.dev/{bucket}/{key}`
- Local: `{appUrl}/uploads/documents/{userId}/{filename}`

---

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload with storage abstraction
- `GET /api/documents/[id]/download` - Download from storage
- `DELETE /api/documents/[id]` - Delete document + storage file

### Library Images (NOVO - Jan 2026)
- `POST /api/library/[id]/upload-image` - Upload custom image
- `POST /api/library/[id]/regenerate-slide` - Regenerate with text edit
- `POST /api/library/[id]/generate-image` - Generate new image

---

## Image Upload Pattern (NOVO)

### Validations
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

// Double validation: MIME type + magic bytes
function detectImageType(buffer: Buffer): "png" | "jpg" | "webp" | "gif" | null {
  const header = buffer.subarray(0, 12).toString("hex")
  if (header.startsWith("89504e47")) return "png"  // PNG
  if (header.startsWith("ffd8ff")) return "jpg"    // JPEG
  if (header.startsWith("52494646") && header.slice(16, 24) === "57454250") return "webp"
  if (header.startsWith("47494638")) return "gif"  // GIF
  return null
}
```

### Upload Flow
```typescript
import { getStorageProvider } from "@/lib/storage"

// 1. Generate storage key
const key = `library-${libraryItemId}/custom-${slideIndex}-${Date.now()}.${ext}`

// 2. Upload to storage
const storage = getStorageProvider()
const uploadResult = await storage.uploadFile(buffer, key, {
  contentType: `image/${extension}`,
})

// 3. Update database
const mediaUrls = JSON.parse(item.mediaUrl || "[]")
mediaUrls[slideIndex] = uploadResult.url

await db.update(libraryItems).set({
  mediaUrl: JSON.stringify(mediaUrls),
  updatedAt: new Date(),
})
```

---

## Usage Pattern

```typescript
import { getStorageProvider } from "@/lib/storage"
import { getDocumentUrl } from "@/lib/storage/utils/file-url"

// Upload file
const storage = getStorageProvider()
const result = await storage.uploadFile(buffer, key, { contentType })

// Get URL from document
const url = getDocumentUrl(document)

// Delete file
await storage.deleteFile(document.storageKey)
```

---

## CORS Configuration

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

---

## Integration with Social Publishing

Library images stored in R2 are used directly by Instagram/Facebook APIs:

```typescript
// publish-instagram.ts
const result = await service.publishPost({
  imageUrl: mediaUrls[0],  // ← URL pública do R2
  caption: postRecord.caption,
  mediaType: SocialMediaType.IMAGE,
})
```

The same URL saved in `libraryItems.mediaUrl` is passed directly to Instagram's Content Publishing API as `image_url`.

---

## Migration Status
✅ Complete - January 2026
- Documents storage: ✅
- Library images storage: ✅
- Custom domain configured
- CORS validated
