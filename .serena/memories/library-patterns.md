# Library Page Patterns

**Projeto:** Máquina de Conteúdo
**Feature:** Biblioteca de Conteúdos (`/library`)
**Data:** 2026-01-31 (Atualizado)
**Status:** ✅ Concluído

---

## Visão Geral

A Biblioteca de Conteúdos é uma página completa para gerenciar todos os conteúdos criados, com visualização em grid/lista, filtros, edição inline, ações em lote e upload de imagens customizadas.

---

## Estrutura de Arquivos

```
src/app/(app)/library/
├── page.tsx                          # Server Component (root)
├── components/
│   ├── library-page.tsx              # Client Component principal
│   ├── library-header.tsx            # Header com search, view toggle, sort
│   ├── library-filter-bar.tsx        # Barra de filtros expansível
│   ├── library-grid.tsx              # Grid view (cards)
│   ├── library-list.tsx              # List view (tabela)
│   ├── content-card.tsx              # Card individual (grid)
│   ├── content-row.tsx               # Row individual (lista)
│   ├── content-dialog.tsx            # Modal de edição completa
│   ├── category-picker.tsx           # Seletor de categoria
│   ├── tag-picker.tsx                # Multi-select de tags
│   └── empty-library-state.tsx       # Estado vazio
├── hooks/
│   ├── use-library-data.ts           # Hook de dados
│   ├── use-library-filters.ts        # Hook de filtros
│   └── use-library-view.ts           # Hook de view mode
├── actions/
│   └── library-actions.ts            # Server Actions
└── [id]/
    ├── page.tsx                      # Server Component (detalhe)
    └── components/
        ├── library-detail-page.tsx   # Client Component principal
        ├── content-preview-section.tsx # Preview de mídia (65%)
        ├── content-actions-section.tsx # Ações (35%)
        └── schedule-drawer.tsx       # Drawer de agendamento

src/components/ui/
├── image-gallery-drawer.tsx          # Galeria de imagens com edição
└── image-upload-dialog.tsx           # Dialog de upload de imagem (NOVO)

src/app/api/library/[id]/
├── route.ts                          # CRUD básico
├── upload-image/route.ts             # Upload de imagem customizada (NOVO)
├── regenerate-slide/route.ts         # Regenerar slide com texto editado
├── regenerate-images/route.ts        # Regenerar todas as imagens
└── generate-image/route.ts           # Gerar nova imagem

src/types/
└── library.ts                        # Tipos TypeScript
```

---

## Padrão 10: Upload de Imagem Customizada (NOVO - Jan 2026)

**Problema:** Usuário quer substituir uma imagem gerada por IA por uma imagem própria.

**Solução:** Dialog de upload com drag & drop que faz upload para R2/Local e atualiza o mediaUrl.

### API Endpoint

```typescript
// POST /api/library/[id]/upload-image
// FormData: file (File) + slideIndex (number)
// Response: { success: boolean, newImageUrl?: string, slideIndex?: number }

// Validações:
// - Tipos: PNG, JPG, WebP, GIF
// - Tamanho: máximo 5MB
// - Validação dupla: MIME type + magic bytes

// Storage key pattern:
const key = `library-${libraryItemId}/custom-${slideIndex}-${timestamp}.${ext}`
```

### Componente ImageUploadDialog

```typescript
// src/components/ui/image-upload-dialog.tsx
interface ImageUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  libraryItemId: number
  slideIndex: number
  currentImageUrl?: string
  onSuccess?: (newImageUrl: string) => void
}

// Features:
// - Drag & drop zone
// - Preview da imagem atual
// - Preview da nova imagem antes de upload
// - Validação visual de tipo/tamanho
// - Indicador de progresso
```

### Integração no ImageGalleryDrawer

