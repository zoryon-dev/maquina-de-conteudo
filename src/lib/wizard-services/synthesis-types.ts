/**
 * Wizard Synthesis Types
 *
 * Types for the Synthesizer step - the critical intermediate processing stage
 * that transforms raw Tavily search results into structured, actionable research.
 *
 * This is the "Condensar Queries" step from the n8n workflow pattern.
 */

// ============================================================================
// SYNTHESIZED RESEARCH
// ============================================================================

/**
 * Result of the Synthesizer LLM step.
 * Transforms raw Tavily results into structured, actionable research fields.
 *
 * v3.1: Updated for Carousel v4.1 compatibility
 * - throughlines_potenciais: potencial_viral + justificativa
 * - tensoes_narrativas: tipo + uso_sugerido
 * - dados_contextualizados: frase_pronta + contraste
 * - NEW: exemplos_narrativos, erros_armadilhas, perguntas_respondidas
 * - NEW: avaliacao_pesquisa
 * - UPDATED: progressao_sugerida structure
 */
export interface SynthesizedResearch {
  /** v3.1: Executive summary - renamed from summary */
  resumo_executivo: string;

  /** v3.0: Legacy summary field (for backward compatibility) */
  summary?: string;

  /** Suggested narrative approach based on research findings */
  narrative_suggestion: string;

  /** v3.1: 3-5 potential throughlines - central phrases that connect all slides */
  throughlines_potenciais: ThroughlinePotencial[];

  /** v3.1: Narrative tensions - contradictions and tensions that create engagement */
  tensoes_narrativas: TensoesNarrativa[];

  /** Concrete data points - numbers, metrics, benchmarks found */
  concrete_data: ConcreteDataPoint[];

  /** v3.1: Contextualized data - ready-to-use phrases with contrast */
  dados_contextualizados: DadoContextualizado[];

  /** v3.1: Narrative examples - complete stories with protagonist, action, outcome */
  exemplos_narrativos: ExemploNarrativo[];

  /** v3.1: Errors and traps - counter-intuitive mistakes that seem right */
  erros_armadilhas: ErroArmadilha[];

  /** v3.0: Legacy real examples field (for backward compatibility) */
  real_examples?: RealExample[];

  /** v3.0: Legacy errors/risks field (for backward compatibility) */
  errors_risks?: ErrorRisk[];

  /** v3.1: Frameworks and methodologies - validated systems, processes */
  frameworks_metodos: FrameworkMetodoV3[];

  /** Opening hooks - potential hooks for slides/captions */
  hooks: Hook[];

  /** v3.1: Suggested 3-act narrative progression (updated structure) */
  progressao_sugerida: ProgressaoSugeridaV3;

  /** v3.1: Questions the content answers (for open loops) */
  perguntas_respondidas: string[];

  /** Gaps and opportunities - what research didn't cover */
  gaps_oportunidades: string[];

  /** v3.1: Research quality assessment */
  avaliacao_pesquisa?: AvaliacaoPesquisa;

  /** Raw sources for reference */
  sources: string[];
}

/**
 * v3.1: A potential throughline - central phrase connecting all slides
 */
export interface ThroughlinePotencial {
  /** The throughline text (10-25 words) */
  throughline: string;

  /** v3.1: Viral potential - why this works */
  potencial_viral: string;

  /** v3.1: Justification - rationale */
  justificativa: string;

  /** Suggested placement in slides */
  slides_sugeridos?: number[];
}

/**
 * v3.1: A narrative tension - contradictions that create engagement
 */
export interface TensoesNarrativa {
  /** The tension/contradiction description */
  tensao: string;

  /** v3.1: Type of tension (paradox, counter-intuitive, urgency, etc.) */
  tipo: string;

  /** v3.1: Suggested usage in content */
  uso_sugerido: string;
}

/**
 * v3.1: A data point with ready-to-use phrase and contrast
 */
export interface DadoContextualizado {
  /** v3.1: Ready-to-use phrase with the data embedded */
  frase_pronta: string;

  /** Source reference */
  fonte: string;

  /** v3.1: Contrast element - what makes this data surprising */
  contraste: string;
}

/**
 * v3.1: A complete narrative example - story with protagonist and outcome
 */
export interface ExemploNarrativo {
  /** Who - the protagonist of the story */
  protagonista: string;

  /** Initial situation */
  situacao_inicial: string;

  /** Action taken */
  acao: string;

