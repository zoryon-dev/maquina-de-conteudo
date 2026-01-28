# Variáveis do Sistema - Documentação Completa

Este documento descreve TODAS as variáveis usadas nos prompts do sistema Máquina de Conteúdo.

---

## 1. Variáveis de Usuário (User Brand Presets)

Variáveis que vêm das configurações de marca do usuário no banco de dados.

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `brand.voiceTone` | string | Tom de voz da comunicação | "auténtico, direto, sem enrolação" |
| `brand.brandVoice` | string | Personalidade única da marca | "como um amigo que te fala a verdade" |
| `brand.niches` | string | Segmentos de mercado | "marketing digital, empreendedorismo" |
| `brand.targetAudience` | string | Demografia + Psicografia | "empreendedores 25-40 anos que buscam crescimento real" |
| `brand.fearsAndPains` | string | Dores e medos da audiência | "medo de ficar para trás, frustração com promessas falsas" |
| `brand.desiresAndAspirations` | string | Desejos e aspirações | "construir um negócio que faça sentido, liberdade geográfica" |
| `brand.differentials` | string | Diferenciais únicos | "sem guru, só prática, sem fluff" |
| `brand.contentObjectives` | string | Objetivos do conteúdo | "educar transformando perspectiva" |
| `brand.preferredCTAs` | string | CTAs preferidos | "se isso ressoa, salva | compartilha" |
| `brand.forbiddenTerms` | string | Termos proibidos | "garantia, certeza, 100%, hack, segredo" |

---

## 2. Variáveis de Input (Wizard Context)

Variáveis que o usuário insere durante o Wizard de criação.

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `theme` | string | Tema central do conteúdo | "Produtividade para empreendedores" |
| `context` | string | Contexto adicional | "Foco em quem trabalha home office" |
| `objective` | string | Objetivo do conteúdo | "Engajar e educar sobre foco" |
| `targetAudience` | string | Público-alvo | "Empreendedores iniciantes" |
| `tone` | string | Tom desejado | "Inspirador, direto" |
| `niche` | string | Nicho de atuação | "Marketing Digital" |
| `numberOfSlides` | number | Número de slides (carrossel) | 7 |

---

## 3. Variáveis de Narrativa (Narrative Context)

Variáveis que vêm da narrativa tribal selecionada.

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `narrative.angle` | enum | Ângulo tribal | "HEREGE", "VISIONARIO", "TRADUTOR", "TESTEMUNHA" |
| `narrative.title` | string | Título da narrativa | "Produtividade tóxica está matando seu negócio" |
| `narrative.description` | string | Descrição da transformação | "Descobrir que fazer menos, melhor, gera mais resultado" |
| `narrative.hook` | string | Hook de abertura | "Você não precisa de mais disciplina. Você precisa de menos tarefas." |
| `narrative.core_belief` | string | Crença compartilhada | "Qualidade de vida e sucesso não são opostos" |
| `narrative.status_quo_challenged` | string | Status quo questionado | "A cultura de 'hustle' como única forma de crescer" |

---

## 4. Variáveis de RAG (Contexto de Documentos)

Variáveis que vêm do sistema de RAG (documentos carregados pelo usuário).

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `ragContext` | string | Contexto completo dos documentos | Texto extraído e embeddings |
| `extractedContent` | string | Conteúdo extraído de URL | Texto completo de um artigo |

---

## 5. Variáveis de Síntese (Synthesizer Output)

Variáveis geradas pelo Synthesizer a partir da pesquisa Tavily.

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `synthesizedResearch.resumo_executivo` | string | Resumo executivo |
| `synthesizedResearch.throughlines_potenciais` | array | Throughlines identificados |
| `synthesizedResearch.tensoes_narrativas` | array | Tensões narrativas |
| `synthesizedResearch.dados_contextualizados` | array | Dados com frases prontas |
| `synthesizedResearch.exemplos_narrativos` | array | Histórias completas |
| `synthesizedResearch.erros_armadilhas` | array | Erros contra-intuitivos |
| `synthesizedResearch.frameworks_metodos` | array | Frameworks e métodos |
| `synthesizedResearch.hooks` | array | Ganchos de abertura |
| `synthesizedResearch.progressao_sugerida` | object | Estrutura 3 atos |

