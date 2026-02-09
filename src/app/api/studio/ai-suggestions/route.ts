/**
 * POST /api/studio/ai-suggestions
 *
 * Gera sugestões de texto para slides do Studio usando IA.
 *
 * Tipos de sugestão:
 * - headline: Título/gancho para capa
 * - hook: Texto de abertura para captar atenção
 * - context: Texto de contexto/desenvolvimento
 * - conclusion: Conclusão/call-to-action
 * - hashtags: Hashtags relevantes
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config";
import { toAppError, getErrorMessage, ValidationError, ConfigError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/security/rate-limit";

// ============================================================================
// TYPES
// ============================================================================

type SuggestionType = "headline" | "hook" | "context" | "conclusion" | "hashtags";

const VALID_SUGGESTION_TYPES: SuggestionType[] = ["headline", "hook", "context", "conclusion", "hashtags"];
const MAX_SUGGESTIONS = 5;
const MIN_SUGGESTIONS = 1;

interface SuggestionRequest {
  type: SuggestionType;
  context?: {
    topic?: string;
    niche?: string;
    tone?: string;
    existingTexts?: {
      texto1?: string;
      texto2?: string;
      texto3?: string;
    };
  };
  count?: number; // Número de sugestões (default: 3)
}

// ============================================================================
// PROMPTS
// ============================================================================

const SYSTEM_PROMPT = `Você é um especialista em copywriting para redes sociais, especialmente Instagram.
Seu objetivo é criar textos que:
- Capturam atenção nos primeiros segundos
- Usam linguagem direta e impactante
- São otimizados para carrosséis educacionais
- Mantêm o leitor engajado até o final

Responda APENAS com as sugestões, uma por linha, sem numeração ou marcadores.`;

function getPromptForType(
  type: SuggestionType,
  context: SuggestionRequest["context"],
  count: number
): string {
  const topic = context?.topic || "conteúdo educacional";
  const niche = context?.niche || "negócios e produtividade";
  const tone = context?.tone || "profissional mas acessível";
  const existing = context?.existingTexts;

  switch (type) {
    case "headline":
      return `Crie ${count} headlines impactantes para a CAPA de um carrossel sobre "${topic}" no nicho de ${niche}.

Características:
- 5-10 palavras máximo
- Use pergunta ou afirmação provocativa
- Desperte curiosidade
- Tom: ${tone}

${existing?.texto1 ? `Contexto existente: "${existing.texto1}"` : ""}

Forneça ${count} opções diferentes, uma por linha.`;

    case "hook":
      return `Crie ${count} ganchos de abertura para o primeiro slide de um carrossel sobre "${topic}".

Características:
- Máximo 2 linhas
- Capture atenção imediatamente
- Use padrões como "Você sabia...", "A maioria das pessoas...", "O problema é que..."
- Tom: ${tone}

${existing?.texto1 ? `Headline atual: "${existing.texto1}"` : ""}

Forneça ${count} opções diferentes, uma por linha.`;

    case "context":
      return `Crie ${count} textos de contexto/desenvolvimento para um slide de carrossel sobre "${topic}".

Características:
- 2-3 frases
- Explique ou desenvolva a ideia
- Mantenha engajamento
- Tom: ${tone}

${existing?.texto1 ? `Texto anterior: "${existing.texto1}"` : ""}
${existing?.texto2 ? `Já existe: "${existing.texto2}"` : ""}

Forneça ${count} opções diferentes, uma por linha.`;

    case "conclusion":
      return `Crie ${count} conclusões/call-to-action para o slide final de um carrossel sobre "${topic}".

Características:
- Máximo 2 linhas
- Finalize com impacto
- Pode incluir CTA leve
- Tom: ${tone}

${existing?.texto1 ? `Contexto do carrossel: "${existing.texto1}"` : ""}
${existing?.texto2 ? `Desenvolvimento: "${existing.texto2}"` : ""}

Forneça ${count} opções diferentes, uma por linha.`;

    case "hashtags":
      return `Crie ${count} conjuntos de hashtags relevantes para um post sobre "${topic}" no nicho de ${niche}.

Características:
- 5-7 hashtags por conjunto
- Mix de hashtags populares e nichadas
- Relevantes para Instagram
- Separadas por espaço

Forneça ${count} conjuntos diferentes, um por linha.`;

    default:
      return `Crie ${count} sugestões de texto para "${topic}".`;
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Não autenticado", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  const rateLimited = await checkRateLimit(userId, "ai");
  if (rateLimited) return rateLimited;

  try {
    if (!openrouter) {
      throw new ConfigError("IA não configurada. Configure OPENROUTER_API_KEY.");
    }

    const body: SuggestionRequest = await request.json();
    const { type, context, count: rawCount = 3 } = body;

    // Validar tipo de sugestão
    if (!type || !VALID_SUGGESTION_TYPES.includes(type as SuggestionType)) {
      throw new ValidationError(
        `Tipo de sugestão inválido. Use: ${VALID_SUGGESTION_TYPES.join(", ")}`
      );
    }

    // Validar e clampar count
    const count = Math.min(MAX_SUGGESTIONS, Math.max(MIN_SUGGESTIONS, Number(rawCount) || 3));

    // Gerar prompt
    const prompt = getPromptForType(type, context, count);

    // Chamar LLM
    const result = await generateText({
      model: openrouter(DEFAULT_TEXT_MODEL),
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.8, // Mais criatividade
    });

    // Processar resposta em array de sugestões
    const suggestions = result.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, count);

    return NextResponse.json({
      success: true,
      suggestions,
      type,
      model: DEFAULT_TEXT_MODEL,
    });

  } catch (error) {
    const appError = toAppError(error, "AI_SUGGESTIONS_FAILED");
    console.error("[AiSuggestions]", appError.code, ":", appError.message);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(appError),
        code: appError.code,
      },
      { status: appError.statusCode }
    );
  }
}

// ============================================================================
// GET - Available suggestion types
// ============================================================================

export async function GET() {
  return NextResponse.json({
    types: [
      { id: "headline", label: "Headline", description: "Título para capa" },
      { id: "hook", label: "Gancho", description: "Texto de abertura" },
      { id: "context", label: "Contexto", description: "Desenvolvimento" },
      { id: "conclusion", label: "Conclusão", description: "Finalização/CTA" },
      { id: "hashtags", label: "Hashtags", description: "Tags relevantes" },
    ],
    defaultCount: 3,
    maxCount: 5,
  });
}
