# Library Page Patterns

**Projeto:** Máquina de Conteúdo
**Feature:** Biblioteca de Conteúdos (`/library`)
**Data:** 2026-01-15
**Status:** ✅ Concluído

---

## Visão Geral

A Biblioteca de Conteúdos é uma página completa para gerenciar todos os conteúdos criados, com visualização em grid/lista, filtros, edição inline e ações em lote.

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
└── actions/
    └── library-actions.ts            # Server Actions

src/types/
└── library.ts                         # Tipos TypeScript
```

---

## Padrão 1: Evitar Infinite Loops com useRef

**Problema:** `useCallback` com dependências de objeto causa re-render infinito.

**Solução:** Usar `useRef` + `JSON.stringify` para comparar objetos:

```typescript
// use-library-data.ts
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ filters, viewMode })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchData()
  }
}, [filters, viewMode])
```

**Importante:** Sempre que tiver `useEffect` com dependências de objeto (filters, viewMode, etc.), usar esse padrão.

---

## Padrão 2: Edição Inline com Autoselect

**Problema:** Precisar editar um campo rapidamente sem abrir modal.

**Solução:** Duplo clique ativa modo de edição com input focado e texto selecionado:

```typescript
// content-card.tsx
const [isEditing, setIsEditing] = useState(false)
const [editedTitle, setEditedTitle] = useState(item.title ?? "")
const inputRef = useRef<HTMLInputElement>(null)

// Focus e select quando inicia edição
useEffect(() => {
  if (isEditing && inputRef.current) {
    inputRef.current.focus()
    inputRef.current.select()
  }
}, [isEditing])

// Atalhos: Enter salva, Esc cancela
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    handleSave()
  } else if (e.key === "Escape") {
    handleCancel()
  }
}

// Salvar também ao sair do campo (onBlur)
<Input
  ref={inputRef}
  value={editedTitle}
  onChange={(e) => setEditedTitle(e.target.value)}
  onKeyDown={handleKeyDown}
  onBlur={handleSave}
/>
```

---

## Padrão 3: Picker Customizado com Click-Outside

**Problema:** Componente Popover do shadcn não estava disponível.

**Solução:** Criar dropdown customizado com `useRef` para detectar click outside:

```typescript
// category-picker.tsx
const [open, setOpen] = useState(false)
const containerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }
  document.addEventListener("mousedown", handleClickOutside)
  return () => document.removeEventListener("mousedown", handleClickOutside)
}, [])
```

---

## Padrão 4: Multi-Select de Tags

**Problema:** Usuário precisa selecionar múltiplas tags.

**Solução:** State com array de IDs + badges visual:

```typescript
// tag-picker.tsx
interface TagPickerProps {
  tags: Tag[]
  selectedIds: number[]
  onSelect: (tagIds: number[]) => void
}

// Toggle sem remover outros
const toggleTag = (tagId: number) => {
  if (selectedIds.includes(tagId)) {
    onSelect(selectedIds.filter((id) => id !== tagId))
  } else {
    onSelect([...selectedIds, tagId])
  }
}

// Badge com botão de remover
<Badge>
  #{tag.name}
  <X onClick={() => removeTag(tag.id)} />
</Badge>
```

---

## Padrão 5: Ações em Lote com Toast

**Problema:** Usuário precisa excluir/mudar status de múltiplos itens.

**Solução:** State de seleção + toolbar condicional:

```typescript
// library-page.tsx
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

// Toolbar só aparece quando há seleção
{selectedIds.size > 0 && (
  <BatchActionsBar
    selectedCount={selectedIds.size}
    onBatchDelete={handleBatchDelete}
    onBatchStatus={handleBatchStatus}
    onClearSelection={clearSelection}
  />
)}

