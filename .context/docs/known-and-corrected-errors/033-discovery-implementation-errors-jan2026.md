# Discovery Implementation Errors

Erros encontrados e corrigidos durante a implementação da feature Trending Discovery.

## Data: Janeiro 2026

---

## Erro 1: Multiple Primary Keys no Drizzle

**Erro:**
```
error: multiple primary keys for table "theme_tags" are not allowed
code: 42P16
```

**Causa:**
A tabela junction `theme_tags` foi definida com duas primary keys:
```typescript
export const themeTags = pgTable("theme_tags",
  {
    id: serial("id").primaryKey(),  // ❌ PK individual
    themeId: integer("theme_id").notNull(),
    tagId: integer("tag_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.themeId, table.tagId] }),  // ❌ PK composta também
  ]
)
```

**Solução:**
Em tabelas many-to-many, use apenas a chave composta sem coluna `id`:
```typescript
export const themeTags = pgTable("theme_tags",
  {
    themeId: integer("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.themeId, table.tagId] }),  // ✅ Apenas PK composta
  ]
)
```

**Insight:** Junction tables não precisam de coluna `id` - a chave composta `(foreign_key1, foreign_key2)` é suficiente e garante unicidade natural.

---

## Erro 2: Type Exports Faltando

**Erro:**
```
Module '"./types"' has no exported member 'SemanticHashtag'
Module '"./types"' has no exported member 'LiteralHashtag'
Module '"./types"' has no exported member 'TopPost'
```

**Causa:**
Interfaces foram definidas mas não exportadas:
```typescript
interface SemanticHashtag { ... }  // ❌ Sem export
```

**Solução:**
```typescript
export interface SemanticHashtag { ... }  // ✅
export interface LiteralHashtag { ... }   // ✅
export interface TopPost { ... }          // ✅
```

---

## Erro 3: useRef sem Valor Inicial

**Erro:**
```
error TS2554: Expected 1 arguments, but got 0.
const timeoutRef = useRef<NodeJS.Timeout>()
```

**Causa:**
`useRef` sem generics precisa de valor inicial explícito.

**Solução:**
```typescript
// ❌ Errado
const timeoutRef = useRef<NodeJS.Timeout>()

// ✅ Correto
const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
```

---

## Erro 4: Possibly Undefined Array Access

**Erro:**
```
error TS18048: 'item.children' is possibly 'undefined'
{item.children.map((child) => ...)}
```

**Causa:**
TypeScript não sabe que `item.children` está definido dentro do render condicional.

**Solução:**
```typescript
// ❌ TypeScript reclama
{item.children.map((child) => ...)}

// ✅ Non-null assertion (seguro aqui pois hasChildren garante existência)
{item.children!.map((child) => ...)}
```

**Nota:** O uso de `!` é seguro aqui pois o dropdown só renderiza quando `hasChildren` é verdadeiro.

---

## Erro 5: Missing Icon Imports

**Erro:**
```
Cannot find name 'Youtube'
Cannot find name 'Instagram'
```

**Causa:**
Ícones usados mas não importados do lucide-react:
```typescript
import { Search, Plus, Filter, ... } from "lucide-react"
// Youtube e Instagram faltando
```

**Solução:**
```typescript
import {
  Search,
  Plus,
  Filter,
  // ...
  Youtube,   // ✅ Adicionar
  Instagram, // ✅ Adicionar
} from "lucide-react"
```

---

## Erro 6: Spinner Size Prop

**Erro:**
```
Type '{ size: string; }' is not assignable to type 'IntrinsicAttributes & SVGProps<SVGSVGElement>'.
Property 'size' does not exist on type 'IntrinsicAttributes & SVGProps<SVGSVGElement>'.
<Spinner size="lg" />
```

**Causa:**
Componente `Spinner` usa `React.ComponentProps<"svg">` que não inclui prop `size`.

**Solução:**
```typescript
// ❌ Errado
<Spinner size="lg" />

// ✅ Correto - usar className para tamanho
<Spinner className="size-8" />
```

---

## Erro 7: Null Index Types in Reduce

**Erro:**
```
Type 'null' cannot be used as an index type.
const status = theme.status ?? 'unknown';
acc[status] = ...
```

**Causa:**
Mesmo com null coalescing, TypeScript ainda infere possibilidade de null.

**Solução:**
```typescript
// ❌ Erro persiste
const status = theme.status ?? 'unknown';

// ✅ Type assertion necessário em algumas versões do TS
const byStatus = userThemes.reduce(
  (acc, theme) => {
    const status = theme.status ?? 'unknown' as string;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);
```

---

## Erro 8: OpenRouter Null Invocation

