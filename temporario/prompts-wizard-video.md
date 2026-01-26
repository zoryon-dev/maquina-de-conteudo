# Prompts Wizard - Vídeo

Documentação dos prompts utilizados no Wizard de criação de vídeo para geração de títulos e thumbnails.

---

## 1. Prompt de Geração de Títulos de Thumbnail

**Arquivo:** `src/lib/wizard-services/video-titles.service.ts`

**Função:** `getVideoTitlesSystemPrompt()`

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
Um título tribal NÃO é:
- "5 segredos que ninguém te conta" (genérico)
- "Você não vai acreditar nisso" (clickbait vazio)

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
4. Usar números quando apropriado (ex: "5 REGRAS")
5. Linguagem direta e concreta
6. Evitar clichês genéricos
</regras_absolutas>

<angulos_tribais>
| Ângulo | Exemplo de Título |
|--------|-------------------|
| HEREGE | "5 REGRAS QUE OS RICOS ESCONDEM" |
| VISIONÁRIO | "COMO CONSTRUIR RIQUEZA EM 10 ANOS" |
| TRADUTOR | "O QUE NINGUÉM EXPLICA SOBRE INVESTIMENTO" |
| TESTEMUNHA | "EU PERDI TUDO ANTES DE APRENDER ISSO" |
</angulos_tribais>

<padroes_que_funcionam>
- "X [COISA] QUE [Y] [VERBO]" → "5 HÁBITOS QUE OS MILIONÁRIOS TÊM"
- "COMO [VERBO] [RESULTADO]" → "COMO DOBRAR SUA RENDA"
- "POR QUE [VERBO] [COISA]" → "POR QUE VOCÊ FALHA EM [X]"
- "O QUE [X] [Y] [Z]" → "O QUE NINGUÉM DIZ SOBRE [X]"
- "[NÚMERO] [COISA] [ADJETIVO]" → "3 ERROS QUE ESTÃO TE DESTRUINDO"
</padroes_que_funcionam>

<checklist_qualidade>
Antes de finalizar cada título, verifique:
□ Máximo 6 palavras?
□ Cria curiosidade genuína?
□ Não revela a resposta?
□ Funciona em 200px de largura?
□ Alinha com o ângulo tribal?
□ Evita clichês genéricos?
</checklist_qualidade>

<formato_saida>
{
  "titles": [
    {
      "title": "TÍTULO EM CAPS (máx 6 palavras)",
      "hook_factor": 85, // 0-100, quão cativante é
      "reason": "Por que esse título funciona (1 frase)"
    }
  ]
}
</formato_saida>

IMPORTANTE:
- Gere EXATAMENTE 5 opções distintas
- Cada título deve ter um estilo diferente
- Varie os padrões usados
- Retorne APENAS o JSON, sem explicações
</system_prompt>
```

### User Prompt (Entradas)

```
<entrada>

<narrativa_selecionada>
  <angulo>${narrativeAngle}</angulo>
  <titulo>${narrativeTitle}</titulo>
  <descricao>${narrativeDescription}</descricao>
</narrativa_selecionada>

<tema_principal>${theme}</tema_principal>
<publico_alvo>${targetAudience}</publico_alvo>
<objetivo>${objective}</objetivo>

</entrada>

<instrucoes>
Gere 5 opções de título para thumbnail seguindo as diretrizes do system prompt.

Considere:
- Ângulo tribal: ${narrativeAngle}
- Narrativa: ${narrativeTitle}
- Tema: ${theme}
- Público: ${targetAudience}

