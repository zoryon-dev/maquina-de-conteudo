/**
 * Article Wizard Types
 *
 * Shared types for the Article Wizard pipeline and services.
 * Follows the same ServiceResult<T> pattern from wizard-services.
 */

// Re-export ServiceResult for convenience
export type { ServiceResult } from "@/lib/wizard-services/types";

// ============================================================================
// ARTICLE WIZARD FORM & INPUT TYPES
// ============================================================================

export type ArticleMode = "create" | "extend";

export type ArticleType =
  | "how-to"
  | "listicle"
  | "guia"
  | "tutorial"
  | "comparativo"
  | "opiniao"
  | "estudo-de-caso"
  | "pilar";

export interface ArticleWizardFormData {
  mode: ArticleMode;
  title?: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  articleType: ArticleType;
  targetWordCount: number;
  referenceUrl?: string;
  referenceMotherUrl?: string;
  model?: string;
  customInstructions?: string;
  authorName?: string;
  projectId?: number;
  ragConfig?: RagConfig;
}

export interface RagConfig {
  mode?: "auto" | "manual" | "off";
  threshold?: number;
  maxChunks?: number;
  documents?: number[];
  collections?: number[];
}

// ============================================================================
// OUTLINE TYPES
// ============================================================================

export interface OutlineSection {
  heading: string;
  subheadings: string[];
  estimatedWords: number;
  keyPoints: string[];
}

export interface ArticleOutline {
  id: string;
  title: string;
  description: string;
  sections: OutlineSection[];
  estimatedTotalWords: number;
  differentiator: string;
}

// ============================================================================
// PRODUCTION TYPES
// ============================================================================

export type SectionStatus = "pending" | "generating" | "completed" | "failed";

export interface ProducedSection {
  sectionId: string;
  heading: string;
  content: string;
  wordCount: number;
  status: SectionStatus;
}

// ============================================================================
// SEO TYPES
// ============================================================================

export interface SeoCheckItem {
  criterion: string;
  status: "pass" | "warn" | "fail";
  message: string;
  priority: "high" | "medium" | "low";
}

export interface SeoReport {
  overallScore: number;
  checks: SeoCheckItem[];
  suggestions: string[];
  keywordDensity: {
    primary: number;
    secondary: Record<string, number>;
  };
}

// ============================================================================
// GEO TYPES (Generative Engine Optimization)
// ============================================================================

export interface GeoSubScore {
  score: number;
  findings: string[];
  recommendations: string[];
}

export interface GeoReport {
  overallScore: number;
  directAnswers: GeoSubScore;
  citableData: GeoSubScore;
  extractableStructure: GeoSubScore;
  authorityEeat: GeoSubScore;
  topicCoverage: GeoSubScore;
  schemaMetadata: GeoSubScore;
  priorityFixes: Array<{
    area: string;
    fix: string;
    impact: "high" | "medium" | "low";
  }>;
}

// ============================================================================
// METADATA TYPES
// ============================================================================

export interface SeoMetadataPackage {
  metaTitles: Array<{
    text: string;
    charCount: number;
    includesKeyword: boolean;
  }>;
  metaDescriptions: Array<{
    text: string;
    charCount: number;
    includesKeyword: boolean;
    includesCta: boolean;
  }>;
  slug: string;
  altTexts: Array<{
    imageDescription: string;
    altText: string;
  }>;
  schemaArticle: Record<string, unknown>;
  schemaFaq?: Record<string, unknown>;
  schemaHowto?: Record<string, unknown>;
  schemaBreadcrumb?: Record<string, unknown>;
  reverseAnchors: Array<{
    sourceUrl: string;
    anchorText: string;
    context: string;
  }>;
}

// ============================================================================
// INTERLINKING TYPES
// ============================================================================

export interface InterlinkingSuggestion {
  targetUrl: string;
  anchorText: string;
  relevanceScore: number;
  insertionPoint: string;
  rationale: string;
}

export interface ReverseLinkSuggestion {
  sourceUrl: string;
  anchorText: string;
  insertionContext: string;
}

// ============================================================================
// SITE INTELLIGENCE TYPES
// ============================================================================

