import { consolidateSeeds, type StoredSeed } from "@/lib/wizard-services/content-extractor.service"

export type BdBriefingInput = {
  seeds: unknown
  theme?: string | null
}

export type BdBriefingResult = {
  briefing: string | undefined
  source: "seeds" | "theme" | "empty"
  seedsCount: number
}

// Pure — resolve briefing para motor BD com precedência seeds > theme.
// Extraído de workers/route.ts pra teste unitário sem mock de DB/motor.
export function resolveBdBriefing(input: BdBriefingInput): BdBriefingResult {
  const seeds = Array.isArray(input.seeds) ? (input.seeds as StoredSeed[]) : []
  if (seeds.length > 0) {
    return {
      briefing: consolidateSeeds(seeds),
      source: "seeds",
      seedsCount: seeds.length,
    }
  }
  const theme = input.theme?.trim() || undefined
  return {
    briefing: theme,
    source: theme ? "theme" : "empty",
    seedsCount: 0,
  }
}