// Handler de batch delete
const handleBatchDelete = async () => {
  const ids = Array.from(selectedIds)
  const result = await batchDeleteAction(ids)
  if (result.success) {
    toast.success(`${ids.length} conteúdos excluídos`)
    clearSelection()
    refetch()
  }
}
```

---

## Padrão 6: Filtro Bar Expansível

**Problema:** Muitos filtros poluem a interface.

**Solução:** Barra colapsável com contador de filtros ativos:

```typescript
// library-filter-bar.tsx
const [isExpanded, setIsExpanded] = useState(false)

const activeFilterCount = useMemo(() => {
  let count = 0
  if (filters.types?.length) count++
  if (filters.statuses?.length) count++
  if (filters.categories?.length) count++
  if (filters.tags?.length) count++
  return count
}, [filters])

// Header com contador
<button onClick={() => setIsExpanded(!isExpanded)}>
  Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
  <ChevronDown className={cn(isExpanded && "rotate-180")} />
</button>

// Conteúdo expansível
{isExpanded && (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
    {/* Filtros aqui */}
  </div>
)}
```

---

## Padrão 7: Media URLs como JSON Array

**Problema:** `mediaUrl` no schema é `TEXT`, mas UI precisa de array de URLs.

**Solução:** `JSON.stringify` ao salvar, `JSON.parse` ao carregar:

```typescript
// ContentDialog - salvar
const formData = {
  mediaUrl: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
}

// ContentDialog - carregar
useEffect(() => {
  if (item.mediaUrl) {
    try {
      const parsed = JSON.parse(item.mediaUrl)
      setMediaUrls(Array.isArray(parsed) ? parsed : [])
    } catch {
      setMediaUrls([])
    }
  }
}, [item])
```

---

## Padrão 8: Toggle de View Mode

**Problema:** Usuário quer alternar entre grid e lista.

**Solução:** Hook dedicado com persistência opcional:

```typescript
// use-library-view.ts
interface ViewMode {
  mode: 'grid' | 'list'
  sortBy: 'createdAt' | 'updatedAt' | 'title'
  sortOrder: 'asc' | 'desc'
}

export function useLibraryView() {
  const [viewMode, setViewMode] = useState<ViewMode>({
    mode: 'grid',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const toggleViewMode = () => {
    setViewMode(prev => ({
      ...prev,
      mode: prev.mode === 'grid' ? 'list' : 'grid',
    }))
  }

  // ... outros métodos

  return { viewMode, toggleViewMode, setSortBy, toggleSortOrder }
}
```

---

## Padrão 9: Empty State com CTAs

**Problema:** Usuário não sabe o que fazer quando biblioteca está vazia.

**Solução:** Componente dedicado com ilustração e CTAs:

```typescript
// empty-library-state.tsx
{items.length === 0 && (
  <EmptyLibraryState
    hasActiveFilters={activeFilterCount > 0}
    onClearFilters={clearFilters}
    onCreateNew={handleCreate}
  />
)}
```

---

## Server Actions Padrão

Todas as ações seguem o mesmo padrão de resultado:

```typescript
interface ActionResult {
  success: boolean
  error?: string
  id?: number
}

// "use server"
export async function createLibraryItemAction(
  data: LibraryItemFormData
): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    // ... lógica
    return { success: true, id: item.id }
  } catch (error) {
    return { success: false, error: "Erro ao criar" }
  }
}
```

---

## Cores dos Status

| Status | Cor | Background |
|--------|-----|-----------|
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

## Próximas Melhorias

1. **Duplicar conteúdo** - Criar cópia com "(cópia)" no título
2. **Drag & drop** - Para reordenar cards
3. **Export** - Exportar conteúdos para CSV/JSON
4. **Preview** - Preview de imagem no hover
5. **Bulk edit** - Editar múltiplos itens de uma vez

---

## Arquivos Relacionados

- `.context/docs/development-plan/library-dev-plan.md` - Planejamento completo
- `.context/docs/insights/07-fase-7-library.md` - Insights da implementação