**Erro:**
```
Cannot invoke an object which is possibly 'null'
if (!this.model) { return [] }
await this.model.doEmbed({ values: [text] })
```

**Causa:**
TypeScript não entende que o return anterior garante `this.model` não é null.

**Solução:**
```typescript
// ✅ Verificar e retornar early
private model = openrouter ? openrouter(BRIEFING_MODEL) : null;

async enrichBatch(topics: TrendingTopic[]) {
  if (!this.model) {
    console.warn('[Briefing] OpenRouter not configured')
    return topics.map(t => ({ ...t, briefing: '', keyPoints: [], suggestedAngles: [] }))
  }

  // Agora TypeScript sabe que this.model existe
  const result = await this.model.doEmbed({ values: [text] })
}
```

---

## Erro 9: Type Conversion em Apify Results

**Erro:**
```
Conversion of type 'Record<string | number, unknown>[]' to type 'SearchScraperResult[]' may be a mistake
return { success: true, data: items }
```

**Causa:**
Apify retorna `Record<string | number, unknown>` mas esperamos tipo específico.

**Solução:**
```typescript
// ✅ Usar type assertion duplo quando necessário
return {
  success: true,
  data: items as unknown as SearchScraperResult[],
};
```

**Nota:** Documentação da Apify não exporta tipos corretamente para TypeScript, fazendo o assertion necessário.

---

## Aprendizados Gerais

1. **Junction Tables:** Sempre use PK composta, sem coluna `id` extra
2. **useRef:** Sempre fornecer valor inicial ou tipar como `T | undefined`
3. **Non-null assertion:** Aceitável quando lógica de código garante existência
4. **Imports:** IDEs nem sempre detectam imports faltando em arquivos grandes
5. **Type Safety:** Em boundaries externas (APIs de terceiros), às vezes type assertions são necessários

---

## Erro 10: Enum PostgreSQL "perplexity" não existe

**Erro:**
```
Failed to save theme
insert into "themes" (...) values (...)
→ column "source_type" violates check constraint
```

**Sintoma:**
Ao clicar em "Wizard" em um resultado do Perplexity, o tema não era salvo no banco de dados.

**Causa:**
O enum PostgreSQL `theme_source_type` continha `"tiktok"` mas o código foi alterado para usar `"perplexity"`:

```typescript
// Schema atualizado
export const themeSourceTypeEnum = pgEnum("theme_source_type", [
  "manual", "youtube", "instagram", "perplexity", "aggregated"  // perplexity no código
]);

// Mas PostgreSQL ainda tinha tiktok
-- theme_source_type: manual|youtube|instagram|tiktok|aggregated  ❌
```

**Solução:**
1. Atualizar o schema TypeScript (já feito)
2. Adicionar o valor ao enum PostgreSQL via SQL:

```sql
ALTER TYPE "theme_source_type" ADD VALUE 'perplexity';
```

3. Limpar migrações antigas não executadas:
```bash
# Deletar migration file desnecessário
rm drizzle/0000_removed_tiktok.sql
```

**Insight:** PostgreSQL enums são imutáveis. Adicionar novos valores requer `ALTER TYPE` direto. Valores não podem ser removidos, apenas adicionados.

---

## Erro 11: URL Parameter Incorreto para Wizard

**Erro:**
```
Usuário reportou: "Redirecionou, porém veio sem nada preenchido."
```

**Sintoma:**
Após clicar em "Wizard", a página do Wizard abria mas todos os campos estavam vazios.

**Causa:**
O redirect usava `?edit=` mas o Wizard esperava `?wizardId=`:

```typescript
// ❌ discover-page.tsx - redirect incorreto
window.location.href = `/wizard?edit=${wizardData.wizardId}`

// wizard/page.tsx - esperava wizardId
const wizardId = searchParams.get('wizardId')  // ← null!
```

**Solução:**
Alterar o parâmetro de query string:

```typescript
// ✅ discover-page.tsx - redirect correto
window.location.href = `/wizard?wizardId=${wizardData.wizardId}`
```

**Insight:** Ao implementar redirects entre páginas, verificar se os nomes dos parâmetros de query string estão consistentes. Uma mismatch silencioso pode causar bugs difíceis de debugar.

---

## Aprendizados Adicionais (Perplexity Integration)

6. **PostgreSQL Enums:** Sincronizar enum no código e no banco requer `ALTER TYPE` manual
7. **Query Parameters:** Validar nomes de parâmetros entre páginas que se comunicam
8. **Graceful Degradation:** Services de IA devem retornar fallback quando não configurados
9. **API Keys:** Verificar presença de API keys antes de fazer requests
