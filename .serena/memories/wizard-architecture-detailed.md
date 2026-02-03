# Arquitetura Detalhada do Wizard - Content Studio

## Visão Geral
O Wizard é um sistema completo de criação de conteúdo alimentado por IA. Segue um fluxo de 5-8 etapas dependendo do tipo de conteúdo, com suporte robusto para narrativas tribais, templates aplicáveis em tempo real e geração de conteúdo personalizado.

---

## 1. FLUXO PRINCIPAL (Wizard Flow)

### Estrutura de Steps

1. **video-duration** (Opcional - Apenas vídeo)
   - Seleção de duração: 2-5min, 5-10min, +10min, +30min
   - Seleção de intenção do vídeo
   - Configurações iniciais de vídeo

2. **input** (Obrigatório)
   - Seleção de tipo de conteúdo: texto, imagem, carrossel, vídeo
   - Configuração de slides (carrossel)
   - Referências (URL e vídeo para transcrição)
   - **Base de Conhecimento RAG** - Seleção de documentos
   - Detalhes de conteúdo: tema, objetivo, CTA, audiência-alvo
   - Restrições (termos a evitar)
   - Configurações de IA (seleção de modelo)

3. **processing**
   - Extração de conteúdo de URLs (Firecrawl)
   - Transcrição de vídeos (YouTube)
   - Pesquisa Tavily + Synthesizer
   - Geração de narrativas (4 ângulos tribais)
   - Armazenamento de narrativas sintetizadas

4. **narratives**
   - Exibição de 4 narrativas com diferentes ângulos (Herege, Visionário, Tradutor, Testemunha)
   - Seleção de narrativa
   - Instruções customizadas opcionais
   - Configuração RAG (refinamento)
   - Resumo da pesquisa sintetizada

5. **generation**
   - Geração de conteúdo baseado na narrativa selecionada
   - Polling até conclusão (~30-90 segundos)
   - Exibição de preview estruturado

6. **content-approval** (Roteador)
   - Revisão do conteúdo gerado
   - Opção de regeneração
   - Roteia para próximo step baseado em tipo:
     - Vídeo → titles-selection
     - Carrossel/Imagem → image-generation
     - Texto → completed

7. **titles-selection** (Apenas vídeo)
   - Geração de 3-5 títulos para thumbnail
   - Seleção de título
   - Nota: Roteiro já foi gerado em generation

8. **thumbnail-config** (Apenas vídeo)
   - Configuração de estilo, cores, mood
   - Escolha entre geração por IA ou template HTML
   - Queue assíncrono para geração de thumbnail

9. **image-generation** (Carrossel/Imagem)
   - Geração de imagens para cada slide
   - Preview de imagens geradas
   - Queue assíncrono (30-60s por imagem)

10. **completed**
    - Confirmação de sucesso
    - Links para Biblioteca e novo wizard

---

## 2. TIPOS DE CONTEÚDO & TEMPLATES

### A. Carrossel (ZoryonCarousel v4.3)

**Estrutura JSON:**
```typescript
{
  throughline: string;              // Frase central conectando todos slides
  valor_central: string;            // O que a pessoa aprende
  capa: {
    titulo: string;
    subtitulo: string;
  };
  slides: [
    {
      numero: number;
      tipo: "problema" | "conceito" | "passo" | "exemplo" | "erro" | "sintese" | "cta";
      titulo: string;
      corpo: string;
      conexao_proximo: string;     // Coesão interna
      imagePrompt?: string;
    }
  ];
  legenda: string;
  hashtags?: string[];
  cta?: string;
}
```

**Tipos de Slide (Acionáveis):**
- **problema**: Define a dor específica
- **conceito**: Ensina ideia-chave
- **passo**: Ação concreta e executável
- **exemplo**: Caso real/história
- **erro**: Erro comum + como corrigir
- **sintese**: Resume aprendizado
- **cta**: Convida para ação

**Características:**
- 5-10 slides idealmente (performance melhor)
- Cada slide tem "conexao_proximo" para coesão narrativa
- Throughline une conceptualmente todos os slides

---

### B. Vídeo (VideoScriptStructured v4.4)

