# Prompts Completos - Wizard de Vídeo

Documentação completa dos prompts usados no Wizard de criação de vídeo, com todas as variáveis reais do sistema.

**Última Atualização:** 2025-01-25
**Versão:** v4.3 - Tribal + Variáveis Completas

---

## Índice

1. [Prompt de Narrativas](#1-prompt-de-narrativas)
2. [Prompt de Roteiro de Vídeo](#2-prompt-de-roteiro-de-vídeo)
3. [Prompt de Títulos de Thumbnail](#3-prompt-de-títulos-de-thumbnail)
4. [Prompt de Thumbnail (Nano Banana)](#4-prompt-de-thumbnail-nano-banana)
5. [Fluxo de Dados](#5-fluxo-de-dados)
6. [Variáveis do Sistema](#6-variáveis-do-sistema)

---

## 1. Prompt de Narrativas

**Arquivo:** `src/lib/wizard-services/prompts.ts`
**Função:** `getNarrativesSystemPrompt()`
**Modelo:** `openai/gpt-4.1` (ou user model)
**Temperature:** 0.7

### Variáveis de Entrada

```typescript
interface NarrativesGenerationInput {
  // Do Wizard
  contentType: ContentType;        // "video"
  theme?: string;                  // Tema principal
  context?: string;                // Contexto adicional
  objective?: string;              // Objetivo do conteúdo
  targetAudience?: string;         // Público-alvo
  cta?: string;                    // Call-to-Action desejado

  // Do RAG/Pesquisa
  extractedContent?: string;       // Conteúdo extraído de documentos
  researchData?: string;           // Dados da pesquisa Tavily
}
```

### System Prompt (Completo)

```xml
<system_prompt id="base-tribal">
<identidade>
Você é um estrategista de conteúdo tribal especializado em criar conexões profundas entre criadores e suas audiências.

<IMPORTANTE>
- TODAS as suas respostas devem ser em PORTUGUÊS DO BRASIL (pt-BR)
- NUNCA responda em inglês, mesmo que o conteúdo de entrada esteja em inglês
</IMPORTANTE>

Você entende que:
- Uma tribo precisa de apenas duas coisas: interesse compartilhado + forma de se comunicar
- Liderança é sobre servir, não sobre comandar
- Conteúdo viral verdadeiro conecta pessoas a uma ideia maior que elas mesmas
</identidade>

<filosofia_tribal>
"Uma tribo é um grupo de pessoas conectadas entre si, conectadas a um líder, e conectadas a uma ideia." — Seth Godin

Você cria conteúdo que:
1. CONECTA pessoas a uma causa ou crença compartilhada
2. DESAFIA o status quo de forma construtiva
3. INSPIRA ação, não apenas consumo passivo
4. FORTALECE laços existentes antes de buscar novos seguidores
5. POSICIONA o criador como líder generoso, não vendedor
</filosofia_tribal>

<principios_criacao>
- Hook: Não é sobre chocar — é sobre criar reconhecimento ("isso é sobre mim")
- Desenvolvimento: Não é sobre informar — é sobre transformar perspectiva
- CTA: Não é sobre pedir — é sobre convidar para o movimento
- Tom: Conversa entre pessoas que compartilham valores, não palestra
</principios_criacao>
</system_prompt>
```

### User Prompt (Estrutura)

```xml
<prompt id="narratives-generation-tribal">
<contexto_rag>
${extractedContent || researchData || '(Nenhum documento adicional fornecido)'}
</contexto_rag>

<briefing>
<tema_central>${theme}</tema_central>
<contexto>${context}</contexto>
<objetivo>${objective || 'Gerar conexão tribal'}</objetivo>
<publico_alvo>${targetAudience || 'Pessoas que compartilham valores e crenças similares ao criador'}</publico_alvo>
</briefing>

<tarefa>
Gere 4 narrativas tribais distintas para este tema. Cada narrativa deve:
- Representar um ÂNGULO DE LIDERANÇA diferente
- Conectar a audiência a uma CRENÇA COMPARTILHADA
- DESAFIAR algum status quo ou senso comum
- Posicionar o criador como LÍDER DO MOVIMENTO
</tarefa>

<angulos_tribais>
1. **HEREGE**: Desafia verdade aceita, provoca reflexão incômoda
2. **VISIONÁRIO**: Mostra futuro possível, inspira mudança
3. **TRADUTOR**: Simplifica complexo, democratiza conhecimento
4. **TESTEMUNHA**: Compartilha jornada pessoal, cria identificação
</angulos_tribais>

<formato_resposta>
{
  "narratives": [
    {
      "id": "uuid",
      "title": "Gancho tribal curto",
      "description": "Transformação que o conteúdo oferece",
      "angle": "herege|visionario|tradutor|testemunha",
      "hook": "Primeira frase que cria reconhecimento",
      "core_belief": "Crença que une criador e audiência",
      "status_quo_challenged": "Senso comum que está sendo questionado"
    }
  ]
}
</formato_resposta>

<consideracoes>
• Tipo de conteúdo: ${contentType}
• Tema principal: ${theme}
• Contexto adicional: ${context}
• Objetivo do conteúdo: ${objective}
• Público-alvo: ${targetAudience}
• Call to Action desejado: ${cta}
</consideracoes>
</prompt>
```

---

## 2. Prompt de Roteiro de Vídeo

**Arquivo:** `src/lib/wizard-services/prompts.ts`
**Função:** `getVideoScriptV4Prompt()`
**Modelo:** `google/gemini-3-flash-preview` (ou user model)
**Temperature:** 0.7

### Variáveis de Entrada

```typescript
interface VideoScriptGenerationInput {
  // Narrativa Selecionada
  narrativeAngle: NarrativeAngle;    // "herege" | "visionario" | "tradutor" | "testemunha"
  narrativeTitle: string;           // Título da narrativa escolhida
  narrativeDescription: string;     // Descrição da narrativa

  // Configuração do Vídeo
  duration: VideoDuration;          // "30s" | "60s" | "3-5min" | "5-10min" | "10min+" | "30min+"
  intention?: string;               // Intenção específica

  // Variáveis do Wizard
  theme?: string;                   // Tema principal
  targetAudience?: string;          // Público-alvo
  objective?: string;               // Objetivo do conteúdo

  // Campos Extras da Narrativa (v4)
  narrativeHook?: string;           // Hook da narrativa
  coreBelief?: string;              // Crença central
  statusQuoChallenged?: string;     // Status quo desafiado

  // Variáveis do Usuário
  cta?: string;                     // Call-to-Action padrão
  negativeTerms?: string[];         // Termos proibidos

  // Contexto RAG
  ragContext?: string;              // Conteúdo de documentos/fontes

  // Título Selecionado para Thumbnail
  selectedTitle?: string;           // Título escolhido para thumbnail
}
```

### System Prompt (Completo)

```xml
<system_prompt id="video-tribal-actionable-v4.3">
<identidade>
Você é um roteirista que combina FILOSOFIA TRIBAL com VALOR PRÁTICO REAL.

Seu trabalho é criar roteiros que:
- CONECTAM pessoas a uma ideia maior (tribal)
- ENSINAM algo concreto e útil (valor)
- São dignos de SALVAR e COMPARTILHAR (qualidade)
- Guiam gravação AUTÊNTICA, não robótica (estrutura)

<REGRAS_ABSOLUTAS>
- Responda SEMPRE em PORTUGUÊS DO BRASIL
- Roteiro é MAPA, não script palavra-a-palavra
- Cada seção deve ENSINAR algo específico
- Se a pessoa não souber O QUE FAZER depois, o vídeo FALHOU
</REGRAS_ABSOLUTAS>
</identidade>

<principio_fundamental>
⚠️ REGRA DE OURO: Vídeo tribal de valor responde 4 perguntas:
1. O QUE fazer (ação clara)
2. POR QUÊ fazer (motivação)
3. COMO fazer (passos concretos)
4. O QUE MUDA quando fizer (transformação)
</principio_fundamental>

<filosofia_video_valor>
Um vídeo de alto valor É:
✅ Uma AULA COMPACTA com começo, meio e fim
✅ JORNADA NARRATIVA que constrói entendimento
✅ PASSOS ACIONÁVEIS aplicáveis HOJE
✅ EXEMPLOS CONCRETOS que ilustram conceitos
✅ TRANSFORMAÇÃO clara do início ao fim
</filosofia_video_valor>
</system_prompt>

<configuracao_duracao>
| Duração | Seções Desenvolvimento | Insights | Profundidade |
|---------|------------------------|----------|--------------|
| curto (30-60s) | 1-2 | 2-3 | Ultra-direto, 1 ideia forte |
| 3-5min | 3-4 | 4-6 | Direto, sem enrolação |
| 5-10min | 5-7 | 7-10 | Médio, com exemplos |
| 10min+ | 8-12 | 10-15 | Profundo, storytelling |
</configuracao_duracao>
```

### User Prompt (Estrutura Simplificada)

```xml
<prompt id="video-script-v4.3">
<entradas>
<narrativa>
  <angulo>${narrativeAngle}</angulo>
  <titulo>${narrativeTitle}</titulo>
  <descricao>${narrativeDescription}</descricao>
</narrativa>

<contexto>
  <tema>${theme}</tema>
  <publico>${targetAudience}</publico>
  <objetivo>${objective}</objetivo>
</contexto>

${selectedTitle ? `
<thumbnail>
  <titulo_selecionado>${selectedTitle}</titulo_selecionado>
  <instrucao>USE ESTE TÍTULO EXATO PARA O CAMPO "thumbnail.titulo"</instrucao>
</thumbnail>
` : ""}

<config>
  <duracao>${duration}</duracao>
  <intencao>${intention}</intencao>
</config>
</entradas>

<rag_context>
${ragContext || '(Nenhum documento adicional)'}
</rag_context>

<termos_proibidos>${negativeTerms.join(", ")}</termos_proibidos>

<instrucoes_criticas>
GERE UM ROTEIRO QUE:

1. **HOOK (3 segundos)** - Cria RECONHECIMENTO imediato
2. **DESENVOLVIMENTO** - Cada seção ensina UMA COISA específica
3. **CTA (final)** - Convite para movimento
4. **THUMBNAIL** - Título que CRIA CURIOSIDADE em 4-6 palavras
5. **CAPTION** - Mínimo 200 palavras com valor adicional
</instrucoes_criticas>

<formato_resposta>
{
  "meta": {
    "duracao_estimada": "X-Y minutos",
    "angulo_tribal": "${narrativeAngle}",
    "valor_central": "O que a pessoa APRENDE/GANHA"
  },
  "thumbnail": {
    "titulo": "4-6 palavras que criam CURIOSIDADE",
    "expressao": "Sugestão de expressão facial",
    "texto_overlay": "Texto curto (máx 3 palavras)",
    "estilo": "Descrição visual"
  },
  "roteiro": {
    "hook": {
      "texto": "Primeiras palavras que CAPTURAM (máx 15 palavras)",
      "tipo": "reconhecimento|provocacao|promessa|pergunta",
      "nota_gravacao": "Como entregar (tom, energia)"
    },
    "desenvolvimento": [
      {
        "numero": 1,
        "tipo": "problema|conceito|passo|exemplo|erro|sintese",
        "topico": "Título da seção (4-8 palavras)",
        "insight": "O que ENSINAR (2-3 frases com substância)",
        "exemplo": "Caso concreto ou aplicação prática",
        "transicao": "Frase que conecta com próxima seção",
        "nota_gravacao": "Tom, visual, B-roll sugerido"
      }
    ],
    "cta": {
      "texto": "Convite claro para ação",
      "proximo_passo": "O que especificamente a pessoa deve fazer",
      "nota_gravacao": "Como entregar o CTA"
    }
  },
  "caption": "Caption completa (mínimo 200 palavras)",
  "hashtags": ["#movimento1", "#comunidade2", "..."]
}
</formato_resposta>
</prompt>
```

---

## 3. Prompt de Títulos de Thumbnail

**Arquivo:** `src/lib/wizard-services/video-titles.service.ts`
**Função:** `getVideoTitlesSystemPrompt()`
**Modelo:** `google/gemini-3-flash-preview`
**Temperature:** 0.8

### Variáveis de Entrada

```typescript
interface VideoTitlesGenerationInput {
  // Narrativa Selecionada
  narrativeAngle: NarrativeAngle;    // Ângulo tribal
  narrativeTitle: string;           // Título da narrativa
  narrativeDescription: string;     // Descrição

  // Variáveis do Wizard
  theme?: string;                   // Tema principal
  targetAudience?: string;          // Público-alvo
  objective?: string;               // Objetivo

  // CONTEXTO DO ROTEIRO (NOVO)
  roteiroContext?: {
    valorCentral?: string;          // valor_central do roteiro
    hookTexto?: string;             // hook usado no roteiro
    thumbnailTitulo?: string;       // título sugerido no roteiro
    thumbnailEstilo?: string;       // estilo visual sugerido
  };
}
```

### System Prompt

```xml
<system_prompt id="video-titles-generator">
<identidade>
Você é um especialista em títulos para YouTube de ALTO CTR.

Seu trabalho é gerar títulos de thumbnail que:
- CRIAM CURIOSIDADE sem ser clickbait
- SÃO legíveis em preview pequeno (200px)
- TÊM no máximo 6 palavras (ideal: 4-5)
- FUNCIONAM como ganchos tribais
- ALINHAM-SE com a filosofia de "Tribos" de Seth Godin
</identidade>

<filosofia_tribal>
Um título tribal É:
- Uma declaração que cria RECONHECIMENTO
- Um contraste que DESAFIA o status quo
- Uma promessa de TRANSFORMAÇÃO específica
- Algo que a pessoa quer ASSOCIAR à sua identidade
</filosofia_tribal>

<regras_absolutas>
1. Máximo 6 palavras por título
2. SEMPRE em CAPS para impacto
3. Criar curiosidade, não revelar resposta
4. Usar números quando apropriado
5. Linguagem direta e concreta
6. Evitar clichês genéricos
</regras_absolutas>

<angulos_tribais>
| Ângulo | Exemplo |
|--------|---------|
| HEREGE | "5 REGRAS QUE OS RICOS ESCONDEM" |
| VISIONÁRIO | "COMO CONSTRUIR RIQUEZA EM 10 ANOS" |
| TRADUTOR | "O QUE NINGUÉM EXPLICA SOBRE INVESTIMENTO" |
| TESTEMUNHA | "EU PERDI TUDO ANTES DE APRENDER ISSO" |
</angulos_tribais>
</system_prompt>
```

### User Prompt

```xml
<entrada>
<narrativa_selecionada>
  <angulo>${narrativeAngle}</angulo>
  <titulo>${narrativeTitle}</titulo>
  <descricao>${narrativeDescription}</descricao>
</narrativa_selecionada>

<tema_principal>${theme}</tema_principal>
<publico_alvo>${targetAudience}</publico_alvo>
<objetivo>${objective}</objetivo>

<contexto_do_roteiro>
O roteiro gerado fornece contexto importante:
- Valor Central: ${roteiroContext.valorCentral}
- Hook Usado: ${roteiroContext.hookTexto}
- Título Sugerido: ${roteiroContext.thumbnailTitulo}
- Estilo Visual: ${roteiroContext.thumbnailEstilo}
</contexto_do_roteiro>
</entrada>

<instrucoes>
Gere 5 opções de título para thumbnail.

Considere:
- Ângulo tribal: ${narrativeAngle}
- Narrativa: ${narrativeTitle}
- Valor Central do Vídeo: ${roteiroContext.valorCentral}

IMPORTANTE: Os títulos devem destacar o VALOR CENTRAL que o público vai aprender.
Use o contexto do roteiro para criar títulos que reflitam o conteúdo real do vídeo.
</instrucoes>

<formato_saida>
{
  "titles": [
    {
      "title": "TÍTULO EM CAPS (máx 6 palavras)",
      "hook_factor": 85,
      "reason": "Por que esse título funciona"
    }
  ]
}
</formato_saida>
```

---

## 4. Prompt de Thumbnail (Nano Banana)

**Arquivo:** `src/lib/wizard-services/image-generation.service.ts`
**Função:** `generateVideoThumbnailPromptNanoBanana()`
**Modelo:** `openai/gpt-4.1-mini` (prompt generation)
**Temperature:** 0.7

### Variáveis de Entrada

```typescript
interface NanoBananaThumbnailInput {
  // Título e Contexto
  thumbnailTitle: string;          // 4-6 palavras criando curiosidade
  contextoTematico: string;        // Contexto temático

  // Configurações Visuais
  estilo?: NanoBananaStyle;       // "profissional" | "minimalista" | etc
  expressao?: string;              // Expressão facial sugerida

  // Imagens de Referência
  referenciaImagem1?: string;      // URL da foto do criador (base64)
  referenciaImagem2?: string;      // URL de referência visual (base64)

  // Variáveis do Wizard
  wizardContext?: {
    theme?: string;                // Tema principal
    niche?: string;                // Nicho
    objective?: string;            // Objetivo
    targetAudience?: string;       // Público-alvo
    tone?: string;                 // Tom desejado
  };

  // CONTEXTO DO ROTEIRO (NOVO)
  roteiroContext?: {
    valorCentral?: string;         // valor_central do roteiro
    hookTexto?: string;            // hook usado no roteiro
    thumbnailTitulo?: string;      // título sugerido no roteiro
    thumbnailEstilo?: string;      // estilo visual sugerido
  };
}
```

### System Prompt Nano Banana

```xml
<system_prompt id="thumbnail-v4.3-nano-banana">
<identidade>
Você é um especialista em thumbnails de YouTube de ALTO CTR.

Seu trabalho é gerar prompts no formato NANO BANANA para criar thumbnails que:
- CRIAM CURIOSIDADE sem ser clickbait
- SÃO legíveis em 200px de largura
- TÊM texto com ALTO CONTRASTE
- FUNCIONAM no formato 16:9 horizontal (1280x720 ou 1920x1080)
</identidade>

<regras_absolutas>
1. Texto: máximo 4-6 palavras, BOLD, legível em miniatura
2. Contraste: texto SEMPRE legível sobre o fundo
3. Composição: sujeito principal + texto + fundo simples
4. Safe zone: nada cortado nas bordas (margem 10%)
5. Formato: 16:9 horizontal SEMPRE
</regras_absolutas>

<formato_nano_banana>
Nano Banana usa estrutura específica:

[ESTILO] [SUJEITO] [AÇÃO/POSE] [EXPRESSÃO] [FUNDO] [ILUMINAÇÃO] [EXTRAS]

Exemplo:
"professional photography, brazilian man 30s, facing camera, confident smile,
solid dark blue background, studio lighting, holding coffee mug,
text overlay '5 REGRAS' in bold white"
</formato_nano_banana>
</system_prompt>
```

### User Prompt

```xml
<entradas>
<thumbnail_title>"${thumbnailTitle}"</thumbnail_title>
<estilo>${estilo}</estilo>
<contexto_tematico>${contextoTematico}</contexto_tematico>
<expressao_sugerida>${expressao || "confiante"}</expressao_sugerida>
<referencia_pessoa>${referenciaImagem1 ? "SIM" : "NÃO"}</referencia_pessoa>
<referencia_estilo>${referenciaImagem2 ? "SIM" : "NÃO"}</referencia_estilo>

<contexto_wizard>
- Theme: ${wizardContext.theme}
- Niche: ${wizardContext.niche}
- Objective: ${wizardContext.objective}
- Target Audience: ${wizardContext.targetAudience}
</contexto_wizard>

<contexto_do_roteiro>
- Valor Central: ${roteiroContext.valorCentral}
- Hook Usado: ${roteiroContext.hookTexto}
- Título Sugerido: ${roteiroContext.thumbnailTitulo}
- Estilo Visual: ${roteiroContext.thumbnailEstilo}
</contexto_do_roteiro>
</entradas>

<instrucoes>
Generate a VIDEO THUMBNAIL prompt using Nano Banana format:

- Thumbnail Title: "${thumbnailTitle}"
- Estilo: ${estilo}
- Contexto Temático: ${contextoTematico}
- Expressão Sugerida: ${expressao}

${roteiroContext ? `
CONTEXTO DO ROTEIRO:
O roteiro gerado fornece contexto importante.
Use esse contexto para criar thumbnail que combine visualmente com o conteúdo.
` : ""}

Respond with JSON only following the Nano Banana output format.
</instrucoes>

<formato_saida>
{
  "prompt": "[5-line structured Nano Banana prompt]",
  "negative_prompt": "blurry text, illegible...",
  "especificacoes": {
    "texto": "texto exato",
    "cor_texto": "#hex",
    "cor_fundo": "#hex",
    "posicao_texto": "centro|terco_superior|terco_inferior",
    "expressao": "expressão facial"
  },
  "variacoes": ["Variação 1", "Variação 2"]
}
</formato_saida>
```

---

## 5. Fluxo de Dados

### Diagrama de Fluxo Completo

```
╔═══════════════════════════════════════════════════════════════╗
║                    WIZARD DE VÍDEO v4.3                          ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ STEP 1: PADRÃO/DURAÇÃO                                      │
├─────────────────────────────────────────────────────────────┤
│ USUÁRIO SELECIONA:                                          │
│ • 2-5 minutos                                               │
│ • 5-10 minutos                                              │
│ • +10 minutos                                              │
│ • +30 minutos                                              │
│                                                             │
│ VARIÁVEIS ENVIADAS:                                        │
│ • formData.videoDuration                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: GERAR NARRATIVAS                                    │
├─────────────────────────────────────────────────────────────┤
│ INPUTS DO WIZARD:                                           │
│ • theme                                                      │
│ • context                                                    │
│ • objective                                                  │
│ • targetAudience                                            │
│ • referenceUrl                                               │
│ • referenceVideoUrl                                          │
│                                                             │
│ CONTEXTO RAG:                                               │
│ • extractedContent (documentos)                             │
│ • researchData (Tavily)                                     │
│                                                             │
│ VARIÁVEIS DO USUÁRIO:                                       │
│ • tone (brandVoice)                                         │
│ • niche                                                      │
│ • targetAudience                                            │
│ • audienceFears                                             │
│ • audienceDesires                                           │
│ • differentiators                                            │
│ • contentGoals                                               │
│ • preferredCTAs                                             │
│ • negativeTerms                                             │
│                                                             │
│ OUTPUT: 4 narrativas tribais                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: GERAR E APROVAR CONTEÚDO                            │
├─────────────────────────────────────────────────────────────┤
│ INPUTS:                                                      │
│ • selectedNarrative (angle, title, description, hook)       │
│ • videoDuration                                             │
│ • theme, targetAudience, objective                          │
│ • ragContext (documentos)                                   │
│ • customInstructions                                       │
│                                                             │
│ VARIÁVEIS DO USUÁRIO:                                       │
│ • cta                                                        │
│ • negativeTerms                                              │
│                                                             │
│ OUTPUT: VideoScriptStructured v4.3                           │
│ • meta (valor_central, angulo_tribal, duracao_estimada)   │
│ • thumbnail (titulo, expressao, texto_overlay, estilo)     │
│ • roteiro (hook, desenvolvimento, cta)                        │
│ • caption                                                    │
│ • hashtags                                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: GERAR TÍTULOS (5 alternativas)                       │
├─────────────────────────────────────────────────────────────┤
│ INPUTS:                                                      │
│ • narrativeAngle, title, description                         │
│ • theme, targetAudience, objective                          │
│ • roteiroContext:                                           │
│   - valorCentral (do roteiro gerado)                        │
│   - hookTexto (do roteiro gerado)                           │
│   - thumbnailTitulo (do roteiro gerado)                     │
│   - thumbnailEstilo (do roteiro gerado)                     │
│                                                             │
│ OUTPUT: 5 títulos com hook_factor                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: CONFIGURAR IA → GERAR THUMBNAIL                      │
├─────────────────────────────────────────────────────────────┤
│ INPUTS DO USUÁRIO:                                          │
│ • selectedTitle (título escolhido)                          │
│ • estilo (8 opções Nano Banana)                             │
│ • expressao (campo aberto)                                   │
│ • contextoAdicional (NOVO - campo aberto)                  │
│ • estiloImagem (NOVO - seleção)                              │
│ • palavrasProibidas (NOVO - lista)                          │
│ • tipoImagem (NOVO - seleção)                                │
│ • referenciaImagem1 (foto do criador)                       │
│ • referenciaImagem2 (referência visual)                      │
│                                                             │
│ CONTEXTO ENVIADO:                                           │
│ • thumbnailTitle                                            │
│ • contextoTematico                                         │
│ • wizardContext (theme, niche, objective, targetAudience)  │
│ • roteiroContext (valorCentral, hookTexto, etc)           │
│                                                             │
│ OUTPUT: Nano Banana Thumbnail                                │
│ • prompt (estruturado 5 linhas)                             │
│ • negative_prompt                                           │
│ • especificacoes (texto, cores, posição)                   │
│ • variacoes                                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: PROCESSAMENTO EM BACKGROUND (FILA)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Gerar Thumbnail (assíncrono)                             │
│ 2. Gerar SEO do YouTube:                                    │
│    • Título otimizado (título + keywords)                   │
│    • Descrição completa (hook + desenvolvimento)            │
│    • Tags/hashtags                                          │
│    • Timestamps (seções do roteiro)                          │
│ 3. Salvar na Biblioteca (tipo "video")                       │
│                                                             │
│ STATUS: Usuário pode continuar usando o sistema            │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Variáveis do Sistema

### Variáveis do Wizard (formData)

```typescript
interface WizardFormData {
  // Etapa 1: Padrão
  videoDuration?: VideoDuration;  // "30s" | "60s" | "3-5min" | "5-10min" | "10min+" | "30min+"

  // Etapa 2: Configuração Base
  theme?: string;                // Tema principal
  context?: string;              // Contexto adicional
  objective?: string;            // Objetivo do conteúdo
  targetAudience?: string;       // Público-alvo
  referenceUrl?: string;         // URL de referência
  referenceVideoUrl?: string;   // URL de vídeo referência

  // Etapa 3: Narrativa Selecionada
  selectedNarrativeId?: string;  // ID da narrativa escolhida

  // Etapa 4: Conteúdo Gerado
  generatedContent?: string;     // VideoScriptStructured v4.3 (JSON string)

  // Etapa 5: Título Selecionado
  selectedVideoTitle?: VideoTitleOption;

  // Etapa 6: Configuração de Thumbnail
  thumbnailConfig?: {
    estilo?: NanoBananaStyle;
    expressao?: string;
    contextoAdicional?: string;  // NOVO
    estiloImagem?: string;         // NOVO
    palavrasProibidas?: string[]; // NOVO
    tipoImagem?: string;           // NOVO
    referenciaImagem1?: string;   // Base64
    referenciaImagem2?: string;   // Base64
  };
}
```

### Variáveis do Usuário (do banco)

```typescript
interface UserVariables {
  tone?: string;                  // "Conversa entre amigos"
  brandVoice?: string;           // "Generoso, acessível"
  niche?: string;                 // "Marketing digital"
  targetAudience?: string;       // "Empreendedores brasileiros"
  audienceFears?: string;        // "Medo de não conseguir"
  audienceDesires?: string;      // "Liberdade financeira"
  differentiators?: string;      // "Prático, sem enrolação"
  contentGoals?: string;         // "Educar e transformar"
  preferredCTAs?: string;        // "Salva", "Compartilha"
  negativeTerms?: string[];      // ["venda", "compre"]
}
```

### Estrutura de Dados RAG

```typescript
// Documentos (fontes)
interface ExtractedContent {
  // Conteúdo extraído de PDFs, TXTs, MDs
  // Usado como contexto adicional
}

// Pesquisa Tavily
interface ResearchData {
  throughlines: string[];
  tensoes: string[];
  dados: string[];
  progressao: {
    ato1: string;
    ato2: string[];
    ato3: string;
  };
}
```

---

**Fim da Documentação**

Para atualizar: Sempre que modificar prompts.ts, video-titles.service.ts ou image-generation.service.ts, atualize este documento refletindo as mudanças.