Os títulos devem fazer a pessoa pensar: "Isso é sobre mim" — não "Me enganaram com clickbait".
</instrucoes>
```

### Parâmetros de Entrada (ATUALIZADO)

**NOVO FLUXO:** Após geração do roteiro, o prompt agora recebe:

```typescript
interface GenerateVideoTitlesParams {
  roteiroGerado: VideoScriptStructured; // NOVO: Roteiro completo gerado
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  theme?: string;
  targetAudience?: string;
  objective?: string;
}
```

O `roteiroGerado` fornece contexto rico:
- `meta.valor_central` - O que a pessoa aprende
- `roteiro.hook` - Gancho usado no vídeo
- `roteiro.desenvolvimento` - Seções de conteúdo
- `thumbnail.titulo` - Título sugerido no roteiro

### Resposta Esperada

```json
{
  "titles": [
    {
      "title": "5 REGRAS QUE NINGUÉM CONTA",
      "hook_factor": 92,
      "reason": "Combina número + curiosidade + promessa de segredo"
    },
    {
      "title": "POR QUE VOCÊ AINDA É POBRE",
      "hook_factor": 88,
      "reason": "Provocação direta que cria reconhecimento de dor"
    }
  ]
}
```

---

## 2. Prompt de Geração de Thumbnail (Nano Banana v4.3)

**Arquivo:** `src/lib/wizard-services/video-thumbnail.service.ts`

**Função:** `getNanoBananaSystemPrompt()`

### System Prompt

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
Nano Banana usa estrutura específica de prompt:

[ESTILO] [SUJEITO] [AÇÃO/POSE] [EXPRESSÃO] [FUNDO] [ILUMINAÇÃO] [EXTRAS]

Exemplo:
"professional photography, brazilian man 30s, facing camera, confident smile, solid dark blue background, studio lighting, holding coffee mug, text overlay '5 REGRAS' in bold white"
</formato_nano_banana>

<estrutura_prompt_nano_banana>
Gere o prompt seguindo EXATAMENTE esta estrutura:

═══════════════════════════════════════════════════
LINHA 1 — FORMATO E ESTILO BASE
"YouTube thumbnail, 1280x720, 16:9 horizontal, [estilo_base]"

LINHA 2 — SUJEITO PRINCIPAL
"[descrição pessoa/objeto], [pose], [expressão], [vestuário]"

LINHA 3 — TEXTO OVERLAY
"bold text overlay '[TEXTO]' in [cor] [tipografia], [posição], high contrast, readable at small size"

LINHA 4 — FUNDO
"[tipo fundo] background, [cores], [elementos extras se houver]"

LINHA 5 — ILUMINAÇÃO E MOOD
"[tipo iluminação], [atmosfera], [extras visuais]"
═══════════════════════════════════════════════════
</estrutura_prompt_nano_banana>

<checklist_qualidade>
Antes de finalizar, verifique:

□ Texto tem no máximo 6 palavras?
□ Texto está em CAPS?
□ Alto contraste entre texto e fundo?
□ Posição do texto em zona segura?
□ Expressão facial combina com tema?
□ Fundo não compete com texto?
□ Formato é 16:9 horizontal?
□ Legível em 200px de largura?
</checklist_qualidade>

<formato_saida>
Retorne APENAS JSON válido:

{
  "prompt": "[prompt completo no formato Nano Banana, 5 linhas estruturadas]",

  "negative_prompt": "blurry text, illegible typography, misspelled words, text cut off at edges, distorted letters, watermark, low quality, pixelated, vertical format, portrait orientation, cluttered composition, too many elements, generic stock photo, text outside safe zone",

  "especificacoes": {
    "texto": "[texto exato que aparece na thumbnail]",
    "cor_texto": "[cor do texto em hex]",
    "cor_fundo": "[cor principal do fundo em hex]",
    "posicao_texto": "centro|terco_superior|terco_inferior",
    "expressao": "[expressão facial]"
  },

  "variacoes": [
    "Variação 1: [descrição curta de alternativa]",
    "Variação 2: [descrição curta de alternativa]"
  ]
}

RETORNE APENAS O JSON.
</formato_saida>
```

### User Prompt (Entradas)

```
<entradas>
<titulo_thumbnail>${thumbnailTitle}</titulo_thumbnail>
<estilo>${estilo}</estilo>
<estilo_descritores>${styleInfo}</estilo_descritores>
<tema>${contextoTematico}</tema>
<contexto_roteiro>${contextoRoteiro}</contexto_roteiro> <!-- NOVO -->
<expressao_sugerida>${expressao || "confiante"}</expressao_sugerida>
<referencia_pessoa>${referenciaImagem1 ? "SIM" : "NÃO"}</referencia_pessoa>
<referencia_estilo>${referenciaImagem2 ? "SIM" : "NÃO"}</referencia_estilo>
</entradas>

<mapeamento_estilos>
O estilo selecionado (${estilo}) tem as seguintes características:
- Descritores: ${styleInfo.split("|")[0].trim()}
- Paleta de cores: ${styleInfo.split("|")[1].trim()}
- Tipo de fundo: ${styleInfo.split("|")[2].trim()}
</mapeamento_estilos>

<regras_texto_thumbnail>
TEXTO: "${thumbnailTitle}"

Regras para texto na thumbnail:
1. Máximo 6 palavras (ideal: 3-4)
2. SEMPRE em CAPS para impacto
3. Fonte: Bold sans-serif (nunca thin/script)
4. Cor: Alto contraste com fundo
5. Posição: centro ou terço superior
6. Tratamento: outline ou shadow para legibilidade
</regras_texto_thumbnail>

<contexto_do_roteiro> <!-- NOVA SEÇÃO -->
O roteiro gerado fornece contexto importante:
- Valor Central: ${roteiro.meta.valor_central}
- Hook Usado: ${roteiro.roteiro.hook.texto}
- Duração: ${roteiro.meta.duracao_estimada}
- Estilo Sugerido: ${roteiro.thumbnail.estilo}

Use esse contexto para criar thumbnail que combine visualmente com o conteúdo.
</contexto_do_roteiro>
```

### Parâmetros de Entrada (ATUALIZADO)

```typescript
interface GenerateVideoThumbnailParams {
  thumbnailTitle: string; // Título selecionado
  roteiroGerado: VideoScriptStructured; // NOVO: Roteiro completo
  estilo: NanoBananaStyle;
  contextoTematico: string;
  expressao?: string;
  referenciaImagem1?: string; // Base64 da foto do criador
  referenciaImagem2?: string; // Base64 de referência visual
  variacaoIndex?: number;
}
```

