# Wizard Phase 2: Synthesizer v3.1 e Image Generation

> **Data**: Janeiro 2026
> **Autores**: Claude Code + Equipe
> **Status**: ✅ Implementado

## Visão Geral

Este documento documenta a implementação da **Phase 2** do Wizard de Criação, que adiciona duas funcionalidades críticas:

1. **Synthesizer v3.1** - Etapa intermediária de processamento de pesquisa via LLM
2. **Image Generation** - Sistema dual de geração de imagens (AI + HTML Templates)

---

## Parte 1: Synthesizer v3.1

### O Problema

O fluxo original do Wizard ia direto de `Tavily Search → Narratives`, perdendo uma etapa crítica de síntese e estruturação da pesquisa. Isso resultava em:

- Narrativas genéricas sem profundidade de pesquisa
- Perda de dados valiosos coletados pelo Tavily
- Dificuldade em extrair "throughlines" e tensões narrativas
- Prompts de narrativa sobrecarregados com dados brutos

### A Solução

Adicionar uma etapa intermediária **Synthesizer** que transforma resultados brutos do Tavily em campos de pesquisa estruturados:

```
Tavily Raw Results → SYNTHESIZER (LLM) → SynthesizedResearch → Narratives
```

### Campos de Saída

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `resumo_executivo` | string | Executive summary da pesquisa |
| `throughlines_potenciais` | array | 3-5 throughlines com viral potential |
| `tensoes_narrativas` | array | Tensões que criam engagement |
| `dados_contextualizados` | array | Dados prontos com frase_pronta + contraste |
| `exemplos_narrativos` | array | Histórias completas (protagonista → resultado) |
| `erros_armadilhas` | array | Erros contra-intuitivos |
| `frameworks_metodos` | array | Frameworks validados |
| `hooks` | array | Ganchos para slides/captions |
| `progressao_sugerida` | object | Estrutura 3 atos |
| `perguntas_respondidas` | array | Para open loops |
| `gaps_oportunidades` | array | O que a pesquisa não cobriu |

### Campos Renomeados (v3.1)

Para melhor clareza, v3.1 renomeou campos da v3.0:

| v3.0 | v3.1 | Razão |
|------|------|-------|
| `por_que_funciona` | `potencial_viral` | Mais descritivo |
| `como_reforcar` | `justificativa` | Termo mais preciso |
| `por_que_engaje` | `tipo` | Classificação de tensão |
| `como_explorar` | `uso_sugerido` | Ação clara |
| `dado` | `frase_pronta` | Indica prontidão |
| `implicacao_pratica` | `contraste` | Elemento de contraste |

### ProgressaoSugeridaV3 Structure

Nova estrutura mais clara para progressão narrativa:

```typescript
interface ProgressaoSugeridaV3 {
  ato1_captura: {
    gancho_principal: string;
    tensao_inicial: string;
    promessa: string;
  };
  ato2_desenvolvimento: string[];    // Array de beats narrativos
  ato3_resolucao: {
    verdade_central: string;
    call_to_action_natural: string;
  };
}
```

### Prompt do Synthesizer

O prompt do Synthesizer foi desenhado para:

1. **Extrair atravéslinhas** - frases centrais que conectam todos os slides
2. **Identificar tensões** - contradições que criam engagement
3. **Contextualizar dados** - transformar números em "frases prontas"
4. **Mapear frameworks** - metodologias validadas
5. **Sugerir progressão** - estrutura 3 atos para o conteúdo

### Integração com Narratives

O prompt de geração de narrativas (`getNarrativesSystemPrompt`) agora recebe:

```typescript
const synthesizerInput = {
  research: synthesizedResearch,  // Toda a pesquisa estruturada
  extractedContent: extractedContent,
  ragContext: ragContext,
  // ...
}
```

Isso permite narrativas muito mais ricas e fundamentadas em dados reais.

---

## Parte 2: Image Generation

### O Problema

Geração de imagens para slides de carousel com múltiplos desafios:

- Modelos AI podem falhar ou estar indisponíveis
- Necessidade de consistência visual entre slides
- Custo elevado de múltiplas gerações AI
- Templates HTML como fallback confiável

### A Solução

Sistema **dual-method** com fallback gracioso:

```
AI Generation (OpenRouter) ─┐
                           ├→ Imagens
HTML Templates (ScreenshotOne) ┘
```

### Método 1: AI Generation

Via OpenRouter, suporta 4 modelos:

| Modelo | ID | Caso de Uso |
|--------|-----|------------|
| Gemini Image | `google/gemini-3-pro-image-preview` | Alta qualidade, rápido |
| GPT-5 Image | `openai/gpt-5-image` | Premium |
| Seedream | `bytedance-seed/seedream-4.5` | Criativo |
| Flux | `black-forest-labs/flux.2-max` | Fotorealista |

### Método 2: HTML Templates (ScreenshotOne)

**ScreenshotOne** é um serviço de HTML→Image com 18 templates integrados.

#### Access Key vs Secret Key