**Estrutura JSON:**
```typescript
{
  meta: {
    duracao_estimada: string;      // "X-Y minutos"
    angulo_tribal: NarrativeAngle;
    valor_central: string;         // O que se aprende
    transformacao_prometida?: string;
  };
  
  thumbnail: {
    titulo: string;                // 4-6 palavras, cria curiosidade
    expressao: string;             // Sugestão de expressão facial
    texto_overlay: string;         // Max 3 palavras
    estilo: string;               // Descrição visual
    cores_sugeridas?: string;
  };
  
  roteiro: {
    hook: {
      texto: string;              // Max 15 palavras
      tipo: "reconhecimento" | "provocacao" | "promessa" | "pergunta";
      duracao_segundos?: number;
      nota_gravacao: string;
    };
    contexto?: {
      texto: string;
      duracao_segundos?: number;
      nota_gravacao?: string;
    };
    desenvolvimento: [
      {
        numero: number;
        tipo: "problema"|"conceito"|"passo"|"exemplo"|"erro"|"contraste"|"sintese"|"cta";
        topico: string;           // 4-8 palavras
        insight: string;          // O que ENSINAR
        exemplo?: string;         // Exemplo concreto
        transicao: string;        // Conexão ao próximo
        nota_gravacao: string;    // Tom, visual, ritmo
      }
    ];
    cta: {
      texto: string;
      proximo_passo: string;      // Ação clara
      duracao_segundos?: number;
      nota_gravacao: string;
    };
  };
  
  notas_producao: {
    tom_geral: string;
    ritmo: string;
    visuais_chave: string[];
    musica_mood: string;
  };
  
  caption: string;                // Mín 200 palavras
  hashtags: string[];
}
```

**Duração e Profundidade:**
| Duração | Seções | Insights | Profundidade |
|---------|--------|----------|--------------|
| 2-5min | 3-4 | 4-6 | Direto, sem enrolação |
| 5-10min | 5-7 | 7-10 | Médio, com exemplos |
| +10min | 8-12 | 10-15 | Profundo, storytelling |
| +30min | 12-18 | 15-20 | Muito profundo, casos |

---

### C. Post de Texto (String simples)

**Estrutura:**
- Caption tribal (200-500 palavras)
- Hashtags (identidade + alcance)
- CTA contextualizado

---

### D. Post de Imagem (Único slide)

**Estrutura:**
- Título + conteúdo
- Image prompt para geração
- Caption + CTA

---

## 3. NARRATIVAS TRIBAIS (4 Ângulos)

### Sistema de Ângulos (Seth Godin)

Cada narrativa tem um ângulo que determina o approach de conteúdo:

**HEREGE** (Desafia consenso)
- Exemplo: "Você está fazendo isso errado"
- Hook: "Desafia verdade aceita"
- Tom: Provocativo, confiante, ousado
- Melhor para: Carrosséis polêmicos, Reels de "verdade incômoda"

**VISIONÁRIO** (Mostra futuro possível)
- Exemplo: "Imagine um mundo onde..."
- Hook: "Pinta futuro possível"
- Tom: Inspirador, esperançoso, elevado
- Melhor para: Posts inspiracionais, carrosséis de transformação

**TRADUTOR** (Simplifica complexo)
- Exemplo: "O que ninguém te explicou sobre..."
- Hook: "Promete clareza"
- Tom: Didático, claro, acessível
- Melhor para: Carrosséis educacionais, Reels explicativos

**TESTEMUNHA** (Compartilha jornada pessoal)
- Exemplo: "Eu costumava acreditar X, até descobrir Y"
- Hook: "Compartilha erro/aprendizado pessoal"
- Tom: Vulnerável, autêntico, identificável
- Melhor para: Posts de vulnerabilidade, Stories de bastidores

### Estrutura da Narrativa

```typescript
{
  id: string;
  title: string;
  description: string;
  angle: NarrativeAngle;
  
  // Campos Tribais (v4)
  hook?: string;                    // First sentence for recognition
  core_belief?: string;             // Crença compartilhada
  status_quo_challenged?: string;   // O que de senso comum é questionado
  
  // Campos Legados (still supported)
  viewpoint?: string;
  whyUse?: string;
  impact?: string;
  tone?: string;
  keywords?: string[];
  differentiation?: string;
  risks?: string;
}
```

---

## 4. SISTEMA DE PROMPTS (Configurável)

### Arquivo Central: `src/lib/wizard-services/prompts.ts`

**Estrutura:**
1. **Base Tribal System Prompt** (`getBaseTribalSystemPrompt()`)
   - Filosofia tribal universal
   - 4 ângulos tribais com definições
   - Anti-patterns (o que NUNCA fazer)

2. **Platform-Specific Prompts**
   - `getInstagramTribalSystemPrompt()` - Específico para Instagram
   - `getYouTubeTribalSystemPrompt()` - Específico para YouTube

