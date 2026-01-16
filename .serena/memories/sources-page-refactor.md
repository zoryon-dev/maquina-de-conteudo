# Sources Page Refactor - Janeiro 2026

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
