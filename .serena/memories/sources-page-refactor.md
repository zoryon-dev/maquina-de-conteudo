# Sources Page - Sistema Completo de Coleções e Upload
**Última atualização:** Jan 16, 2026 (Fase 8)

## Overview
Página `/fontes` (sources) para gerenciamento completo de documentos RAG com sistema de coleções (pastas), upload de arquivos (PDF, TXT, MD) e extração automática de texto.

## Funcionalidades Principais

### 1. Sistema de Coleções (Pastas)
- **Coleções**: Pastas organizacionais para agrupar documentos
- **Many-to-many**: Um documento pode estar em múltiplas coleções
- **Soft delete**: Coleções e documentos podem ser "deletados" (deletedAt)
- **Sidebar**: Navegação lateral com lista de coleções
- **CRUD completo**: Criar, editar, excluir coleções

### 2. Upload de Arquivos
- **Formatos suportados**: PDF, TXT, MD
- **Tamanho máximo**: 10MB
- **Extração de texto**: PDFs são processados server-side com pdf-parse v2.4.5
- **Drag & drop**: Zone visual com feedback
- **Categorização**: Seleção de categoria no upload
- **Associação**: Documento pode ser adicionado a uma coleção no upload

### 3. Tabs de Navegação
- **Documentos**: Lista com filtros e busca
- **Buscar Semântica**: Busca inteligente (futuro)
- **Estatísticas**: Métricas e índices (futuro)

## Schema do Banco

### Tabelas
```typescript
// Coleções (pastas)
documentCollections {
  id, name, description, userId,
  createdAt, updatedAt, deletedAt
}

// Junção many-to-many
documentCollectionItems {
  id, collectionId, documentId, addedAt
}

// Documentos
documents {
  id, title, content, fileType, category, userId,
  embedded, embeddingModel, embeddingStatus,
  embeddingProgress, chunksCount, lastEmbeddedAt,
  filePath, createdAt, updatedAt, deletedAt
}
```

### Categorias de Documentos
- `general` - Geral
- `products` - Catálogo
- `offers` - Ofertas
- `brand` - Marca
- `audience` - Público
- `competitors` - Concorrentes
- `content` - Conteúdo

## Estrutura de Arquivos

```
src/app/(app)/sources/
├── page.tsx                    # Server Component root
├── components/
│   ├── sources-page.tsx        # Client Component principal
│   ├── collections-sidebar.tsx # Sidebar com coleções
│   ├── documents-tab.tsx       # Tab de documentos
│   ├── upload-dialog.tsx       # Modal de upload
│   ├── collection-card.tsx     # Card de coleção
│   ├── collection-form-dialog.tsx
│   └── document-card.tsx
├── actions/
│   ├── sources-actions.ts      # Ações de documentos
│   └── collections-actions.ts  # Ações de coleções

src/app/api/documents/
└── upload/
    └── route.ts                # Endpoint upload com PDF parse
```

## Server Actions

### Coleções (collections-actions.ts)
```typescript
getCollectionsAction()
createCollectionAction({ name, description })
updateCollectionAction(id, { name, description })
deleteCollectionAction(id)  // Soft delete
addDocumentToCollectionAction(documentId, collectionId)
removeDocumentFromCollectionAction(documentId, collectionId)
```

### Documentos (sources-actions.ts)
```typescript
getDocumentsByCollectionAction(collectionId | null)
getDocumentStatsAction()
updateDocumentAction(id, { title, category, content })
deleteDocumentWithEmbeddingsAction(id)
searchDocumentsAction(query, category?, limit?)
getDocumentsByCategoryAction(category)
reembedDocumentAction(id, force?)
getEmbeddingStatusAction(id)
```

## Padrão pdf-parse v2.4.5 (CRITICAL!)

```typescript
// ✅ CORRETO
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const uint8Array = new Uint8Array(buffer)
  const parser = new PDFParse({ data: uint8Array })
  const data = await parser.getText()
  return data.text || ""
}
```

## Padrão FormData Upload

