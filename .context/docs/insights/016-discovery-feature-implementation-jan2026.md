# Discovery Feature Implementation Insights

Insights e aprendizados durante a implementação da feature Trending Discovery.

## Data: Janeiro 2026

---

## Insight 1: Graceful Degradation > Erro Explosivo

Ao integrar múltiplas APIs externas (YouTube, Apify, OpenRouter, Voyage), cada uma pode não estar configurada.

**Problema:** Se uma API não tiver key, a aplicação inteira falha?

**Solução:** Implementar graceful degradation em todos os services:

```typescript
// ❌ Ruim - lança erro
if (!this.apiKey) {
  throw new Error('API key não configurada')
}

// ✅ Bom - retorna vazio
if (!this.apiKey) {
  console.warn('[Service] API key não configurada, returning empty')
  return { success: true, data: [] }
}
```

**Benefício:** Aplicação funciona parcialmente mesmo sem todas as APIs configuradas.

---

## Insight 2: ServiceResult Pattern > Throw/Catch

Discriminated unions são mais type-safe que exceções:

```typescript
// ❌ Exceções - tipo de retorno não indica erro
async search(): Promise<TrendingTopic[]> {
  if (!this.apiKey) throw new Error('...')
  return topics
}

// ✅ ServiceResult - tipo indica sucesso/erro
async search(): Promise<ServiceResult<TrendingTopic[]>> {
  if (!this.apiKey) return { success: false, error: '...' }
  return { success: true, data: topics }
}

// Uso type-safe
const result = await service.search()
if (result.success) {
  const topics = result.data  // TypeScript sabe que existe
}
```

**Benefício:** O type system força tratamento de ambos os casos.

---

## Insight 3: Facade Pattern para APIs Complexas

Instagram via Apify requer duas chamadas (search + stats). Facade simplifica:

```typescript
// ❌ Expôr complexidade para consumers
const posts = await searchScraper.search(hashtag)
const stats = await statsScraper.getStats(hashtag)
const combined = merge(posts, stats)

// ✅ Facade abstrai complexidade
class InstagramService {
  async searchByHashtag(hashtag: string) {
    // Orquestra internamente search + stats
    return this.combinedResult
  }
}
```

**Benefício:** Consumers não precisam conhecer detalhes da implementação.

---

## Insight 4: Parallel Fetch > Sequential

Ao buscar de múltiplas plataformas, use Promise.allSettled:

```typescript
// ❌ Sequential - lento
const ytResults = await youtube.search(keyword)
const igResults = await instagram.search(keyword)

// ✅ Parallel - rápido
const results = await Promise.allSettled([
  youtube.search(keyword),
  instagram.search(keyword),
])
```

**Benefício:** Reduz tempo total de espera pelo tempo da operação mais lenta, não a soma.

---

## Insight 5: Junction Tables Não Precisam de ID

Em tabelas many-to-many, a chave composta é suficiente:

```typescript
// ❌ Desnecessário
{
  id: serial("id").primaryKey(),
  themeId: integer("theme_id"),
  tagId: integer("tag_id"),
}

// ✅ Correto
{
  themeId: integer("theme_id").notNull(),
  tagId: integer("tag_id").notNull(),
},
(table) => [
  primaryKey({ columns: [table.themeId, table.tagId] }),
]
```

**Benefício:** Mais limpo, evita coluna desnecessária, PK composta garante unicidade natural.

---

## Insight 6: Active State Detection em Hierarquias

Para navbar com dropdowns, active state deve detectar filhos:

```typescript
const isActive = items.some(item =>
  pathname === item.url ||
  item.children?.some(child => pathname === child.url)
)
```

**Benefício:** Dropdown fica ativo quando qualquer rota filha está ativa.

---

## Insight 7: Hover Dropdown com Delay

Dropdowns no hover precisam de delay para evitar frustração:

```typescript
const handleMouseLeave = () => {
  // Delay permite usuário "errar" o mouse sem fechar dropdown
  timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
}

const handleMouseEnter = () => {
  // Cancela o fechamento se usuário voltar rapidamente
  if (timeoutRef.current) clearTimeout(timeoutRef.current)
  setIsOpen(true)
}
```