**Importante**: Usar **Access Key** (não Secret Key) para autenticação padrão:

```env
SCREENSHOT_ONE_ACCESS_KEY=seu-access-key-aqui
# SCREENSHOT_ONE_SECRET_KEY=opcional-apenas-para-urls-publicas
```

**Por que?**
- **Access Key**: Para autenticação padrão server-side (nosso caso)
- **Secret Key**: Apenas para assinar URLs públicas (compartilhamento em `<img>`)

#### 18 Templates Disponíveis

```typescript
const HTML_TEMPLATES = {
  // Gradient-based (4)
  GRADIENT_SOLID: "gradiente-solid",
  GRADIENT_LINEAR: "gradiente-linear",
  GRADIENT_RADIAL: "gradiente-radial",
  GRADIENT_MESH: "gradiente-mesh",

  // Typography (3)
  TYPOGRAPHY_BOLD: "tipografia-bold",
  TYPOGRAPHY_CLEAN: "tipografia-clean",
  TYPOGRAPHY_OVERLAY: "tipografia-overlay",

  // Patterns (4)
  PATTERN_GEOMETRIC: "padrão-geométrico",
  PATTERN_DOTS: "padrão-círculos",
  PATTERN_LINES: "padrão-linhas",
  PATTERN_WAVES: "padrão-ondas",

  // Styles (4)
  GLASSMORPHISM: "glassmorphism",
  NEOMORPHISM: "neomorphism",
  BRUTALIST: "brutalista",
  NEUMORPHISM: "neumorphism",

  // Themes (4)
  DARK_MODE: "dark-mode",
  LIGHT_MODE: "light-mode",
  NEON_GLOW: "neon-glow",
  SUNSET_VIBES: "sunset-vibes",
}
```

### Padrão de Fallback

```typescript
async function generateImageWithFallback(input) {
  // Tenta AI primeiro
  const aiResult = await generateAiImage(input);
  if (aiResult.success) return aiResult;

  // Fallback para HTML template
  return await generateHtmlTemplateImage(input);
}
```

---

## Parte 3: Prompts v4.1 / v2.0

### Carousel v4.1

**Atualizações principais**:
- Tags XML para estruturar prompt: `<identidade>`, `<filosofia_central>`, `<sistema_throughline>`
- Integração com Synthesizer v3.1
- ProgressaoSugeridaV3 structure

### Image Post v2.0

**Estrutura HCCA**:
- **H**ook → Primeira linha (curiosidade)
- **C**ontexto → Desenvolvimento
- **C**onteúdo → Valor principal
- **A**ção → CTA natural

### Video Script v2.0

**5 estruturas**:
1. Problema-Solução
2. Lista/Dicas
3. Storytelling
4. Polêmica
5. Tutorial

---

## Arquivos Criados/Modificados

### Novos Arquivos

```
src/lib/wizard-services/
├── synthesis-types.ts          # Tipos Synthesizer v3.1
├── image-types.ts              # Tipos Image Generation
├── synthesizer.service.ts      # Serviço Synthesizer
├── image-generation.service.ts # Serviço AI Image
└── screenshotone.service.ts   # Serviço HTML Templates

src/app/(app)/wizard/components/
├── steps/step-5-image-generation.tsx
└── shared/
    ├── synthesis-summary.tsx
    └── image-generation-options.tsx
```

### Arquivos Modificados

```
src/lib/wizard-services/
├── prompts.ts                  # Atualizado v4.1/v2.0
├── types.ts                    # Exporta novos tipos
└── index.ts                    # Barrel exports atualizado

src/app/api/workers/
└── route.ts                    # Handler wizard_image_gen
```

---

## Aprendizados

### 1. Estruturação de Dados via LLM

O Synthesizer prova que usar LLM para **estruturar** dados (não apenas gerar) cria valor superior:

- **Antes**: Dados brutos do Tavily → Narrativa genérica
- **Depois**: Dados brutos → Synthesizer → Campos estruturados → Narrativa rica

### 2. Fallback é Essencial

Para features dependentes de APIs externas (AI image), sempre ter fallback:

- AI → HTML Template
- Gemini → GPT-5 → Seedream
- Template → Template simples

### 3. Nomenclatura Importa

Campos bem nomeados (`frase_pronta` vs `dado`) melhoram:
- Compreensão do código
- Manutenibilidade
- Comunicação entre equipe

### 4. Access Key vs Secret Key

ScreenshotOne ensina:
- **Access Key**: Para autenticação de API calls server-side
- **Secret Key**: Para assinar URLs públicas (compartilhamento)

---

## Referências

- **Wizard Patterns**: `.serena/memories/wizard-patterns.md`
- **Dev Wizard**: `.context/docs/development-plan/dev-wizard.md`
- **Architecture**: `.context/docs/architecture.md`
- **Synthesis Types**: `src/lib/wizard-services/synthesis-types.ts`
- **Image Types**: `src/lib/wizard-services/image-types.ts`

---

*Última atualização: 19 de Janeiro de 2026*