export interface SiteUrlMapEntry {
  url: string;
  title: string;
  h1?: string;
  metaDescription?: string;
  wordCount?: number;
  publishedDate?: string;
  lastModified?: string;
  mainKeyword?: string;
  category?: string;
}

export interface BrandVoiceProfile {
  tone: string;
  formalityLevel?: string;
  personality?: string;
  person?: string;
  vocabularyPatterns?: string[];
  avoidedTerms?: string[];
  writingGuidelines?: string[];
  samplePhrases?: Record<string, string[]>;
  // Legacy fields
  vocabulary?: string[];
  sentencePatterns?: string[];
  formatting?: {
    headingStyle: string;
    paragraphLength: string;
    listUsage: string;
  };
  avoidPatterns?: string[];
}

export interface KeywordGap {
  keyword: string;
  searchVolumeEstimate?: "alto" | "médio" | "baixo";
  competitionLevel?: "alto" | "médio" | "baixo";
  suggestedArticleType?: string;
  suggestedAngle?: string;
  priorityScore?: number;
  isCritical?: boolean;
  // Legacy fields
  searchVolume?: number;
  difficulty?: number;
  currentPosition?: number;
  opportunity?: "high" | "medium" | "low";
}

// ============================================================================
// EXTENSION MODE TYPES
// ============================================================================

export interface ArticleDiagnosis {
  currentWordCount: number;
  targetWordCount: number;
  seoScore: number;
  geoScore: number;
  contentGaps: Array<{
    area: string;
    description: string;
    impact: "high" | "medium" | "low";
  }>;
  structuralIssues: Array<{
    issue: string;
    location: string;
    fix: string;
  }>;
  missingElements: string[];
  suggestedFixes: Array<{
    id: string;
    type: "expand_section" | "add_section" | "improve_seo" | "add_data" | "restructure";
    title: string;
    description: string;
    estimatedWords: number;
    priority: "high" | "medium" | "low";
  }>;
}

export interface ExpansionPlan {
  selectedFixIds: string[];
  estimatedNewWords: number;
  approach: string;
}

// ============================================================================
// CROSS-FORMAT DERIVATION TYPES
// ============================================================================

export type DerivationFormat = "linkedin" | "video_script" | "carousel";

export interface LinkedInDerivation {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  fullPost: string;
}

export interface VideoScriptDerivation {
  title: string;
  hook: string;
  sections: Array<{
    topic: string;
    content: string;
    duration: string;
    visualNotes: string;
  }>;
  cta: string;
  estimatedDuration: string;
}

export interface CarouselDerivation {
  slides: Array<{
    number: number;
    title: string;
    content: string;
    imagePrompt?: string;
  }>;
  caption: string;
  hashtags: string[];
}

export type CrossFormatOutput =
  | { format: "linkedin"; content: LinkedInDerivation }
  | { format: "video_script"; content: VideoScriptDerivation }
  | { format: "carousel"; content: CarouselDerivation };

// ============================================================================
// PIPELINE PROGRESS TYPES
// ============================================================================

export type ArticlePipelineStage =
  | "extraction"
  | "research"
  | "synthesis"
  | "outline"
  | "section_production"
  | "assembly"
  | "interlinking"
  | "seo_check"
  | "geo_check"
  | "optimization"
  | "title_generation"
  | "metadata";

export interface ArticleProcessingProgress {
  stage: ArticlePipelineStage;
  percent: number;
  message: string;
  currentSection?: number;
  totalSections?: number;
}

// ============================================================================
// PIPELINE CONTEXT (passed between pipeline steps)
// ============================================================================

export interface ArticlePipelineContext {
  articleId: number;
  userId: string;
  projectId?: number;
  inputs: ArticleWizardFormData;
  siteIntelligence?: {
    urlMap: SiteUrlMapEntry[];
    brandVoice: BrandVoiceProfile;
    keywordGaps: KeywordGap[];
  };
  extractedBaseContent?: string;
  extractedMotherContent?: string;
  researchResults?: string;
  synthesizedResearch?: string;
  ragContext?: string;
  ragSources?: Array<{ id: number; title: string }>;
  selectedOutline?: ArticleOutline;
  producedSections?: ProducedSection[];
  assembledContent?: string;
  seoReport?: SeoReport;
  geoReport?: GeoReport;
  optimizedContent?: string;
  model: string;
}