3. **Content Generation Prompts**
   - `getCarouselPrompt()` - Para carrossél
   - `getVideoScriptV4Prompt()` - Para vídeo (v4.4)
   - `getTextPostPrompt()` - Para texto
   - `getImagePostPrompt()` - Para imagem

4. **Supporting Prompts**
   - `getThemeProcessingPrompt()` - Para Discovery/Tavily
   - `getNarrativesSystemPrompt()` - Para geração de narrativas
   - `getContentPrompt()` - Router de prompts específicos

### Como Funcionam os Templates

**Fluxo de Aplicação:**
1. Usuário seleciona tipo + preenche inputs
2. Sistema cria narrativas usando base prompt + ângulo tribal
3. Usuário seleciona narrativa
4. Sistema gera conteúdo usando:
   - **System Prompt**: Base tribal + contexto específico
   - **User Prompt**: Parâmetros do wizard (tema, CTA, RAG context, etc)
   - **Model Selected**: Usuário escolhe qual IA (OpenAI, Anthropic, Google, etc)

**Exemplo - Narrativas:**
```
System: [Base Tribal + HEREGE angle + anti-patterns]
User: {
  contentType: "carousel",
  theme: "Produtividade",
  targetAudience: "Empreendedores",
  ragContext: "[Documentos relevantes]"
}
→ LLM gera 4 narrativas (1 por ângulo)
```

**Exemplo - Geração de Conteúdo:**
```
System: [Base Tribal + TRADUTOR angle + formato carrossel]
User: {
  narrativeTitle: "Simplificar a produtividade",
  numberOfSlides: 8,
  ragContext: "[Context from selected documents]",
  customInstructions: "[User feedback]"
}
→ LLM gera carrossel estruturado com 8 slides tipados
```

---

## 5. INTEGRAÇÕES DE DADOS (Inputs para Templates)

### RAG (Retrieval Augmented Generation)

**Configuração:**
```typescript
{
  mode: "auto" | "manual" | "off";
  threshold?: number;      // Similarity score (default 0.4)
  maxChunks?: number;     // Máximo de chunks a usar
  documents?: number[];   // IDs de documentos específicos
  collections?: number[]; // IDs de coleções
}
```

**Impacto:**
- Influencia NARRATIVAS (synthesis + contexto)
- Influencia GERAÇÃO (RAG context passa para prompt)
- Metadados inclusos em GeneratedContent

### Firecrawl + Video Transcription

**URLs de Referência:**
- Web URL (Firecrawl) → Extracted content → RAG + narrativas
- Video URL (YouTube) → Transcription → RAG + narrativas

---

## 6. FLUXO BACKEND (API Routes)

### Criação de Wizard
```
POST /api/wizard
→ Cria registro com step="input"
→ Retorna wizard ID
```

### Submit Narrativas
```
POST /api/wizard/[id]/submit { submitType: "narratives" }
→ Cria job: WIZARD_NARRATIVES
→ Updates step="processing"
→ Em dev: Dispara worker imediatamente
→ Em prod: Cron executa worker
```

### Submit Geração
```
POST /api/wizard/[id]/submit { submitType: "generation", selectedVideoTitle?: {...} }
→ Cria job: WIZARD_GENERATION
→ Updates step="generation"
→ Polling até completion
```

### Geração de Imagens (Async Queue)
```
POST /api/wizard/[id]/queue-image-generation
→ Cria job: WIZARD_IMAGE_GENERATION
→ Retorna jobId
→ ProcessingModal monitora até completion
```

### Geração de Thumbnail (Async Queue)
```
POST /api/wizard/[id]/queue-thumbnail-generation
→ Cria job: WIZARD_THUMBNAIL_GENERATION
→ Retorna jobId
→ ProcessingModal monitora até completion
```

---

## 7. TIPOS PRINCIPAIS

### WizardFormData
```typescript
{
  contentType?: PostType;           // text | image | carousel | video
  numberOfSlides?: number;
  model?: string;                   // ID do modelo IA
  referenceUrl?: string;            // URL para extract
  referenceVideoUrl?: string;       // URL de vídeo
  videoDuration?: VideoDuration;    // "2-5min" | "5-10min" | "+10min" | "+30min"
  videoIntention?: string;          // Intenção do vídeo
  customVideoIntention?: string;
  theme?: string;
  context?: string;
  objective?: string;
  cta?: string;
  targetAudience?: string;
  ragConfig?: RagConfig;
  negativeTerms?: string[];
  selectedNarrativeId?: string;
  customInstructions?: string;      // Instruções adicionais para geração
  generatedContent?: string;        // JSON stringified
  imageGenerationConfig?: ImageGenerationConfig;
  generatedImages?: GeneratedImage[];
  selectedVideoTitle?: VideoTitleOption;
  generatedThumbnailData?: GeneratedThumbnailData;
}
```

