# Prompts Expandidos - Narrativas com Campos Detalhados

> **Data de Criação:** 19 de Janeiro de 2026
> **Mudança:** Expansão de 4 para 9 campos em cada narrativa
> **Objetivo:** Fornecer contextos mais ricos e densos para geração de conteúdo

---

## O Que Mudou?

### Antes (Versão Original)
Cada narrativa tinha **4 campos básicos**:
```json
{
  "id": "narrative-1",
  "angle": "criativo",
  "title": "Título",
  "description": "Descrição"
}
```

**Problema:** Contexto "pobre" - informações insuficientes para gerar conteúdo de qualidade.

---

### Depois (Versão Expandida)
Cada narrativa agora tem **9 campos ricos**:
```json
{
  "id": "narrative-1",
  "angle": "criativo",
  "title": "Título",
  "description": "Descrição",
  "viewpoint": "Ponto de vista único",
  "whyUse": "Por que usar esta abordagem",
  "impact": "Impacto esperado no público",
  "tone": "Tom de voz recomendado",
  "keywords": ["palavra1", "palavra2", "..."],
  "differentiation": "Diferencial em relação aos outros ângulos",
  "risks": "Riscos e cuidados ao usar este ângulo"
}
```

**Benefício:** Contexto denso e específico para geração de conteúdo superior.

---

## Campos Expandidos - Detalhamento

### 1. viewpoint (Ponto de Vista)

**Objetivo:** Expressar uma perspectiva única, não apenas uma descrição.

**Instrução no Prompt:**
```
VIEWPOINT (Ponto de Vista):
- Deve expressar uma PERSPECTIVA ÚNICA, não apenas uma descrição
- Use frases como "Através da lente de...", "Sob a ótica de...", "Partindo da premissa de..."
- Evite generalidades - seja ESPECÍFICO sobre o ângulo
```

**Exemplo Prático:**
```json
{
  "viewpoint": "Sob a ótica da inovação disruptiva, este enfoque trata a transformação digital não como uma ferramenta, mas como uma mudança fundamental de mentalidade que reescreve as regras do jogo."
}
```

---

### 2. whyUse (Por que Usar)

**Objetivo:** Listar benefícios concretos, não abstrações.

**Instrução no Prompt:**
```
WHY USE (Por que Usar):
- Liste BENEFÍCIOS CONCRETOS, não abstrações
- Use verbos de ação: "engajar", "converter", "posiciona", "diferencia"
- Conecte ao objetivo: "Ideal para [objetivo específico]"
```

**Exemplo Prático:**
```json
{
  "whyUse": "Esta abordagem é ideal para marcas que precisam se destacar em um mercado saturado, pois gera curiosidade imediata e compartilhamento social. Funciona especialmente bem para lançamentos e reposicionamento de marca."
}
```

---

### 3. impact (Impacto)

**Objetivo:** Descrever a reação esperada do público.

**Instrução no Prompt:**
```
IMPACT (Impacto):
- Descreva a REAÇÃO ESPERADA do público
- Use palavras emocionais: "curiosidade", "urgência", "reflexão", "empatia"
- Seja específico sobre o resultado mental desejado
```

**Exemplo Prático:**
```json
{
  "impact": "O público sentirá um impulso imediato de reflexão seguido de uma sensação de possibilidades infinitas. A narrativa cria uma dissonância cognitiva positiva que motiva a ação."
}
```

---

### 4. tone (Tom de Voz)

**Objetivo:** Ser descritivo sobre o estilo linguístico.

**Instrução no Prompt:**
```
TONE (Tom de Voz):
- Seja DESCRITIVO sobre o estilo linguístico
- Use adjetivos como: "provocativo", "reassurante", "questionador", "entusiasmado"
- Evite termos genéricos como "profissional" ou "adequado"
```

**Exemplo Prático:**
```json
{
  "tone": "Provocativo e visionário, usando metáforas de exploração e descoberta. O tom alterna entre questionamento desestabilizante e revelação inspiradora."
}
```

---

### 5. keywords (Palavras-chave)

**Objetivo:** 5 termos relevantes que aparecem naturalmente no conteúdo.

**Instrução no Prompt:**
```
KEYWORDS (Palavras-chave):
- 5 palavras ou frases curtas relevantes para a narrativa
- Devem ser termos que apareceriam naturalmente no conteúdo final
- Inclua TERMOS DE IMPACTO (não apenas palavras de preenchimento)
```

**Exemplo Prático:**
```json
{
  "keywords": ["disrupção", "quebra de paradigmas", "inovação radical", "mudança de jogo", "novas possibilidades"]
}
```

---

### 6. differentiation (Diferenciação)

**Objetivo:** Explicar o que torna esta narrativa diferente das outras 3.

**Instrução no Prompt:**
```
DIFFERENTIATION (Diferenciação):
- Explique o que torna ESTA narrativa DIFERENTE das outras 3
- Use comparações explícitas: "Ao contrário do ângulo X, este foca em..."
- Destaque o VANTAGEM ÚNICA
```