---

## 6. Variáveis de Geração de Imagem (AI Options)

Variáveis para configuração de geração de imagens via IA.

| Variável | Tipo | Opções |
|----------|------|--------|
| `options.model` | enum | `google/gemini-3-pro-image-preview`, `openai/gpt-5-image`, `bytedance-seed/seedream-4.5`, `black-forest-labs/flux.2-max` |
| `options.color` | enum | `neutro`, `quente`, `frio`, `vibrante`, `pastel`, `personalizado` |
| `options.customColor` | string | Hex code (quando color = personalizado) |
| `options.style` | enum | `minimalista`, `moderno`, `classico`, `playful`, `profissional`, `artistico` |
| `options.composition` | enum | `centralizado`, `grid`, `diagonal`, `assimétrico`, `dinâmico` |
| `options.mood` | enum | `calmo`, `energético`, `misterioso`, `inspirador`, `urgente` |
| `options.additionalContext` | string | Notas adicionais do usuário |

---

## 7. Variáveis de Thumbnail (Nano Banana)

Variáveis específicas para geração de thumbnails com Nano Banana v5.0.

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `thumbnailTitle` | string | Título curto (4-6 palavras) |
| `estilo` | enum | `profissional`, `minimalista`, `moderno`, `energético`, `educacional`, `provocativo`, `inspirador`, `tech` |
| `contextoTematico` | string | Contexto temático |
| `expressao` | string | Expressão facial sugerida |
| `referenciaImagem1` | string | URL da foto da pessoa |
| `referenciaImagem2` | string | URL da referência de estilo |
| `instrucoesCustomizadas` | string | Instruções extras |
| `tipoFundo` | string | Tipo de fundo |
| `corTexto` | string | Cor do texto |
| `posicaoTexto` | string | Posição do texto |
| `tipoIluminacao` | string | Tipo de iluminação |

---

## 8. Variáveis de Vídeo (Video Script)

Variáveis para geração de roteiros de vídeo.

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `duration` | string | `2-5min`, `5-10min`, `+10min`, `+30min` |
| `intention` | string | Intenção do vídeo |
| `cta` | string | Call-to-action desejado |
| `negativeTerms` | array | Termos negativos |
| `narrativeHook` | string | Hook da narrativa |
| `coreBelief` | string | Crença central |
| `statusQuoChallenged` | string | Status quo desafiado |
| `selectedTitle` | string | Título selecionado |

---

## 9. Variáveis de SEO (YouTube)

Variáveis para otimização de SEO do YouTube.

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `primaryKeyword` | string | Palavra-chave primária |
| `secondaryKeywords` | array | Palavras-chave secundárias |
| `searchIntent` | enum | `informational`, `transactional`, `navigational` |
| `competitorVideos` | array | URLs de vídeos concorrentes |
| `roteiroContext.valorCentral` | string | Valor central do roteiro |
| `roteiroContext.hookTexto` | string | Hook usado |
| `roteiroContext.topicos` | array | Tópicos cobertos |
| `roteiroContext.duracao` | string | Duração estimada |

---

## 10. Variáveis de Settings (Configurações Globais)

Variáveis de ambiente do sistema.

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `WIZARD_DEFAULT_MODEL` | string | Modelo padrão do Wizard |
| `SYNTHESIZER_DEFAULT_MODEL` | string | Modelo padrão do Synthesizer |
| `OPENROUTER_API_KEY` | string | API Key da OpenRouter |
| `NEXT_PUBLIC_APP_URL` | string | URL da aplicação |
| `NEXT_PUBLIC_APP_NAME` | string | Nome da aplicação |
