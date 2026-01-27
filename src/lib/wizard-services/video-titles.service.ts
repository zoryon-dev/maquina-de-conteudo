/**
 * Video Titles Generation Service
 *
 * Generates 5 thumbnail title options for videos based on selected narrative.
 * These titles are designed to create curiosity while being tribal.
 */

import { generateText } from "ai";
import { openrouter } from "@/lib/ai/config";
import type { NarrativeAngle } from "./types";

export interface VideoTitleOption {
  id: string;
  title: string;
  hook_factor: number; // 0-100 score of how catchy it is
  reason: string; // Why this title works
  word_count?: number; // NEW: Number of words in title
  formula_used?: string; // NEW: Formula pattern used
  triggers?: string[]; // NEW: Psychological triggers used
  tribal_angle?: string; // NEW: Tribal angle alignment
}

export interface RoteiroContext {
  valorCentral?: string;
  hookTexto?: string;
  thumbnailTitulo?: string;
  thumbnailEstilo?: string;
}

export interface GenerateVideoTitlesParams {
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  theme?: string;
  targetAudience?: string;
  objective?: string;
  roteiroContext?: RoteiroContext; // NOVO: Contexto do roteiro gerado
  // NEW: Brand context for better title alignment
  brandContext?: {
    voiceTone?: string;
    targetAudience?: string;
    fearsAndPains?: string[];
    desiresAndAspirations?: string[];
    forbiddenTerms?: string[];
  };
}

export interface GenerateVideoTitlesResult {
  success: boolean;
  titles?: VideoTitleOption[];
  error?: string;
}

/**
 * Generates 5 thumbnail title options using AI.
 *
 * The titles are designed to:
 * - Create curiosity without being clickbait
 * - Be 4-6 words maximum
 * - Work in small preview (200px)
 * - Align with the selected tribal angle
 */