  /** Result achieved */
  resultado: string;

  /** Key lesson learned */
  aprendizado: string;
}

/**
 * v3.1: An error or trap - counter-intuitive mistake that seems right
 */
export interface ErroArmadilha {
  /** The error/trap description */
  erro: string;

  /** Why it seems right (the trap) */
  por_que_parece_certo: string;

  /** Real consequence */
  consequencia_real: string;

  /** Better alternative */
  alternativa: string;
}

/**
 * v3.1: A framework or methodology with enhanced fields
 */
export interface FrameworkMetodoV3 {
  /** Name of framework/method */
  nome: string;

  /** v3.1: What problem this solves */
  problema_que_resolve: string;

  /** Step-by-step process */
  passos: string[];

  /** v3.1: Application example */
  exemplo_aplicacao: string;
}

/**
 * v3.1: Suggested 3-act narrative progression (updated structure)
 */
export interface ProgressaoSugeridaV3 {
  /** Act 1: Capture - hook, tension, promise */
  ato1_captura: {
    gancho_principal: string;
    tensao_inicial: string;
    promessa: string;
  };

  /** Act 2: Development - array of narrative beats */
  ato2_desenvolvimento: string[];

  /** Act 3: Resolution - truth reveal and CTA */
  ato3_resolucao: {
    verdade_central: string;
    call_to_action_natural: string;
  };
}

/**
 * v3.0: Legacy Suggested 3-act narrative progression (for backward compatibility)
 * @deprecated Use ProgressaoSugeridaV3 for v4.1 compatibility
 */
export interface ProgressaoSugerida {
  /** Act 1: Opening - hook and pain point setup */
  ato1: {
    hook_sugerido: string;
    dor_impacto: string;
  };

  /** Act 2: Development - main content delivery */
  ato2: {
    estrutura: string[];
    throughline_position: string;
  };

  /** Act 3: Closing - throughline reveal and CTA */
  ato3: {
    throughline_reveal: string;
    cta_frame: string;
  };
}

/**
 * v3.1: Research quality assessment
 */
export interface AvaliacaoPesquisa {
  /** Data quality rating (excellent, good, fair, poor) */
  qualidade_dados: string;

  /** Recommendation for content creation */
  recomendacao: string;
}

/**
 * A concrete data point found in research (numbers, metrics, benchmarks)
 */
export interface ConcreteDataPoint {
  /** The data/number itself */
  dado: string;

  /** Source reference where this data was found */
  fonte: string;

  /** How to use this data in content - context and framing */
  uso_sugerido: string;
}

/**
 * A real example or case study found in research
 */
export interface RealExample {
  /** The example/case description */
  exemplo: string;

  /** Background context of the example */
  contexto: string;

  /** Key takeaway or lesson from this example */
  aprendizado: string;
}

/**
 * An error or risk to avoid based on research findings
 */
export interface ErrorRisk {
  /** The mistake/risk description */
  erro: string;

  /** What happens if this error is ignored */
  consequencia: string;

  /** How to prevent or avoid this error */
  como_evitar: string;
}

/**
 * A framework or methodology found in research
 */
export interface FrameworkMetodo {
  /** Name of framework/method */
  nome: string;

  /** Brief description of what it does */
  descricao: string;

  /** Step-by-step process if available */
  passos: string[];
}

/**
 * A potential opening hook for content
 */
export interface Hook {
  /** The hook text */
  gancho: string;

  /** Hook type (question, bold statement, provocative, etc.) */
  tipo: string;

  /** Why this hook works - its viral potential */
  potencial_viral: string;
}

// ============================================================================
// RESEARCH PLANNER
// ============================================================================

/**
 * Output from the Research Planner step.
 * Structured search queries that optimize Tavily research.
 * Based on n8n Research Planner node with 3-layer query strategy.
 */
export interface ResearchPlannerOutput {
  schema_version: string;
  topic: string;
  niche: string;
  objective: string;
  tone: string;
  style: string;
  time_window_days: number;
  locale: string;
  queries: ResearchQuery[];
  prefer_domains: string[];
  avoid_domains: string[];
  must_include: string[];
  must_avoid: string[];
  research_focus: string;
}

/**
 * A single search query for the research phase
 */
export interface ResearchQuery {
  /** Query text to search */
  q: string;

  /** Language code (pt, en, es, etc.) */
  lang: string;

  /** Type of information sought */
  intent: QueryIntent;