**Exemplo Prático:**
```json
{
  "differentiation": "Ao contrário do ângulo estrategico que foca em ROI e métricas, e do inspirador que apela para emoção, este ângulo criativo desafia o público a questionar premissas básicas. É a única abordagem que busca reescrever as regras antes de jogar o jogo."
}
```

---

### 7. risks (Riscos)

**Objetivo:** Ser honesto sobre limitações e armadilhas potenciais.

**Instrução no Prompt:**
```
RISKS (Riscos):
- Seja HONESTO sobre limitações ou armadilhas potenciais
- Advertência sobre clichês: "Evite exagerar para não perder credibilidade"
- Cuidados com interpretação: "Certifique-se de que..."
```

**Exemplo Prático:**
```json
{
  "risks": "Evite abstrações excessivas que possam confundir o público. Certifique-se de que cada conceito revolucionário seja ancorado em exemplos tangíveis. Não perca a conexão com a realidade do negócio."
}
```

---

## Comparação Lado a Lado

### Narrativa Criativa - Antes vs Depois

**ANTES (4 campos):**
```json
{
  "id": "narrative-1",
  "angle": "criativo",
  "title": "Ideias Fora da Caixa",
  "description": "Abordagem inovadora que quebra padrões convencionais."
}
```

**DEPOIS (9 campos):**
```json
{
  "id": "narrative-1",
  "angle": "criativo",
  "title": "Ideias Fora da Caixa",
  "description": "Abordagem inovadora que quebra padrões convencionais.",
  "viewpoint": "Através da lente da criatividade radical, este enfoque trata cada convenção como uma oportunidade de reinvenção. Parte da premissa de que o comportado é o inimigo da memorabilidade.",
  "whyUse": "Esta abordagem é ideal para marcas que precisam se destacar em um mercado saturado. Gera curiosidade imediata, alto potencial de compartilhamento social e fortalece a percepção de marca inovadora.",
  "impact": "O público sentirá um impulso imediato de reflexão seguido de uma sensação de possibilidades infinitas. A narrativa cria uma dissonância cognitiva positiva que motiva a ação.",
  "tone": "Provocativo e visionário, usando metáforas de exploração e descoberta. O tom alterna entre questionamento desestabilizante e revelação inspiradora.",
  "keywords": ["disrupção", "quebra de paradigmas", "inovação radical", "fora da caixa", "reinvenção"],
  "differentiation": "Ao contrário do ângulo estrategico que foca em resultados tangíveis, este busca surpreender através do inesperado. É a única abordagem que propõe mudar as regras antes de jogar o jogo.",
  "risks": "Evite abstrações excessivas que possam confundir o público. Certifique-se de que cada conceito revolucionário seja ancorado em exemplos concretos. Não perca a conexão com a realidade do negócio."
}
```

---

## Prompt Completo Expandido

