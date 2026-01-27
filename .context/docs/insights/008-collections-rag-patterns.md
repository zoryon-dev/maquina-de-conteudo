# Insights: Sistema de Coleções e Upload de Documentos

**Data:** Jan 16, 2026
**Fase:** Fase 8 - Document Collections & File Upload

## Insight 1: FormData API para Upload de Arquivos

### Problema
Como enviar arquivos (PDF, TXT, MD) do cliente para o servidor Next.js junto com metadados?

### Solução
Usar `FormData` API no cliente e ler com `request.formData()` no servidor.

**Cliente:**
```typescript
const formData = new FormData()
formData.append("file", file)
formData.append("title", file.name.replace(/\.[^/.]+$/, ""))
formData.append("category", selectedCategory)
if (collectionId) {
  formData.append("collectionId", collectionId.toString())
}

await fetch("/api/documents/upload", {
  method: "POST",
  body: formData,
})
```

**Servidor:**
```typescript
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File
  const title = formData.get("title") as string
  const category = formData.get("category") as string
  const collectionId = formData.get("collectionId") as string | null

  const buffer = Buffer.from(await file.arrayBuffer())
  // ... processar arquivo
}
```

### Por que funciona
- `FormData` lida automaticamente com `multipart/form-data`
- `request.formData()` é nativo do Next.js App Router
- Tipos primitivos chegam como strings, files chegam como `File` object

## Insight 2: Relacionamento Many-to-Many com Tabela Junção

### Problema
Um documento pode pertencer a múltiplas coleções, e uma coleção pode ter múltiplos documentos.

### Solução
Tabela de junção `document_collection_items` com foreign keys para ambas as tabelas.

**Schema:**
```typescript
// Tabela principal
export const documentCollections = pgTable("document_collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  // ...
})

// Tabela de junção
export const documentCollectionItems = pgTable("document_collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").references(() => documentCollections.id)
    .notNull(),
  documentId: integer("document_id").references(() => documents.id)
    .notNull(),
  addedAt: timestamp("added_at").defaultNow(),
})
```

**Query com innerJoin:**
```typescript
const docs = await db
  .select()
  .from(documents)
  .innerJoin(
    documentCollectionItems,
    eq(documentCollectionItems.documentId, documents.id)
  )
  .where(
    and(
      eq(documents.userId, userId),
      eq(documentCollectionItems.collectionId, collectionId)
    )
  )
```

### Vantagens
- Flexibilidade: documento em múltiplas coleções sem duplicar conteúdo
- Normalização: referências apenas, sem dados duplicados
- Performance: índices nas foreign keys aceleram queries

## Insight 3: Extração de Texto PDF Server-Side

### Problema
PDFs não podem ser armazenados diretamente para RAG - precisam ter texto extraído primeiro.

### Solução
Extrair texto no momento do upload antes de salvar no banco.

```typescript
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const uint8Array = new Uint8Array(buffer)
  const parser = new PDFParse({ data: uint8Array })
  const data = await parser.getText()
  return data.text || ""
}

// No upload route
const text = fileType === "pdf"
  ? await extractTextFromPDF(buffer)
  : buffer.toString("utf-8")

await db.insert(documents).values({
  title,
  content: text,
  fileType,
  // ...
})
```

### Por que server-side
- Performance: não bloquear UI do cliente
- Segurança: controle total sobre o processamento
- Consistência: mesmo processamento para todos os uploads

## Insight 4: Sidebar de Coleções com Active State

### Problema
Como navegar entre coleções e mostrar qual está ativa?

### Solução
Componente sidebar com estado interno e prop `selectedCollectionId`.

```typescript
// Componente sidebar
export function CollectionsSidebar({
  selectedCollectionId,
  onSelectCollection,
}: {
  selectedCollectionId: number | null
  onSelectCollection: (id: number | null) => void
}) {
  const [collections, setCollections] = useState<Collection[]>([])

  return (
    <nav>
      <button
        onClick={() => onSelectCollection(null)}
        className={cn(
          !selectedCollectionId && "bg-primary text-black"
        )}
      >
        Todos os Documentos
      </button>
      {collections.map(col => (
        <button
          key={col.id}
          onClick={() => onSelectCollection(col.id)}
          className={cn(
            selectedCollectionId === col.id && "bg-primary text-black"
          )}
        >
          {col.name}
        </button>
      ))}
    </nav>
  )
}
```

**Componente pai:**
```typescript
const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null)

<CollectionsSidebar
  selectedCollectionId={selectedCollectionId}
  onSelectCollection={setSelectedCollectionId}
/>
<DocumentsTab
  selectedCollectionId={selectedCollectionId}
  onRefresh={() => {/* refetch */}}
/>
```

### Padrão
- Estado "source of truth" vive no pai
- Filhos recebem valor e callback para mudar
- Multiple componentes podem reagir ao mesmo estado

## Insight 5: Filtros de Categoria como Chips

### Problema
Como mostrar filtros de categoria de forma visual e intuitiva?

### Solução
Botões estilo chips com active state usando `cn()` condicional.

```typescript
const CATEGORIES = {
  general: { label: "Geral", color: "bg-gray-500/10 text-gray-400" },
  products: { label: "Catálogo", color: "bg-blue-500/10 text-blue-400" },
  // ...
}

{Object.entries(CATEGORIES).map(([key, config]) => (
  <button
    key={key}
    onClick={() => setSelectedCategory(key)}
    className={cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
      selectedCategory === key
        ? "bg-primary text-black"
        : "bg-white/5 text-white/70 hover:bg-white/10"
    )}
  >
    {config.label}
  </button>
))}
```

### Visual hierarchy
- Active: cor primary com texto preto (max contraste)
- Inactive: fundo sutil com texto branco/70
- Hover: fundo levemente mais claro

## Insight 6: Drag & Drop para Upload

### Problema
Melhorar UX de upload permitindo arrastar arquivos.

### Solução
Event handlers nativos de drag & drop.

```typescript
const [isDragging, setIsDragging] = useState(false)

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(true)
}

const handleDragLeave = () => {
  setIsDragging(false)
}

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)

  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    processFile(files[0])
  }
}

<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={cn(
    "border-2 border-dashed rounded-xl p-8",
    isDragging ? "border-primary bg-primary/10" : "border-white/20"
  )}
>
  {/* Upload zone */}
</div>
```

### Detalhes importantes
- `e.preventDefault()` em `onDragOver` é obrigatório para `onDrop` funcionar
- Resetar `isDragging` em `onDragLeave` e `onDrop`
- Validar arquivo no drop (tipo, tamanho)

## Conclusão

Esta fase introduziu padrões importantes para gestão de documentos:
1. **FormData** para uploads multiparte
2. **Many-to-many** com junction table
3. **Extração server-side** de PDF
4. **Sidebar navigation** com active state
5. **Category filters** como chips visuais
6. **Drag & drop** nativo para melhor UX