  /** Query layer (foundation, depth, or differentiation) */
  layer: QueryLayer;

  /** Execution priority (1 = highest) */
  priority: number;
}

/**
 * The type of information the query is seeking
 */
export type QueryIntent =
  | "overview"           // General overview of topic
  | "howto"              // How-to guides and tutorials
  | "examples"           // Real-world examples
  | "metrics"            // Numbers, statistics, benchmarks
  | "risks"              // Risks, pitfalls to avoid
  | "tools"              // Tools and resources
  | "compliance"         // Regulations, compliance issues
  | "trends"             // Current trends and developments
  | "contrarian";        // Alternative or counter-intuitive views

/**
 * The layer of the query in the 3-layer research strategy
 */
export type QueryLayer = "foundation" | "depth" | "differentiation";

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Configuration for image generation
 */
export interface ImageGenerationConfig {
  /** Visual mode/template style */
  visualMode: VisualMode;

  /** Custom style description (optional) */
  styleDescription?: string;

  /** Whether to use AI generation or HTML template */
  method: "ai" | "html-template" | "auto";

  /** Primary AI model for image generation */
  aiModel?: string;

  /** Fallback method if primary fails */
  fallbackMethod?: "freepik" | "html-template";
}

/**
 * Available visual modes for image generation
 * Each mode has a distinct visual style for the HTML templates
 */
export type VisualMode =
  | "dark"        // Dark gradient with neon accents
  | "light"       // Clean white background, minimalist
  | "neon"        // Cyberpunk neon aesthetic
  | "brutalist"   // High contrast, bold borders
  | "glass";      // Glassmorphism with blur effect

/**
 * Result from generating a single image
 */
export interface GeneratedImage {
  /** Slide number (1-indexed) */
  slideNumber: number;

  /** URL of the generated image */
  imageUrl: string;

  /** Method used to generate the image */
  method: "gemini" | "freepik" | "html-template";

  /** Visual mode used for this image */
  visualMode: VisualMode;

  /** Whether a fallback method was used */
  fallbackUsed: boolean;

  /** Optional prompt used for AI generation */
  prompt?: string;
}

/**
 * Input for generating a single image
 */
export interface ImageGenerationInput {
  title: string;
  subtitle?: string;
  content?: string;
  slideNumber?: number;
  totalSlides?: number;
}

// ============================================================================
// CONTENT DENSITY REQUIREMENTS
// ============================================================================

/**
 * Content density rules from n8n Carousel Writer v3.0
 * Ensures generated content meets minimum quality standards
 */
export interface ContentDensityRules {
  /** Minimum word counts per slide type */
  minWords: {
    slide2: number;        // Pain/Impact slide
    slideContent: number;  // Content slides (3-7/8)
    slideSummary: number;  // Summary/Checklist slide
    slideProof: number;    // Reflection/Proof slide
    slideCTA: number;      // Final CTA slide
  };

  /** Required structure elements for content slides */
  structureRequired: {
    context: boolean;     // Why it matters now
    insight: boolean;     // The discovery/technique
    example: boolean;     // Real-world case
    data: boolean;        // Numbers from research
    consequence: boolean; // What happens if ignored
  };
}

/**
 * Validation result for content density
 */
export interface ContentDensityValidation {
  /** Whether content meets density requirements */
  compliant: boolean;

  /** Word count per slide */
  wordCounts: Record<string, number>;

  /** Missing structure elements */
  missingElements: string[];

  /** Suggestions for improvement */
  suggestions: string[];
}

// ============================================================================
// SYNTHESIZER SERVICE TYPES
// ============================================================================

/**
 * Input for the synthesizeResearch function
 */
export interface SynthesizerInput {
  /** Main topic/theme */
  topic: string;

  /** Niche or market focus */
  niche: string;

  /** Content objective */
  objective: string;

  /** Raw research results from Tavily */
  researchResults: SearchResult[];

  /** Optional extracted content from URL */
  extractedContent?: string;

  /** Target audience for context */
  targetAudience?: string;

  /** Desired tone/vibe */
  tone?: string;
}

/**
 * Simplified search result for synthesizer input
 */
export interface SearchResult {
  query: string;
  answer: string;
  title: string;
  url: string;
  content: string;
}

// ============================================================================
// TYPE EXPORTS FOR CONVENIENCE
// ============================================================================

// All types are already exported inline above
// Re-exporting SearchResult with an alias for clarity
export type SynthesizerSearchResult = SearchResult;