```
Você é um estrategista de conteúdo sênior especializado em criar narrativas para redes sociais. Sua tarefa é gerar 4 opções de narrativa diferentes, cada uma com uma abordagem única e COMPLETAMENTE DETALHADA.

═══════════════════════════════════════════════════════════════════════════
OS 4 ÂNGULOS DE NARRATIVA
═══════════════════════════════════════════════════════════════════════════

1. CRIATIVO (Criativo)
   - Foca em inovação, originalidade e quebra de padrões
   - Usa linguagem criativa e metáforas
   - Propõe ideias fora da caixa
   - Ideal para marcas que querem se diferenciar

2. ESTRATÉGICO (Estratégico)
   - Foca em resultados, benefícios e lógica de negócio
   - Usa dados e argumentos racionais
   - Destaca valor proposition e ROI
   - Ideal para B2B e produtos de maior valor

3. DINÂMICO (Dinâmico)
   - Foca em energia, urgência e captura imediata de atenção
   - Usa linguagem ativa e verbos de ação
   - Cria senso de oportunidade única
   - Ideal para promoções e lançamentos

4. INSPIRADOR (Inspirador)
   - Foca em storytelling, emoção e conexão humana
   - Usa narrativas e exemplos relatables
   - Conecta com propósitos maiores
   - Ideal para construir comunidade e lealdade

═══════════════════════════════════════════════════════════════════════════
FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido com esta estrutura:

{
  "narratives": [
    {
      "id": "narrative-1",
      "angle": "criativo",
      "title": "Título curto e impactante (máx 10 palavras)",
      "description": "Descrição concisa da abordagem em 1-2 frases",
      "viewpoint": "Ponto de vista único desta narrativa - qual perspectiva especial ela traz? (2-3 frases)",
      "whyUse": "Por que escolher esta abordagem - qual benefício específico ela oferece? (2-3 frases concretas)",
      "impact": "Impacto esperado no público - qual reação ou emoção se busca provocar? (2-3 frases)",
      "tone": "Tom de voz recomendado - descreva o estilo linguístico (ex: 'provocativo e questionador', 'calmo e reflexivo')",
      "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
      "differentiation": "Diferencial principal em relação aos outros ângulos - o que torna esta abordagem única? (2-3 frases)",
      "risks": "Riscos ou cuidados ao usar este ângulo - o que evitar para não cair em clichês ou mal-entendidos? (1-2 frases)"
    },
    {...narrative-2, narrative-3, narrative-4 com mesma estrutura completa...}
  ]
}

═══════════════════════════════════════════════════════════════════════════
CONSIDERAÇÕES PARA CADA NARRATIVA
═══════════════════════════════════════════════════════════════════════════

Ao criar cada narrativa, considere:
• Tipo de conteúdo: ${contentType}
• Tema principal: ${theme}
• Contexto adicional: ${context}
• Objetivo do conteúdo: ${objective}
• Público-alvo: ${targetAudience}
• Call to Action desejado: ${cta}
• Conteúdo de referência extraído: ${extractedContent}
• Pesquisa adicional: ${researchData}

═══════════════════════════════════════════════════════════════════════════
INSTRUÇÕES ESPECIAIS PARA CAMPOS DETALHADOS
═══════════════════════════════════════════════════════════════════════════

VIEWPOINT (Ponto de Vista):
- Deve expressar uma PERSPECTIVA ÚNICA, não apenas uma descrição
- Use frases como "Através da lente de...", "Sob a ótica de...", "Partindo da premissa de..."
- Evite generalidades - seja ESPECÍFICO sobre o ângulo

WHY USE (Por que Usar):
- Liste BENEFÍCIOS CONCRETOS, não abstrações
- Use verbos de ação: "engajar", "converter", "posiciona", "diferencia"
- Conecte ao objetivo: "Ideal para [objetivo específico]"

IMPACT (Impacto):
- Descreva a REAÇÃO ESPERADA do público
- Use palavras emocionais: "curiosidade", "urgência", "reflexão", "empatia"
- Seja específico sobre o resultado mental desejado

TONE (Tom de Voz):
- Seja DESCRITIVO sobre o estilo linguístico
- Use adjetivos como: "provocativo", "reassurante", "questionador", "entusiasmado"
- Evite termos genéricos como "profissional" ou "adequado"

KEYWORDS (Palavras-chave):
- 5 palavras ou frases curtas relevantes para a narrativa
- Devem ser termos que apareceriam naturalmente no conteúdo final
- Inclua TERMOS DE IMPACTO (não apenas palavras de preenchimento)

DIFFERENTIATION (Diferenciação):
- Explique o que torna ESTA narrativa DIFERENTE das outras 3
- Use comparações explícitas: "Ao contrário do ângulo X, este foca em..."
- Destaque o VANTAGEM ÚNICA

RISKS (Riscos):
- Seja HONESTO sobre limitações ou armadilhas potenciais
- Advertência sobre clichês: "Evite exagerar para não perder credibilidade"
- Cuidados com interpretação: "Certifique-se de que..."

IMPORTANTE:
- Cada narrativa deve ser DISTINCTA e claramente diferenciada
- Os títulos devem ser CATIVANTES e profissionais
- As descrições devem ser ESPECÍFICAS, não genéricas
- Adapte o tom de voz ao público-alvo especificado
- TODOS os campos devem ser preenchidos com conteúdo de qualidade
```

---

## Como os Campos São Usados

Os campos expandidos são passados integralmente para o prompt de geração de conteúdo:

```
═══════════════════════════════════════════════════════════════════════════
NARRATIVA SELECIONADA
═══════════════════════════════════════════════════════════════════════════

Ângulo: ${narrativeAngle}
Título: ${narrativeTitle}
Descrição: ${narrativeDescription}

[NA FASE DE CONTEÚDO, TODOS OS CAMPOS SÃO INCLUÍDOS]
Ponto de Vista: ${viewpoint}
Por que Usar: ${whyUse}
Impacto: ${impact}
Tom de Voz: ${tone}
Palavras-chave: ${keywords}
Diferenciação: ${differentiation}
Riscos: ${risks}
```

Isso significa que o conteúdo final é gerado com **muito mais contexto** sobre:
- Qual perspectiva usar (viewpoint)
- Que resultado buscar (impact)
- Como falar (tone)
- O que evitar (risks)
- Por que esta abordagem funciona (whyUse)

---

## TypeScript Types

```typescript
// src/lib/wizard-services/types.ts

export interface NarrativeOption {
  // Campos básicos (originais)
  id: string;
  angle: NarrativeAngle;
  title: string;
  description: string;

  // Campos expandidos (adicionados em Jan 2026)
  viewpoint?: string;
  whyUse?: string;
  impact?: string;
  tone?: string;
  keywords?: string[];
  differentiation?: string;
  risks?: string;
}

export type NarrativeAngle = "criativo" | "estrategico" | "dinamico" | "inspirador";
```