```typescript
// Botão "Substituir" no header (após Download)
{libraryItemId && (
  <Button onClick={() => setUploadDialogOpen(true)}>
    <Upload className="w-4 h-4 mr-2" />
    Substituir
  </Button>
)}

// Dialog de upload
<ImageUploadDialog
  open={uploadDialogOpen}
  onOpenChange={setUploadDialogOpen}
  libraryItemId={libraryItemId!}
  slideIndex={currentIndex}
  currentImageUrl={currentImage?.url}
  onSuccess={(newUrl) => {
    onImageUpdated?.(currentIndex, newUrl)
    setUploadDialogOpen(false)
    // Atualiza local state para refletir mudança
    setEnrichedImages(prev => {
      const updated = [...prev]
      updated[currentIndex] = { ...updated[currentIndex], url: newUrl }
      return updated
    })
  }}
/>
```

### Integração para Thumbnails de Vídeo

```typescript
// ContentPreviewSection - seção de thumbnail
<Button onClick={() => setThumbnailUploadOpen(true)}>
  <Upload className="w-4 h-4 mr-2" />
  Substituir
</Button>

<ImageUploadDialog
  libraryItemId={item.id}
  slideIndex={0}  // Thumbnail sempre no índice 0
  currentImageUrl={videoThumbnailUrl}
  onSuccess={() => window.location.reload()}
/>
```

### Fluxo de Dados

```
Upload → R2/Local Storage → URL pública → libraryItems.mediaUrl → Instagram API
```

A mesma URL salva no banco é usada diretamente na publicação do Instagram.

---

## Padrão 1: Evitar Infinite Loops com useRef

**Problema:** `useCallback` com dependências de objeto causa re-render infinito.

**Solução:** Usar `useRef` + `JSON.stringify` para comparar objetos:

```typescript
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ filters, viewMode })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchData()
  }
}, [filters, viewMode])
```

---

## Padrão 2: Edição Inline com Autoselect

```typescript
const [isEditing, setIsEditing] = useState(false)
const inputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (isEditing && inputRef.current) {
    inputRef.current.focus()
    inputRef.current.select()
  }
}, [isEditing])
```

---

## Padrão 7: Media URLs como JSON Array

**Problema:** `mediaUrl` no schema é `TEXT`, mas UI precisa de array de URLs.

**Solução:** `JSON.stringify` ao salvar, `JSON.parse` ao carregar:

```typescript
// Salvar
mediaUrl: JSON.stringify(mediaUrls)

// Carregar
const mediaUrls: string[] = item.mediaUrl
  ? Array.isArray(item.mediaUrl)
    ? item.mediaUrl
    : JSON.parse(item.mediaUrl)
  : []

// Atualizar índice específico (pattern de upload/regeneração)
mediaUrls[slideIndex] = newImageUrl
await db.update(libraryItems).set({
  mediaUrl: JSON.stringify(mediaUrls),
  updatedAt: new Date(),
})
```

---

## Cores dos Status

| Status | Cor | Background |
|--------|-----|------------|
| draft | `text-gray-300` | `bg-gray-500/20` |
| scheduled | `text-blue-300` | `bg-blue-500/20` |
| published | `text-green-300` | `bg-green-500/20` |
| archived | `text-orange-300` | `bg-orange-500/20` |

---

## Cores dos Tipos

| Tipo | Cor | Ícone |
|------|-----|-------|
| text | `text-blue-400` | Type |
| image | `text-purple-400` | Image |
| carousel | `text-pink-400` | Layers |
| video | `text-red-400` | Video |
| story | `text-orange-400` | Camera |

---

## APIs de Mídia da Biblioteca

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/library/[id]` | PATCH | Atualização genérica |
| `/api/library/[id]/upload-image` | POST | Upload de imagem customizada |
| `/api/library/[id]/regenerate-slide` | POST | Regenerar com texto editado |
| `/api/library/[id]/regenerate-images` | POST | Regenerar todas (async job) |
| `/api/library/[id]/generate-image` | POST | Gerar nova imagem |

---

## Arquivos Relacionados

- `.context/docs/development-plan/library-dev-plan.md` - Planejamento
- `.context/docs/insights/07-fase-7-library.md` - Insights
- `src/components/ui/image-upload-dialog.tsx` - Componente de upload
- `src/app/api/library/[id]/upload-image/route.ts` - API de upload
