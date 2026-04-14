/**
 * Content Extractor Service
 *
 * Unifica extração de briefing a partir de múltiplos tipos de "seed":
 *  - `link`    → Firecrawl (markdown + metadata)
 *  - `youtube` → Apify (transcrição + metadata do vídeo)
 *  - `keyword` / `theme` / `insight` → pass-through (texto livre do usuário)
 *
 * Todas as extrações são ação explícita do usuário (não auto-call). Falha
 * em serviço externo retorna `{ success: false, error }` — UI apresenta
 * erro, usuário pode tentar de novo ou digitar briefing manualmente.
 *
 * Exporta também `consolidateSeeds` que junta N seeds em briefing único
 * com separadores explícitos, consumido pelo worker BD antes do dispatch.
 */

import { extractFromUrl } from "./firecrawl.service";
import { transcribeYouTube, formatYouTubeForPrompt } from "./apify.service";
import type { ServiceResult } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export type SeedType = "link" | "youtube" | "keyword" | "theme" | "insight";

export type SeedInput =
  | { type: "link"; url: string }
  | { type: "youtube"; url: string }
  | { type: "keyword"; value: string }
  | { type: "theme"; value: string }
  | { type: "insight"; value: string };

export type ExtractedBriefing = {
  seed: SeedInput;
  briefing: string;
  metadata: {
    title?: string;
    author?: string;
    publishDate?: string;
    source: "firecrawl" | "apify" | "direct";
    rawContent?: string;
  };
};

/**
 * Shape do registro persistido em `content_wizards.seeds` (JSONB).
 * `value` guarda a URL (para link/youtube) ou o texto (para keyword/theme/
 * insight), unificando o acesso ao briefing independente do tipo.
 */
export type StoredSeed = {
  type: SeedType;
  value: string;
  briefing?: string;
  metadata?: Record<string, unknown>;
  extractedAt?: string;
};

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extrai briefing de uma seed. Responsabilidades por tipo:
 *  - link → firecrawl.service (markdown)
 *  - youtube → apify.service (transcrição formatada)
 *  - keyword/theme/insight → retorna `input.value` como briefing
 *
 * Retorno usa `ServiceResult<T>` — consumidor checa `.success` antes de ler
 * `.data`.
 */
export async function extractSeedAsBriefing(
  input: SeedInput
): Promise<ServiceResult<ExtractedBriefing>> {
  try {
    if (input.type === "link") {
      const r = await extractFromUrl(input.url);
      if (!r.success) {
        return { success: false, error: r.error ?? "Firecrawl falhou" };
      }
      if (!r.data) {
        // Firecrawl não configurado OU falhou silenciosamente.
        return {
          success: false,
          error: "Firecrawl indisponível ou não retornou conteúdo",
        };
      }
      return {
        success: true,
        data: {
          seed: input,
          briefing: r.data.content ?? "",
          metadata: {
            title: r.data.metadata?.title,
            author: r.data.metadata?.author,
            publishDate: r.data.metadata?.publishDate,
            source: "firecrawl",
            rawContent: r.data.content,
          },
        },
      };
    }

    if (input.type === "youtube") {
      const r = await transcribeYouTube(input.url);
      if (!r.success) {
        return { success: false, error: r.error ?? "Apify falhou" };
      }
      if (!r.data) {
        return {
          success: false,
          error: "Apify indisponível ou não retornou transcrição",
        };
      }
      return {
        success: true,
        data: {
          seed: input,
          briefing: formatYouTubeForPrompt(r.data),
          metadata: {
            title: r.data.metadata?.title,
            author: r.data.metadata?.channelName,
            publishDate: r.data.metadata?.publishedAt,
            source: "apify",
            rawContent: r.data.transcription,
          },
        },
      };
    }

    // keyword | theme | insight → pass-through
    return {
      success: true,
      data: {
        seed: input,
        briefing: input.value,
        metadata: { source: "direct" },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================================
// CONSOLIDATION
// ============================================================================

/**
 * Consolida múltiplas seeds em briefing único pra LLM.
 *
 * Separadores explícitos (`### FONTE N (type)` + `---`) deixam o modelo
 * distinguir origens e citá-las se necessário. Quando `briefing` ausente,
 * usa `value` como fallback (útil pra seeds keyword/theme curtas).
 */
export function consolidateSeeds(
  seeds: Array<{ type: SeedType; value: string; briefing?: string }>
): string {
  return seeds
    .map((s, i) => {
      const header = `### FONTE ${i + 1} (${s.type})`;
      const body = s.briefing || s.value;
      return `${header}\n\n${body}`;
    })
    .join("\n\n---\n\n");
}