**Cliente:**
```typescript
const formData = new FormData()
formData.append("file", file)
formData.append("title", file.name.replace(/\.[^/.]+$/, ""))
formData.append("category", selectedCategory)
if (collectionId) {
  formData.append("collectionId", collectionId.toString())
}
await fetch("/api/documents/upload", { method: "POST", body: formData })
```

**Servidor:**
```typescript
const formData = await request.formData()
const file = formData.get("file") as File
const title = formData.get("title") as string
const category = formData.get("category") as string
const collectionId = formData.get("collectionId") as string | null
```

## Componentes UI

### CollectionsSidebar
- Lista de coleções com contadores
- Active state com `bg-primary`
- Ações: criar, editar, excluir

### DocumentsTab
- Filtros por categoria (chips)
- Busca integrada
- Stats cards (total, indexados, chunks)
- Cards de documento com badges

### UploadDialog
- Drag & drop com highlight
- Grid de categorias
- Validação (tipo, tamanho)

## Overview
Refatoração completa da página `/fontes` (sources) para centralizar o gerenciamento de documentos RAG, removendo a funcionalidade duplicada de `/settings`.

## Alterações Realizadas

### 1. Enhanced Navbar (`sources/page.tsx`)
- Grid layout (3 colunas no desktop, 1 no mobile)
- Active indicator animado com Framer Motion `layoutId`
- Descrição para cada aba
- Glow effect no estado ativo
- Checkmark visual no estado ativo

```typescript
// Configuração das tabs
const TABS: TabConfig[] = [
  { id: "documents", name: "Documentos", icon: FileText, description: "Gerencie seus documentos para RAG" },
  { id: "search", name: "Buscar Semântica", icon: Search, description: "Faça buscas inteligentes no conteúdo" },
  { id: "stats", name: "Estatísticas", icon: BarChart3, description: "Visualize métricas e índices" },
]
```

### 2. UploadDialog (`sources/components/upload-dialog.tsx`)
- Dialog com seleção de categoria antes do upload
- Grid de categorias (3 colunas desktop, 2 mobile)
- Drag & drop zone com feedback visual
- Validação de tipo (PDF, TXT, MD) e tamanho (10MB)
- Reutiliza `uploadDocumentAction` de settings

### 3. DocumentsTab (`sources/components/documents-tab.tsx`)
- Botão Upload integrado ao header
- Filtros por categoria com scroll horizontal
- Busca integrada
- Estatísticas visuais (cards de contagem)
- Lista de documentos com status de indexação

### 4. Settings Page Simplificado
- Aba "Documentos" removida de `settings-tabs.tsx`
- Tipo `TabValue` atualizado (removido "documents")
- Import e render de `DocumentsSection` removidos

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/app/(app)/sources/components/upload-dialog.tsx` | Dialog de upload categorizado |
| `src/app/(app)/sources/actions/sources-actions.ts` | Server Actions específicas |

## Arquivos Modificados

| Arquivo | Alterações |
|---------|------------|
| `src/app/(app)/sources/page.tsx` | Enhanced navbar |
| `src/app/(app)/sources/components/documents-tab.tsx` | Upload integrado |
| `src/app/(app)/settings/components/settings-tabs.tsx` | Docs removido |
| `src/app/(app)/settings/components/settings-page.tsx` | Docs removido |

## Padrão de Componentes

### TabButton Pattern
```typescript
{activeTab === "documents" && <DocumentsTab />}
{activeTab === "search" && <SemanticSearchTab />}
{activeTab === "stats" && <StatsTab />}
```

### Upload Dialog Pattern
```typescript
<UploadDialog
  open={uploadDialogOpen}
  onOpenChange={setUploadDialogOpen}
  onSuccess={fetchData}  // Refresh após upload
/>
```

## Server Actions

### sources-actions.ts
- `getDocumentsWithEmbeddingsAction()` - Lista com contagem de embeddings
- `getDocumentStatsAction()` - Estatísticas agregadas
- `updateDocumentAction()` - Atualiza título/categoria/conteúdo
- `deleteDocumentWithEmbeddingsAction()` - Remove documento e embeddings
- `searchDocumentsAction()` - Busca por texto (ILIKE)
- `getDocumentsByCategoryAction()` - Filtro por categoria
