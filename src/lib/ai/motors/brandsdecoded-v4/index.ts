export {
  runTriagem,
  buildEspinhaDorsal,
  type TriagemResult,
  type TriagemInput,
  type EspinhaDorsal,
  type EspinhaInput,
} from "./espinha"

export {
  generateHeadlinesForBD,
  type GeneratedHeadline,
  type HeadlineGenerationInput,
  type HeadlineGenerationResult,
} from "./headline-patterns"

export {
  generateCopyBlocks,
  BLOCK_SPEC,
  type CopyBlock,
  type CopyBlocksInput,
  type CopyBlocksResult,
} from "./copy-blocks"

export {
  REFERENCIAS_EXEMPLARES,
  buildReferenciasPromptBlock,
  type CarrosselReferencia,
} from "./referencias"

export {
  generateWithBrandsDecoded,
  generateLegendaInstagram,
  type BrandsDecodedInput,
  type BrandsDecodedResult,
} from "./orchestrator"