### Estilos Disponíveis

```typescript
type NanoBananaStyle =
  | "profissional"  // Navy, white, gold | solid dark
  | "minimalista"   // Black, white, accent | solid single color
  | "moderno"       // Bright gradients | gradient, geometric
  | "energético"    // Orange, yellow, red | energetic gradient
  | "educacional"   // Blue, green, white | soft solid
  | "provocativo"   // Red, black, white | dark dramatic
  | "inspirador"    // Gold, orange, cream | warm gradient
  | "tech"          // Cyan, purple, dark | dark with glow
```

### Resposta Esperada

```json
{
  "prompt": "YouTube thumbnail, 1280x720, 16:9 horizontal, professional photography\nbrazilian woman 30s, facing camera, confident smile, professional attire\nbold text overlay '5 REGRAS' in white sans-serif, center position, high contrast, readable at small size\nsolid navy blue background, subtle gradient\nstudio lighting, professional atmosphere, clean composition",

  "negative_prompt": "blurry text, illegible typography, misspelled words, text cut off at edges, distorted letters, watermark, low quality, pixelated, vertical format, portrait orientation, cluttered composition, too many elements, generic stock photo, text outside safe zone",

  "especificacoes": {
    "texto": "5 REGRAS",
    "cor_texto": "#FFFFFF",
    "cor_fundo": "#1E3A8A",
    "posicao_texto": "centro",
    "expressao": "confiante"
  },

  "variacoes": [
    "Variação 1: Use posição superior com texto maior",
    "Variação 2: Adicione sutil glow no texto"
  ]
}
```

---

## 3. Fluxo Atualizado

### Fluxo ANTIGO (Problemático)
```
Inserções → Narrativas → [Títulos] → [Roteiro] → [Thumbnail]
                      ↓ Usa narrativa
                      ↓
                   [ROTEIRO]
                      ↓ Gera sem contexto de título
```

### Fluxo NOVO (Otimizado)
```
Inserções → Narrativas → [Roteiro] → [Títulos] → [Thumbnail]
                      ↓            ↓ Usa roteiro
                      ↓            ↓
                   [ROTEIRO]    [CONTEXTO RICO]
                                  - valor_central
                                  - hook
                                  - thumbnail sugerido
                                  - desenvolvimento
```

### Benefícios do Novo Fluxo

1. **Contexto Rico**: Títulos são gerados com base no roteiro completo
2. **Coerência**: Thumbnail visual combina com o conteúdo do vídeo
3. **Valor Central**: Titles destacam o aprendizado principal do vídeo
4. **Hook Consistente**: Título complementa o hook do roteiro
5. **Thumbnail Alinhado**: Sugestões visuais do roteiro orientam a geração

---

## 4. Implementação Técnica

### Service: `video-titles.service.ts`

```typescript
export async function generateVideoTitles(
  params: GenerateVideoTitlesParams
): Promise<GenerateVideoTitlesResult> {

  // NOVO: Extrai contexto do roteiro
  const valorCentral = params.roteiroGerado?.meta?.valor_central || "";
  const hookTexto = params.roteiroGerado?.roteiro?.hook?.texto || "";
  const thumbnailSugerido = params.roteiroGerado?.thumbnail?.titulo || "";

  const userPrompt = getVideoTitlesUserPrompt({
    ...params,
    valorCentral,
    hookTexto,
    thumbnailSugerido,
  });

  // ... gera títulos
}
```

### Service: `video-thumbnail.service.ts`

```typescript
export async function generateVideoThumbnail(
  params: GenerateVideoThumbnailParams
): Promise<GenerateVideoThumbnailResult> {

  // NOVO: Extrai contexto do roteiro
  const valorCentral = params.roteiroGerado?.meta?.valor_central || "";
  const hookTexto = params.roteiroGerado?.roteiro?.hook?.texto || "";
  const estiloSugerido = params.roteiroGerado?.thumbnail?.estilo || "";

  const userPrompt = getNanoBananaUserPrompt({
    ...params,
    valorCentral,
    hookTexto,
    estiloSugerido,
  });

  // ... gera thumbnail
}
```

---

## 5. Notas de Implementação

- **Modelo Recomendado**: `google/gemini-3-flash-preview` (títulos) / `openai/gpt-4.1` (thumbnails)
- **Temperature**: 0.8 (títulos) / 0.7 (thumbnails)
- **Max Tokens**: 1000 (títulos) / 1500 (thumbnails)
- **Response Format**: `json_object`

- **Retry Logic**: 3 tentativas com exponential backoff
- **Validation**: Type guards para verificar formato da resposta
- **Error Handling**: Retorna estrutura `{success, data?, error?}`

---

**Última Atualização:** 2025-01-25
**Versão:** v4.3 - Contexto Rico com Roteiro Gerado
