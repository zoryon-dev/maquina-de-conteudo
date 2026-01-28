/**
 * Video Script Generation Service
 *
 * Generates YouTube video scripts using Tribal v4.4 philosophy.
 * Supports initial generation and refactoring based on user feedback.
 *
 * Based on prompts from @temporario/ and the existing getVideoScriptV4Prompt.
 */

import { openrouter } from "@/lib/ai/config";
import { getVideoScriptV4Prompt } from "./prompts";
import type { NarrativeAngle } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface VideoScriptInput {
  narrativeAngle: NarrativeAngle;
  narrativeTitle: string;
  narrativeDescription: string;
  duration: string; // "2-5min" | "5-10min" | "+10min" | "+30min"
  intention?: string;
  theme?: string;
  targetAudience?: string;
  objective?: string;
  cta?: string;
  negativeTerms?: string[];
  ragContext?: string;
  narrativeHook?: string;
  coreBelief?: string;
  statusQuoChallenged?: string;
  selectedTitle?: string; // Selected thumbnail title
}

export interface VideoScriptRefactorInput extends VideoScriptInput {
  currentScript: string; // Current script in JSON format
  refactorInstructions: string; // User's specific feedback on what to improve
}

export interface VideoScriptOutput {
  meta: {
    duracao_estimada: string;
    angulo_tribal: string;
    valor_central: string;
    transformacao_prometida?: string;
  };
  thumbnail: {
    titulo: string;
    expressao: string;
    texto_overlay: string;
    estilo: string;
    cores_sugeridas?: string;
  };
  roteiro: {
    hook: {
      texto: string;
      tipo: string;
      duracao_segundos?: number;
      nota_gravacao: string;
    };
    contexto?: {
      texto: string;
      duracao_segundos?: number;
      nota_gravacao?: string;
    };
    desenvolvimento: Array<{
      numero: number;
      tipo: string;
      topico: string;
      insight: string;
      exemplo?: string;
      transicao: string;
      duracao_segundos?: number;
      nota_gravacao: string;
    }>;
    cta: {
      texto: string;
      proximo_passo: string;
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
  caption: string;
  hashtags: string[];
}

export interface GenerateVideoScriptResult {
  success: boolean;
  data?: VideoScriptOutput;
  error?: string;
}

export interface RefactorVideoScriptResult {
  success: boolean;
  data?: VideoScriptOutput;
  error?: string;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generates a video script using Tribal v4.4 philosophy.
 *
 * @param params - Script generation parameters
 * @returns ServiceResult with video script output
 */
export async function generateVideoScript(
  params: VideoScriptInput
): Promise<GenerateVideoScriptResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    console.log(`[VIDEO-SCRIPT] Starting script generation for: ${params.narrativeTitle}`);

    // Build prompt using existing v4.4 prompt
    const systemPrompt = getVideoScriptV4Prompt({
      narrativeAngle: params.narrativeAngle,
      narrativeTitle: params.narrativeTitle,
      narrativeDescription: params.narrativeDescription,
      duration: params.duration as any,
      intention: params.intention,
      cta: params.cta,
      negativeTerms: params.negativeTerms,
      ragContext: params.ragContext,
      theme: params.theme,
      targetAudience: params.targetAudience,
      objective: params.objective,
      narrativeHook: params.narrativeHook,
      coreBelief: params.coreBelief,
      statusQuoChallenged: params.statusQuoChallenged,
      selectedTitle: params.selectedTitle,
    });

    const userPrompt = buildUserPrompt(params);

    // Use appropriate model based on duration
    const model = getModelForDuration(params.duration);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[VIDEO-SCRIPT] API error:", response.status, errorText);
      return {
        success: false,
        error: `Video script generation failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in video script generation response",
      };
    }

    const parsed: VideoScriptOutput = JSON.parse(content);

    // Validate response structure
    if (!parsed.meta || !parsed.roteiro || !parsed.thumbnail) {
      console.error("[VIDEO-SCRIPT] Invalid response structure:", parsed);
      return {
        success: false,
        error: "Invalid video script response structure",
      };
    }

    console.log(`[VIDEO-SCRIPT] ✅ Script generated successfully`);
    console.log(`[VIDEO-SCRIPT] Estimated duration: ${parsed.meta.duracao_estimada}`);
    console.log(`[VIDEO-SCRIPT] Development sections: ${parsed.roteiro.desenvolvimento.length}`);

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error("[VIDEO-SCRIPT] Error generating script:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Refactors an existing video script based on user feedback.
 *
 * @param params - Refactor parameters including current script and user instructions
 * @returns ServiceResult with refactored video script output
 */
export async function refactorVideoScript(
  params: VideoScriptRefactorInput
): Promise<RefactorVideoScriptResult> {
  try {
    if (!openrouter) {
      return {
        success: false,
        error: "OpenRouter not configured. Please set OPENROUTER_API_KEY.",
      };
    }

    console.log(`[VIDEO-SCRIPT] Starting script refactoring for: ${params.narrativeTitle}`);
    console.log(`[VIDEO-SCRIPT] Refactor instructions: ${params.refactorInstructions}`);

    const systemPrompt = getRefactorSystemPrompt(params);
    const userPrompt = buildRefactorUserPrompt(params);

    // Use same model selection logic
    const model = getModelForDuration(params.duration);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://maquina-deconteudo.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "contentMachine",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8, // Slightly higher temperature for creative variations
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[VIDEO-SCRIPT] Refactor API error:", response.status, errorText);
      return {
        success: false,
        error: `Video script refactoring failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No content in video script refactoring response",
      };
    }

    const parsed: VideoScriptOutput = JSON.parse(content);

    // Validate response structure
    if (!parsed.meta || !parsed.roteiro || !parsed.thumbnail) {
      console.error("[VIDEO-SCRIPT] Invalid refactor response structure:", parsed);
      return {
        success: false,
        error: "Invalid video script refactor response structure",
      };
    }

    console.log(`[VIDEO-SCRIPT] ✅ Script refactored successfully`);
    console.log(`[VIDEO-SCRIPT] New development sections: ${parsed.roteiro.desenvolvimento.length}`);

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    console.error("[VIDEO-SCRIPT] Error refactoring script:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * System prompt for script refactoring.
 */
function getRefactorSystemPrompt(params: VideoScriptRefactorInput): string {
  const forbiddenTerms = params.negativeTerms?.length
    ? params.negativeTerms.join(", ")
    : "N/A";
  const preferredCtas = params.cta || "";
  const availableData = params.ragContext || "Não disponível";
  const availableExamples = "Não disponível";
  const availableFrameworks = "Não disponível";

  return `<prompt id="video-script-refactor-v1.0">
<identidade>
Você é um especialista em refinar roteiros de vídeo TRIBAIS do YouTube, mantendo a filosofia tribal enquanto implementa melhorias específicas solicitadas pelo usuário.

Seu trabalho é um BISTURI, não um machado:
- PRESERVAR o que funciona (não refazer do zero)
- IMPLEMENTAR precisamente o que foi solicitado
- MANTER consistência tribal (ângulo, throughline, tom)
- MELHORAR cirurgicamente o que precisa de ajuste
</identidade>

<contexto_marca>
<tom>Autêntico e direto</tom>
<estilo_comunicacao></estilo_comunicacao>
<termos_proibidos>${forbiddenTerms}</termos_proibidos>
<ctas_preferidos>${preferredCtas}</ctas_preferidos>
</contexto_marca>

<filosofia_tribal_refactor>
PRESERVE SEMPRE:
1. O ÂNGULO TRIBAL — é a identidade do conteúdo
2. A THROUGHLINE — é o fio condutor que conecta tudo
3. A CRENÇA CENTRAL — é o porquê do conteúdo existir
4. O TOM AUTÊNTICO — não torne genérico ao refinar
5. AS NOTAS DE GRAVAÇÃO — são parte essencial do roteiro

MELHORE QUANDO SOLICITADO:
1. Clareza das seções confusas
2. Profundidade dos insights superficiais
3. Concretude dos exemplos genéricos
4. Força dos hooks fracos
5. Fluidez das transições
6. Especificidade do CTA
7. Ritmo e duração

CUIDADO AO REFATORAR:
- Encurtar NÃO significa remover profundidade, significa remover redundância
- Alongar NÃO significa encher linguiça, significa adicionar valor
- Mais exemplos NÃO significa exemplos genéricos, significa histórias específicas
- Mais impacto NÃO significa sensacionalismo, significa verdade mais afiada
</filosofia_tribal_refactor>

<entrada>
<feedback_usuario>${params.refactorInstructions}</feedback_usuario>

<contexto_narrativa>
  <angulo>${params.narrativeAngle}</angulo>
  <titulo>${params.narrativeTitle}</titulo>
  <throughline></throughline>
  <crenca_central>${params.coreBelief || ""}</crenca_central>
  <status_quo>${params.statusQuoChallenged || ""}</status_quo>
</contexto_narrativa>

<parametros>
  <duracao_alvo>${params.duration}</duracao_alvo>
  <tema>${params.theme || ""}</tema>
  <publico>${params.targetAudience || ""}</publico>
</parametros>

<pesquisa_disponivel>
  <dados_extras>${availableData}</dados_extras>
  <exemplos_extras>${availableExamples}</exemplos_extras>
  <frameworks_extras>${availableFrameworks}</frameworks_extras>
</pesquisa_disponivel>

<roteiro_atual>
${params.currentScript}
</roteiro_atual>
</entrada>

<tipos_refatoracao_detalhados>

### ENCURTAR / MAIS ENXUTO
Objetivo: Reduzir duração mantendo impacto
Técnicas:
- Remover redundâncias (mesma ideia dita de formas diferentes)
- Combinar tópicos relacionados
- Cortar tangentes que não servem a throughline
- Simplificar transições longas
- Manter: hook, pontos principais, CTA
- Remover: elaborações excessivas, exemplos redundantes

Exemplo de transformação:
ANTES: "E isso é muito importante porque, veja bem, quando a gente para pra pensar, a verdade é que na maioria das vezes, o que acontece é que..."
DEPOIS: "A verdade é que..."

### ALONGAR / MAIS PROFUNDO
Objetivo: Aumentar duração com valor real
Técnicas:
- Adicionar exemplos específicos (não genéricos)
- Aprofundar "por quê" de cada ponto
- Incluir dados da pesquisa_disponivel
- Adicionar história/case quando apropriado
- Expandir transições com bridges de valor
- NUNCA: repetir a mesma ideia com palavras diferentes

Exemplo de transformação:
ANTES: "Muitas empresas fazem isso errado."
DEPOIS: "Muitas empresas fazem isso errado. Um exemplo: a Startup X tinha 20 projetos simultâneos e completava zero. Quando implementaram a regra dos 3 — máximo 3 projetos por vez — aumentaram conclusão em 400% em 3 meses."

### MAIS EXEMPLOS
Objetivo: Adicionar histórias que ilustram pontos
Técnicas:
- Usar exemplos_extras da pesquisa_disponivel
- Preferir histórias com protagonista identificável
- Estrutura: situação → ação → resultado
- Variar tipos: case de empresa, pessoa real, cenário hipotético específico
- Posicionar após afirmação que precisa de prova

Exemplo de transformação:
ANTES: "Foco é mais importante que quantidade."
DEPOIS: "Foco é mais importante que quantidade. O Warren Buffett tem uma técnica brutal: liste suas 25 prioridades, escolha as top 5, e EVITE ATIVAMENTE as outras 20. Não ignore — evite. Porque elas são as mais perigosas: importantes o suficiente para distrair, mas não o suficiente para importar."

### MAIS HUMOR / TOM LEVE
Objetivo: Adicionar leveza sem perder substância
Técnicas:
- Analogias inesperadas
- Exagero consciente seguido de verdade
- Auto-depreciação leve (especialmente para TESTEMUNHA)
- Referências culturais da tribo
- NUNCA: piadas forçadas, humor que diminui a mensagem

Exemplo de transformação:
ANTES: "Muitas pessoas tentam fazer tudo ao mesmo tempo."
DEPOIS: "Muitas pessoas tentam fazer tudo ao mesmo tempo. É tipo aquele prato chinês girando — parece impressionante por 30 segundos, depois quebra tudo."

### MAIS DADOS / ESTATÍSTICAS
Objetivo: Adicionar credibilidade com números
Técnicas:
- Usar dados_extras da pesquisa_disponivel
- Preferir dados específicos a genéricos
- Contextualizar o dado (o que significa?)
- Contrastar quando possível (X vs Y)
- Citar fonte quando relevante
- NUNCA: inventar dados

Exemplo de transformação:
ANTES: "A maioria das pessoas não completa suas tarefas."
DEPOIS: "47% dos profissionais listam mais de 10 tarefas diárias. Quantas completam? Nenhuma que importa. O dado mais brutal: quanto mais tarefas na lista, menor a taxa de conclusão de cada uma."

### MAIS CLARO / SIMPLES
Objetivo: Simplificar sem perder profundidade
Técnicas:
- Substituir jargão por linguagem comum
- Quebrar frases longas em curtas
- Usar analogias do cotidiano
- Estruturar em passos claros
- Remover qualificadores desnecessários ("basicamente", "na verdade", "tipo")

Exemplo de transformação:
ANTES: "A implementação de frameworks de produtividade baseados em priorização contextual resulta em otimização de output cognitivo."
DEPOIS: "Escolher 3 coisas importantes por dia funciona melhor que listar 20."

### MAIS IMPACTO / HOOKS FORTES
Objetivo: Aumentar força de abertura e transições
Técnicas:
- Hooks que desafiam crença (HEREGE)
- Hooks que mostram possibilidade (VISIONÁRIO)
- Hooks que prometem clareza (TRADUTOR)
- Hooks que compartilham vulnerabilidade (TESTEMUNHA)
- Remover aquecimento antes do hook
- Começar com a afirmação mais forte

Exemplo de transformação:
ANTES: "Hoje vamos falar sobre produtividade e como você pode melhorar..."
DEPOIS: "Você não tem problema de produtividade. Você tem problema de prioridade."

### CTA MAIS ESPECÍFICO
Objetivo: Tornar call-to-action acionável
Técnicas:
- Uma ação clara (não lista de opções)
- Conectar à transformação prometida
- Tom de convite, não comando
- Específico e imediato
- Alinhado com o ângulo tribal

Exemplo de transformação:
ANTES: "Se gostou, deixa o like, se inscreve, ativa o sininho..."
DEPOIS: "Escolha 3 projetos hoje. Só 3. Trabalhe só neles até completar um. Esse é o exercício. Depois me conta nos comentários qual foi o primeiro que você completou."

</tipos_refatoracao_detalhados>

<regras_refatoracao>
1. NUNCA mude o ângulo tribal — é a identidade do conteúdo
2. PRESERVE a throughline — cada mudança deve servir ao fio condutor
3. MANTENHA a duração consistente com ${params.duration} (±10%)
4. SE encurtar, priorize: hook + throughline + CTA
5. SE alongar, use dados de pesquisa_disponivel (não invente)
6. SE adicionar exemplos, use exemplos_extras ou crie específicos (não genéricos)
7. PRESERVE as notas de gravação ou atualize-as para refletir mudanças
8. MANTENHA o formato JSON idêntico ao original
9. VERIFIQUE que o feedback foi realmente implementado
10. NÃO use termos proibidos: ${forbiddenTerms}
</regras_refatoracao>

<validacao_refatoracao>
Antes de retornar o roteiro refatorado, VERIFIQUE:

1. O feedback "${params.refactorInstructions}" foi implementado? [ ]
2. O ângulo ${params.narrativeAngle} foi preservado? [ ]
3. A throughline ainda conecta todos os elementos? [ ]
4. A duração está dentro de ${params.duration} (±10%)? [ ]
5. As notas de gravação foram atualizadas? [ ]
6. Nenhum termo proibido foi usado? [ ]
7. O tom da marca foi mantido? [ ]

Se algum item não puder ser atendido, explique no campo "refactor_notes".
</validacao_refatoracao>

<anti_patterns_refatoracao>
NUNCA faça refatorações que:
- Mudem o ângulo tribal sem solicitação explícita
- Tornem o conteúdo mais genérico para "atingir mais pessoas"
- Adicionem promessas que o conteúdo não entrega
- Removam a vulnerabilidade/autenticidade em nome de "profissionalismo"
- Substituam exemplos específicos por afirmações genéricas
- Quebrem a throughline para encaixar algo "viral"
- Usem linguagem de guru/coach genérico
- Adicionem dados inventados
- Ignorem as notas de gravação
- Mudem o CTA para algo transacional (venda direta)
</anti_patterns_refatoracao>

<regras_output>
1. Retorne APENAS JSON válido, sem markdown, sem comentários
2. O formato JSON deve ser IDÊNTICO ao roteiro original
3. Adicione campo "refactor_notes" explicando o que foi mudado
4. Adicione campo "refactor_validation" confirmando checklist
5. VERIFIQUE que feedback foi implementado antes de retornar
6. Se feedback for impossível de implementar, explique em refactor_notes
</regras_output>

<formato_saida>
Retorne o JSON no mesmo formato do roteiro original, com adições:

{
  // ... todos os campos originais do roteiro ...
  
  "refactor_metadata": {
    "feedback_original": "${params.refactorInstructions}",
    "feedback_implementado": true,
    "refactor_notes": "Explicação do que foi mudado e por quê",
    "refactor_validation": {
      "angulo_preservado": true,
      "throughline_intacta": true,
      "duracao_consistente": true,
      "notas_atualizadas": true,
      "termos_proibidos_evitados": true
    },
    "mudancas_principais": [
      "Descrição da mudança 1",
      "Descrição da mudança 2"
    ]
  }
}
</formato_saida>

<exemplo_refatoracao>
FEEDBACK: "Tornar o hook mais impactante e adicionar um exemplo no desenvolvimento"

ANTES (hook):
{
  "tipo": "afirmacao",
  "texto": "Hoje vamos falar sobre produtividade e como você pode ser mais eficiente no seu dia a dia.",
  "notas_gravacao": "Tom amigável, olhando para câmera"
}

DEPOIS (hook):
{
  "tipo": "paradoxo",
  "texto": "Você não tem problema de produtividade. Você tem problema de prioridade. E a diferença é brutal.",
  "notas_gravacao": "Tom: Direto, confrontador mas não agressivo. Pausa depois de 'prioridade'. Ênfase em 'brutal'."
}

ANTES (desenvolvimento item 3):
{
  "topico": "A importância do foco",
  "conteudo": "Foco é mais importante que quantidade de tarefas.",
  "duracao_segundos": 30
}

DEPOIS (desenvolvimento item 3):
{
  "topico": "A importância do foco",
  "conteudo": "Foco é mais importante que quantidade. A Startup X tinha 20 projetos simultâneos e completava zero. Quando implementaram a regra dos 3 — máximo 3 projetos por vez — aumentaram conclusão em 400% em 3 meses. Não foi mágica. Foi matemática: atenção dividida por 20 vs concentrada em 3.",
  "duracao_segundos": 45,
  "notas_gravacao": "Contar história da Startup X com interesse genuíno. Pausa antes de '400%' para impacto. Tom de revelação em 'Não foi mágica'."
}

refactor_metadata:
{
  "feedback_original": "Tornar o hook mais impactante e adicionar um exemplo no desenvolvimento",
  "feedback_implementado": true,
  "refactor_notes": "1) Hook transformado de introdução genérica para paradoxo que desafia crença comum, alinhado com ângulo HEREGE. 2) Adicionado exemplo específico da Startup X com números concretos no tópico de foco. Duração do item aumentou de 30s para 45s, compensado encurtando transições.",
  "refactor_validation": {
    "angulo_preservado": true,
    "throughline_intacta": true,
    "duracao_consistente": true,
    "notas_atualizadas": true,
    "termos_proibidos_evitados": true
  },
  "mudancas_principais": [
    "Hook: de introdução genérica para paradoxo impactante",
    "Desenvolvimento item 3: adicionado exemplo Startup X com dados concretos",
    "Notas de gravação atualizadas para refletir novo tom"
  ]
}
</exemplo_refatoracao>
</prompt>`;
}

/**
 * Builds user prompt for initial script generation.
 */
function buildUserPrompt(params: VideoScriptInput): string {
  const parts: string[] = [];

  parts.push(`## INPUT VARIABLES`);
  parts.push(``);
  parts.push(`**Narrative Angle:** ${params.narrativeAngle}`);
  parts.push(`**Narrative Title:** ${params.narrativeTitle}`);
  parts.push(`**Narrative Description:** ${params.narrativeDescription}`);
  parts.push(`**Duration:** ${params.duration}`);

  if (params.theme) parts.push(`**Theme:** ${params.theme}`);
  if (params.targetAudience) parts.push(`**Target Audience:** ${params.targetAudience}`);
  if (params.objective) parts.push(`**Objective:** ${params.objective}`);
  if (params.intention) parts.push(`**Intention:** ${params.intention}`);
  if (params.cta) parts.push(`**CTA:** ${params.cta}`);
  if (params.selectedTitle) parts.push(`**Selected Title:** ${params.selectedTitle}`);

  if (params.negativeTerms && params.negativeTerms.length > 0) {
    parts.push(`**Negative Terms:** ${params.negativeTerms.join(", ")}`);
  }

  parts.push(``);
  parts.push(`## REQUIREMENTS`);
  parts.push(``);
  parts.push(`1. Generate complete video script following Tribal v4.4 philosophy`);
  parts.push(`2. Adapt content depth for selected duration: ${params.duration}`);
  parts.push(`3. Include all required sections (hook, development, CTA)`);
  parts.push(`4. Each development section must have a defined type`);
  parts.push(`5. Include thumbnail suggestions with curiosity-creating title`);
  parts.push(`6. Generate caption with minimum 200 words including "Na prática" section`);
  parts.push(`7. Return valid JSON only`);

  return parts.join("\n");
}

/**
 * Builds user prompt for script refactoring.
 */
function buildRefactorUserPrompt(params: VideoScriptRefactorInput): string {
  const parts: string[] = [];

  parts.push(`## REFACTOR REQUEST`);
  parts.push(``);
  parts.push(`**User Feedback:** ${params.refactorInstructions}`);
  parts.push(``);
  parts.push(`**Current Script Context:`);
  parts.push(`- Angle: ${params.narrativeAngle}`);
  parts.push(`- Title: ${params.narrativeTitle}`);
  parts.push(`- Duration: ${params.duration}`);
  parts.push(`- Theme: ${params.theme || "(not specified)"}`);
  parts.push(`- Target Audience: ${params.targetAudience || "(not specified)"}`);

  parts.push(``);
  parts.push(`**CURRENT SCRIPT (JSON):**`);
  parts.push("```");
  parts.push(params.currentScript);
  parts.push("```");

  parts.push(``);
  parts.push(`## REFACTORING INSTRUCTIONS`);
  parts.push(``);
  parts.push(`Based on the user feedback above, refactor the script to: `);
  parts.push(``);
  parts.push(`1. Address the specific improvement requested`);
  parts.push(`2. Maintain the tribal angle and core message`);
  parts.push(`3. Keep the estimated duration consistent with ${params.duration}`);
  parts.push(`4. Preserve what already works well`);
  parts.push(`5. Return complete valid JSON in the same format`);
  parts.push(``);
  parts.push(`Focus on the user's specific request while maintaining the quality of the original script.`);

  return parts.join("\n");
}

/**
 * Selects appropriate model based on video duration.
 */
function getModelForDuration(duration: string): string {
  // Longer videos might benefit from more capable models
  if (duration === "+30min" || duration === "+10min") {
    return "anthropic/claude-haiku-4.5";
  }
  // Shorter videos can use faster models
  return "google/gemini-3-flash-preview";
}
