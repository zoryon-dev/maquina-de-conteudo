/**
 * BrandsDecoded v4 → GeneratedContent Adapter
 *
 * Converte o output do motor BD v4 (espinha dorsal + 18 blocos de copy +
 * legenda) para o shape `GeneratedContent` que o restante do pipeline
 * (save, library, render) já consome.
 *
 * Mapping: 18 blocos (2 por slide, positions "a"/"b") → 9 slides
 *   - title   = bloco da posição "a" do slide N
 *   - content = bloco da posição "b" do slide N
 *
 * Pureza: esta função NÃO chama LLMs. Ela apenas transforma um
 * `BrandsDecodedResult` já computado no shape final. A chamada ao motor
 * acontece em `workers/route.ts` via `generateContentBrandsDecoded`.
 *
 * Tolerância: blocos ausentes viram string vazia (sem throw) e blocos
 * fora de ordem são indexados por Map — a função é idempotente e segura.
 */

import type { BrandsDecodedResult } from "@/lib/ai/motors/brandsdecoded-v4";
import type { GeneratedContent, GeneratedSlide, NarrativeAngle, NarrativeOption } from "./types";

export type AdapterOptions = {
  /** ID da narrativa selecionada. Quando undefined → "bd-auto". */
  selectedNarrativeId?: string;
  /** Ângulo tribal selecionado. Quando undefined → "tradutor" (fallback BD). */
  selectedNarrativeAngle?: NarrativeAngle;
  /** Nome do modelo usado na geração (para metadata). */
  model: string;
  /** Se o contexto RAG foi consumido (para metadata). Default: false. */
  ragUsed?: boolean;
};

/**
 * Número total de slides BD v4 (convenção: 9 slides, 18 blocos 2x9).
 * Exportado para que testes e consumidores possam referenciar.
 */
export const BD_TOTAL_SLIDES = 9;

/**
 * Converte um `BrandsDecodedResult` em `GeneratedContent`.
 *
 * Função pura: não faz I/O, não chama APIs externas, não logga
 * (exceto comportamento implícito de `Map` nativo).
 */
export function bdResultToGeneratedContent(
  bd: BrandsDecodedResult,
  opts: AdapterOptions
): GeneratedContent {
  // Indexa blocos por "slide:position" para tolerar ordem arbitrária
  // (o motor sempre retorna ordenado, mas o adapter não depende disso).
  const blockIndex = new Map<string, string>();
  for (const block of bd.blocks) {
    blockIndex.set(`${block.slide}:${block.position}`, block.text);
  }

  const slides: GeneratedSlide[] = [];
  for (let s = 1; s <= BD_TOTAL_SLIDES; s++) {
    slides.push({
      title: blockIndex.get(`${s}:a`) ?? "",
      content: blockIndex.get(`${s}:b`) ?? "",
      numero: s,
    });
  }

  return {
    type: "carousel",
    slides,
    caption: bd.legendaInstagram,
    metadata: {
      narrativeId: opts.selectedNarrativeId ?? "bd-auto",
      narrativeTitle: bd.selectedHeadline.text,
      narrativeAngle: opts.selectedNarrativeAngle ?? "tradutor",
      model: opts.model,
      generatedAt: new Date().toISOString(),
      ragUsed: opts.ragUsed ?? false,
    },
  };
}

/**
 * Atalho: extrai `id` e `angle` de um `NarrativeOption` (ou undefined)
 * para o formato `AdapterOptions`. Conveniência para o worker.
 */
export function buildAdapterOptionsFromNarrative(
  narrative: NarrativeOption | undefined,
  model: string,
  ragUsed?: boolean
): AdapterOptions {
  return {
    selectedNarrativeId: narrative?.id,
    selectedNarrativeAngle: narrative?.angle,
    model,
    ragUsed,
  };
}