### GeneratedContent
```typescript
{
  type: ContentType;
  slides?: GeneratedSlide[];        // Para carrossel
  caption?: string;
  hashtags?: string[];
  cta?: string;
  script?: string | VideoScriptStructured;  // Para vídeo
  thumbnail?: { imageUrl?, method, config };
  metadata: {
    narrativeId: string;
    narrativeTitle: string;
    narrativeAngle: NarrativeAngle;
    model: string;
    generatedAt: string;
    ragUsed: boolean;
    ragSources?: Array<{ id, title }>;
    throughline?: string;           // Carrossel
    valor_central?: string;
    duration?: VideoDuration;       // Vídeo
    intention?: string;
  };
}
```

---

## 8. LIMITAÇÕES ATUAIS

### Seleção de Templates
- **Não customizável via UI**: Templates são hardcoded em prompts.ts
- **Sem versioning de prompts**: Apenas 1 versão ativa
- **Sem A/B testing**: Sem comparação de resultados entre templates
- **Sem histórico de prompts**: Alterações não são auditadas

### Aplicação de Templates
- **Narrativas fixas**: Sempre 4 (1 por ângulo)
- **Sem contexto de histórico**: Templates não aprendem de posts anteriores
- **Sem preview de template**: Usuário não vê como template afeta resultado
- **Sem seleção de múltiplos templates**: Apenas 1 narrativa por wizard

### Tipos de Conteúdo
- **Carrossel**: Sempre para Instagram (não customizável por plataforma)
- **Vídeo**: Fixo em YouTube (não suporta TikTok, Instagram Reels diretamente)
- **Imagem**: Sem variações de proporção/tamanho

### Customização
- **RAG**: É "tudo ou nada" - integra ao sistema mas sem controle fino
- **Negative Terms**: Não há verificação se foram respeitados no output
- **Custom Instructions**: Aplicados apenas ao prompt, sem garantia de cumprimento
- **Sem rollback**: Uma vez gerado, não há undo (precisa regenerar)

### Performance
- **Polling de jobs**: Step generation faz polling a cada 2s (pode ser lento)
- **Sem streaming**: Toda geração é síncr ona até completion
- **Sem cache**: Mesmos inputs sempre geram novo conteúdo
- **Sem batch**: Uma wizard por vez

---

## 9. FLUXO DE DADOS COMPLETO

```
[Input Form]
    ↓
[Narratives Generation Job] → OpenRouter LLM
    ↓
[4 Narratives with 4 Angles] ← RAG context (optional)
    ↓
[User Selects 1 Narrative]
    ↓
[Content Generation Job] → OpenRouter LLM
    ↓
[GeneratedContent (JSON)] ← RAG context + Selected narrative
    ↓
[User Approves/Edits]
    ↓
[Content Type Router]
  ├─ Video → Titles Selection → Thumbnail Generation → Library
  ├─ Carousel → Image Generation → Library
  └─ Text/Image → Direct to Library
    ↓
[Saved to Database + Library]
```

---

## 10. CHAVES DE CONFIGURAÇÃO

**Modelos Suportados:**
- OpenAI: gpt-4o, gpt-4-turbo, gpt-4, gpt-3.5-turbo
- Anthropic: claude-opus, claude-sonnet, claude-haiku
- Google: gemini-3-flash, gemini-3-pro
- xAI: grok-3
- DeepSeek: deepseek-chat

**Duração de Vídeo (4 opções):**
- 2-5min: Rápido, direto
- 5-10min: Médio, com exemplos
- +10min: Profundo, storytelling
- +30min: Muito profundo, muitos casos

**Tipos de Ângulo Tribal:**
- herege: Provoca reflexão
- visionario: Inspira mudança
- tradutor: Educativo
- testemunha: Pessoal

---

## 11. PONTOS DE EXTENSÃO FUTUROS

Para adicionar múltiplos templates, seria necessário:

1. **Banco de dados para templates** - Armazenar versões de prompts
2. **Seletor de template na UI** - Permitir escolha antes de gerar
3. **Template versioning** - Rastrear qual versão foi usada
4. **A/B testing framework** - Comparar resultados
5. **Template composition** - Combinar múltiplos templates
6. **Custom prompt builder** - UI para criar prompts customizados
7. **Output caching** - Reutilizar outputs para mesmos inputs
8. **Feedback loop** - Aprender qual template funciona melhor