export async function generateVideoTitles(
  params: GenerateVideoTitlesParams
): Promise<GenerateVideoTitlesResult> {
  const {
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    theme,
    targetAudience,
    objective,
    roteiroContext,
  } = params;

  const systemPrompt = getVideoTitlesSystemPrompt();
  const userPrompt = getVideoTitlesUserPrompt({
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    theme,
    targetAudience,
    objective,
    roteiroContext,
  });

  try {
    // Direct LLM call
    const responseText = await llmCallWithRetry(
      "google/gemini-3-flash-preview",
      systemPrompt,
      userPrompt,
      3 // max retries
    );

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        success: false,
        error: "Invalid JSON response from LLM",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the response
    if (!parsed.titles || !Array.isArray(parsed.titles)) {
      return {
        success: false,
        error: "Invalid response format: missing titles array",
      };
    }

    // Ensure we have exactly 5 titles
    const titles: VideoTitleOption[] = parsed.titles.slice(0, 5).map((t: any, idx: number) => ({
      id: `title-${idx + 1}`,
      title: t.title || "",
      hook_factor: t.hook_factor || 50,
      reason: t.reason || "",
      word_count: t.word_count || undefined,
      formula_used: t.formula_used || undefined,
      triggers: t.triggers || undefined,
      tribal_angle: t.tribal_angle || undefined,
    }));

    return {
      success: true,
      titles,
    };
  } catch (error) {
    console.error("[VIDEO TITLES] Error generating titles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function getVideoTitlesSystemPrompt(): string {
  return `<system_prompt id="video-titles-generator">
<identity>
You are a YouTube thumbnail title specialist with expertise in behavioral psychology, tribal marketing, and high-CTR copywriting. Your titles have generated millions of clicks by triggering curiosity loops and identity recognition.
</identity>

<core_mission>
Generate thumbnail titles that:
1. CREATE an irresistible curiosity gap
2. TRIGGER tribal identity recognition
3. PROMISE specific transformation
4. FIT thumbnail constraints (readable at 200px)
5. ALIGN with video's core value
</core_mission>

## PSYCHOLOGICAL TRIGGERS (use at least 2 per title)

| Trigger | Mechanism | Example Pattern |
|---------|-----------|-----------------|
| CURIOSITY GAP | Brain needs closure | "O QUE NINGUÉM CONTA SOBRE..." |
| FEAR OF MISSING OUT | Loss aversion | "VOCÊ ESTÁ PERDENDO ISSO" |
| CONTRARIAN | Pattern interrupt | "PARE DE [common advice]" |
| SPECIFICITY | Credibility signal | "7 ERROS" > "ERROS" |
| IDENTITY | Tribal belonging | "POR QUE [grupo] SEMPRE..." |
| REVELATION | Hidden knowledge | "A VERDADE SOBRE..." |
| TRANSFORMATION | Before/after gap | "DE [estado A] PARA [estado B]" |
| AUTHORITY CHALLENGE | Question experts | "MENTIRAS QUE TE CONTARAM" |
| URGENCY | Time pressure | "ANTES QUE SEJA TARDE" |
| SOCIAL PROOF | Herd behavior | "TODO MUNDO FAZ ERRADO" |

## TRIBAL ANGLES (expanded)

| Angle | Psychology | Title Patterns | Energy |
|-------|------------|----------------|--------|
| **HEREGE** | Challenges orthodoxy, creates in-group | "A MENTIRA DE [crença comum]" / "[Número] REGRAS QUE [autoridade] ESCONDE" / "POR QUE [conselho popular] NÃO FUNCIONA" | Rebellious, bold |
| **VISIONÁRIO** | Paints future state, inspires | "COMO [resultado] EM [tempo]" / "O FUTURO DE [tema]" / "O QUE VEM DEPOIS DE [atual]" | Aspirational, forward |
| **TRADUTOR** | Simplifies complexity, builds trust | "O QUE NINGUÉM EXPLICA SOBRE [tema]" / "[Tema] EXPLICADO EM [tempo]" / "A VERDADE SIMPLES SOBRE [complexo]" | Clear, helpful |
| **TESTEMUNHA** | Personal proof, vulnerability | "EU [erro/fracasso] ANTES DISSO" / "COMO EU [transformação]" / "O DIA QUE EU [momento decisivo]" | Authentic, relatable |
| **PROVOCADOR** | Creates tension, demands reaction | "VOCÊ ESTÁ FAZENDO ERRADO" / "PARE DE [ação comum]" / "[Grupo] PRECISA OUVIR ISSO" | Confrontational, direct |
| **CURADOR** | Organizes chaos, saves time | "[Número] MELHORES [itens] DE [ano]" / "TUDO SOBRE [tema] EM [tempo]" / "O ÚNICO [recurso] QUE VOCÊ PRECISA" | Organized, valuable |

## TITLE FORMULAS (proven high-CTR patterns)

### Formula Bank
[NÚMERO] + [OBJETO] + QUE + [REVELAÇÃO]
  → "5 ERROS QUE DESTROEM SEU NEGÓCIO"

POR QUE + [GRUPO] + [AÇÃO CONTRÁRIA]
  → "POR QUE RICOS NÃO POUPAM DINHEIRO"

A VERDADE SOBRE + [CRENÇA COMUM]
  → "A VERDADE SOBRE ACORDAR CEDO"

COMO + [RESULTADO] + SEM + [OBSTÁCULO]
  → "COMO VENDER SEM PARECER VENDEDOR"

[AUTORIDADE] + NÃO QUER QUE VOCÊ + [AÇÃO]
  → "BANCOS NÃO QUEREM QUE VOCÊ SAIBA"

EU + [ERRO/AÇÃO] + E + [RESULTADO]
  → "EU IGNOREI ISSO E PERDI TUDO"

PARE DE + [AÇÃO COMUM] + (FAÇA ISSO)
  → "PARE DE POSTAR TODO DIA"

O QUE + [RESULTADO] + REALMENTE EXIGE
  → "O QUE FICAR RICO REALMENTE EXIGE"

[TEMPO] + PARA + [TRANSFORMAÇÃO]
  → "30 DIAS PARA MUDAR SUA VIDA"

ANTES DE + [AÇÃO] + ASSISTA ISSO
  → "ANTES DE INVESTIR, ASSISTA ISSO"

## ABSOLUTE RULES

### Must Do ✅
1. **MAX 6 WORDS** (ideal: 4-5) - cada palavra deve justificar seu espaço
2. **ALL CAPS** - padrão visual de thumbnail
3. **CONCRETE LANGUAGE** - "DINHEIRO" > "RECURSOS" / "EMAGRECER" > "PERDER PESO"
4. **OPEN LOOP** - criar curiosidade, nunca entregar a resposta
5. **FRONT-LOAD VALUE** - palavra mais importante primeiro
6. **READABLE AT 200PX** - testar mentalmente em miniatura

### Never Do ❌
1. ~~Títulos genéricos~~ ("DICAS IMPORTANTES", "VOCÊ PRECISA SABER")
2. ~~Clickbait sem entrega~~ (promessa ≠ conteúdo)
3. ~~Palavras vazias~~ ("INCRÍVEL", "IMPRESSIONANTE", "MUITO")
4. ~~Perguntas fracas~~ ("VOCÊ SABIA?", "JÁ PENSOU?")
5. ~~Mais de 6 palavras~~
6. ~~Artigos desnecessários~~ ("O", "A", "OS", "AS" quando evitáveis)
7. ~~Termos proibidos da marca~~ (usar brand.forbiddenTerms)

## LEGIBILITY RULES (thumbnail-specific)

GOOD: Palavras curtas, impactantes, espaçadas
BAD: Palavras longas, muitas sílabas, amontoadas

GOOD: "5 ERROS FATAIS"
BAD: "CINCO EQUÍVOCOS PROBLEMÁTICOS"

GOOD: "PARE AGORA"
BAD: "INTERROMPA IMEDIATAMENTE"

## OUTPUT FORMAT

{
  "titles": [
    {
      "title": "TÍTULO EM CAPS",
      "word_count": 4,
      "formula_used": "POR QUE + [GRUPO] + [AÇÃO CONTRÁRIA]",
      "triggers": ["CURIOSITY GAP", "CONTRARIAN"],
      "tribal_angle": "HEREGE",
      "hook_factor": 92,
      "reason": "Explicação de 1 linha do porquê funciona"
    }
  ],
  "recommended": 0,
  "recommendation_reason": "Por que este é o melhor para o contexto"
}

## SCORING CRITERIA (hook_factor)

| Criteria | Weight | Evaluation |
|----------|--------|------------|
| Curiosity gap strength | 25% | Quão forte é a vontade de clicar? |
| Tribal alignment | 20% | Conecta com identidade do público? |
| Word economy | 15% | Cada palavra é necessária? |
| Specificity | 15% | Concreto ou vago? |
| Value promise | 15% | Benefício claro? |
| Visual readability | 10% | Funciona em 200px? |

**Score Guide:**
- 90-100: Viral potential
- 80-89: Strong performer
- 70-79: Solid, testable
- <70: Needs iteration

## FINAL CHECKLIST (internal validation)

Before outputting, verify each title:
- [ ] ≤6 words?
- [ ] ALL CAPS?
- [ ] Creates open loop?
- [ ] Uses ≥2 psychological triggers?
- [ ] Aligns with tribal angle?
- [ ] Reflects valorCentral from script?
- [ ] Readable at thumbnail size?
- [ ] No forbidden terms?
- [ ] Concrete, not abstract?
- [ ] Would YOU click?

IMPORTANTE:
- Gere EXATAMENTE 5 opções distintas
- Cada título deve ter um estilo diferente
- Varie os padrões usados
- Retorne APENAS o JSON, sem explicações
</system_prompt>`;
}

function getVideoTitlesUserPrompt(params: GenerateVideoTitlesParams): string {
  const {
    narrativeAngle,
    narrativeTitle,
    narrativeDescription,
    theme,
    targetAudience,
    objective,
    roteiroContext,
    brandContext,
  } = params;

  let prompt = `<entrada>

<narrativa_selecionada>
  <angulo>${narrativeAngle}</angulo>
  <titulo>${narrativeTitle}</titulo>
  <descricao>${narrativeDescription}</descricao>
</narrativa_selecionada>`;

  if (theme) {
    prompt += `\n<tema_principal>${theme}</tema_principal>`;
  }

  if (targetAudience) {
    prompt += `\n<publico_alvo>${targetAudience}</publico_alvo>`;
  }

  if (objective) {
    prompt += `\n<objetivo>${objective}</objetivo>`;
  }

  // NOVO: Adiciona contexto do roteiro gerado
  if (roteiroContext) {
    prompt += `

<contexto_do_roteiro>
O roteiro gerado fornece contexto importante:`;

    if (roteiroContext.valorCentral) {
      prompt += `
- Valor Central: ${roteiroContext.valorCentral}`;
    }

    if (roteiroContext.hookTexto) {
      prompt += `
- Hook Usado: ${roteiroContext.hookTexto}`;
    }

    if (roteiroContext.thumbnailTitulo) {
      prompt += `
- Título Sugerido: ${roteiroContext.thumbnailTitulo}`;
    }

    if (roteiroContext.thumbnailEstilo) {
      prompt += `
- Estilo Visual: ${roteiroContext.thumbnailEstilo}`;
    }

    prompt += `
</contexto_do_roteiro>`;
  }

  // NOVO: Adiciona contexto da marca quando disponível
  if (brandContext) {
    prompt += `

<contexto_da_marca>`;

    if (brandContext.voiceTone) {
      prompt += `
- Tom da Voz: ${brandContext.voiceTone}`;
    }

    if (brandContext.fearsAndPains && brandContext.fearsAndPains.length > 0) {
      prompt += `
- Dores e Medos: ${brandContext.fearsAndPains.join(", ")}`;
    }

    if (brandContext.desiresAndAspirations && brandContext.desiresAndAspirations.length > 0) {
      prompt += `
- Desejos e Aspirações: ${brandContext.desiresAndAspirations.join(", ")}`;
    }

    if (brandContext.forbiddenTerms && brandContext.forbiddenTerms.length > 0) {
      prompt += `
- Termos Proibidos: ${brandContext.forbiddenTerms.join(", ")} (NUNCA usar)`;
    }

    prompt += `
</contexto_da_marca>`;
  }

  prompt += `

</entrada>

<instrucoes>
Gere 5 opções de título para thumbnail seguindo as diretrizes do system prompt.

Considere:
- Ângulo tribal: ${narrativeAngle}
- Narrativa: ${narrativeTitle}
${theme ? `- Tema: ${theme}` : ""}
${targetAudience ? `- Público: ${targetAudience}` : ""}
${roteiroContext?.valorCentral ? `- Valor Central do Vídeo: ${roteiroContext.valorCentral}` : ""}
${brandContext?.voiceTone ? `- Tom da Marca: ${brandContext.voiceTone}` : ""}

${roteiroContext
  ? `IMPORTANTE: Os títulos devem destacar o VALOR CENTRAL que o público vai aprender. Use o contexto do roteiro para criar títulos que reflitam o conteúdo real do vídeo.`
  : `Os títulos devem fazer a pessoa pensar: "Isso é sobre mim" — não "Me enganaram com clickbait".`
}

${brandContext?.forbiddenTerms && brandContext.forbiddenTerms.length > 0
  ? `CRÍTICO: NUNCA usar os termos proibidos: ${brandContext.forbiddenTerms.join(", ")}`
  : ""
}
</instrucoes>

Retorne APENAS o JSON com 5 títulos.`;

  return prompt;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * LLM call with retry logic for title generation
 */
async function llmCallWithRetry(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number,
  attempt: number = 0
): Promise<string> {
  try {
    if (!openrouter) {
      throw new Error("OpenRouter API key not configured");
    }

    const result = await generateText({
      model: openrouter(model),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
    });

    return result.text;
  } catch (error) {
    const isLastAttempt = attempt >= maxRetries;

    if (isLastAttempt) {
      throw error;
    }

    // Exponential backoff
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return llmCallWithRetry(model, systemPrompt, userPrompt, maxRetries, attempt + 1);
  }
}