**Benefício:** UX mais suave, menos fechamentos acidentais.

---

## Insight 8: Batch Processing para AI APIs

LLMs processam múltiplos itens mais eficientemente em batch:

```typescript
// ❌ Uma chamada por item (lento + caro)
for (const topic of topics) {
  const briefing = await generateBriefing(topic)
}

// ✅ Batch processing (rápido + barato)
const briefings = await generateObjectBatch({
  model: openrouter('gemini-flash-1.5'),
  schema: z.array(briefingSchema),
  input: topics.map(t => t.briefingPrompt),
})
```

**Benefício:** Reduz custo e latency significativamente.

---

## Insight 9: Semantic Ranking Pós-Filtragem

Embeddings devem ser usadas para ranking, não filtragem:

```typescript
// ❌ Filtrar por threshold (perde resultados relevantes)
const filtered = all.filter(t => t.similarity > 0.7)

// ✅ Rankear por score (mantém tudo, em ordem)
const ranked = all.sort((a, b) => b.similarity - a.similarity)
```

**Benefício:** Usuário decide o corte, não o sistema.

---

## Insight 10: AnimatePresence para Dropdowns Suaves

Framer Motion AnimatePresence previne "pop" visual:

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}  // Começa abaixo e transparente
      animate={{ opacity: 1, y: 0 }}    // Desliza para cima e aparece
      exit={{ opacity: 0, y: 8 }}       // Recolhe ao sair
      transition={{ duration: 0.15 }}    // Rápido mas visível
    >
      {/* Dropdown content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Benefício:** Dropdown sente "responsivo" e polido.

---

## Insight 11: Perplexity AI > Google SERP para Conteúdo

**Problema:** Google SERP via scraping é instável e retorna resultados não estruturados.

**Solução:** Perplexity API com modelo "sonar" fornece:
- Resumo gerado por IA do tópico
- Citations (URLs de referência)
- Resposta estruturada e pronta para uso

```typescript
// Perplexity Response
{
  choices: [{ message: { content: "AI-generated summary..." } }],
  citations: ["https://source1.com", "https://source2.com", ...]
}

// Mapeamento para TrendingTopic
topics.push({
  id: `perp-summary-${Date.now()}`,
  title: `Resumo IA: ${keyword}`,
  context: aiSummary.substring(0, 1000),
  source: {
    type: 'perplexity',
    url: citations[0],
    rawData: { summary: aiSummary, allCitations: citations }
  }
})
```

**Benefício:** Conteúdo mais rico e pronto para usar, com URLs de referência validadas.

---

## Insight 12: AI Theme Processing melhora qualidade do Wizard

**Problema:** Temas salvos do Discovery vêm com dados brutos que precisam de refinamento.

**Solução:** Processar temas com IA antes de criar Wizard:

```typescript
// Antes: dados brutos
theme: "Como usar IA para marketing"
context: "...500+ caracteres de texto..."

// Depois: processados por IA
theme: "Estratégias de IA para Marketing Digital"
context: "• 3 principais use cases\n• Melhores ferramentas 2026\n• ROI médio por setor"
objective: "Educar marketers sobre aplicações práticas de IA"
referenceUrl: "https://melhor-fonte.com"  // Extraído das citations
```

**Modelo:** `google/gemini-2.0-flash-exp:free` (grátis via OpenRouter)

**Benefício:** Wizard começa com conteúdo mais refinado, menos edição manual necessária.

---

## Insight 13: Tabs UI > Lista Única para Multi-Plataforma

**Problema:** Resultados de múltiplas plataformas misturados ficam confusos.

**Solução:** Tabs com contadores por plataforma:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="all">Todos ({totalResults})</TabsTrigger>
    <TabsTrigger value="youtube">
      <Youtube className="text-red-500" /> YouTube ({youtubeResults.length})
    </TabsTrigger>
    <TabsTrigger value="perplexity">
      <Brain className="text-purple-500" /> Perplexity ({perplexityResults.length})
    </TabsTrigger>
    <TabsTrigger value="instagram">
      <Instagram className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white" />
      Instagram ({instagramResults.length})
    </TabsTrigger>
  </TabsList>
</Tabs>
```

**Cores por plataforma:**
- YouTube: Vermelho (`text-red-500`)
- Perplexity: Roxo (`text-purple-500`)
- Instagram: Gradiente Rosa (`from-yellow-400 via-pink-500 to-purple-600`)

**Benefício:** Usuário pode focar em uma plataforma específica.

---

## Insight 14: SuggestedContentType baseado na plataforma

**Problema:** Usuário precisa selecionar manualmente o tipo de conteúdo para cada plataforma.

**Solução:** Inferir contentType da plataforma:

```typescript
// SocialThemeProcessorService
if (platform === 'youtube') {
  suggestedContentType = 'video'  // Padrão para YouTube
} else if (platform === 'instagram') {
  suggestedContentType = 'image'  // Padrão para Instagram
  // AI pode sugerir 'carousel' ou 'video' baseado no conteúdo
}

// Wizard já vem pre-preenchido
const [wizard] = await db.insert(contentWizards).values({
  contentType: suggestedContentType,  // Pre-selecionado
  theme: wizardTheme,
  context: wizardContext,
})
```

**Benefício:** Menos cliques, fluxo mais rápido.

---

## Insight 15: JSON Parse com Fallback para respostas de IA

**Problema:** LLMs às vezes retornam markdown com ```json``` blocks.

**Solução:** Parser robusto com múltiplas tentativas:

```typescript
private parseAIResponse(aiResponse: string): ProcessedResult {
  try {
    let jsonStr = aiResponse.trim();

    // 1. Remove markdown code blocks
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // 2. Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // 3. Parse
    return JSON.parse(jsonStr);
  } catch (error) {
    // 4. Fallback - retorna dados básicos
    return {
      theme: fallbackTheme,
      context: aiResponse.substring(0, 500),
    };
  }
}
```

**Benefício:** Mais resiliente a variações de resposta da IA.

---

## Insight 16: Reference URL extraction de citations

**Problema:** Temas do Discovery não têm URL de referência confiável.

**Solução:** Para Perplexity, usar a primeira citation como reference URL:

```typescript
private getBestReferenceUrl(citations: string[], sourceUrl?: string): string {
  if (citations.length > 0) {
    return citations[0];  // Primeira citation é geralmente a melhor
  }
  return sourceUrl || '';  // Fallback para source URL original
}
```

**Benefício:** Wizard sempre tem uma URL de referência válida para RAG.

---

## Padrões Estabelecidos

### Para Services Externos

```typescript
class ExternalService {
  private apiKey = process.env.API_KEY

  async method(): Promise<ServiceResult<T>> {
    // 1. Validar API key
    if (!this.apiKey) {
      return { success: true, data: [] }  // Graceful degradation
    }

    try {
      // 2. Chamar API
      const response = await fetch(url)
      const data = await response.json()

      // 3. Transformar dados
      const transformed = this.transform(data)

      return { success: true, data: transformed }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}
```

### Para Server Actions

```typescript
export async function action(params: Params) {
  // 1. Autenticação
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // 2. Query com soft delete check
  const result = await db
    .select()
    .from(table)
    .where(and(
      eq(table.userId, userId),
      isNull(table.deletedAt)  // Sempre incluir
    ))

  return result
}
```

### Para Cards UI

```tsx
<Card className="hover:border-primary/50 transition-all">
  <div className="p-4">
    {/* Header: ícone + título + badge */}
    {/* Body: conteúdo principal */}
    {/* Footer: metadata + data */}
  </div>
</Card>
```

---

## Próximas Melhorias

1. **Cache de Embeddings:** Salvar embeddings por palavra-chave
2. **Rate Limiting:** Implementar rate limiting por usuário
3. **Background Jobs:** Busca assíncrona de trending topics
4. **Webhooks:** Notificar usuário quando tema trend aparecer
5. **Mais Plataformas:** TikTok, Twitter/X, LinkedIn
