/**
 * Library Video Types
 *
 * Tipos para conteúdo de vídeo na biblioteca.
 * Organiza todos os campos gerados pelo wizard: título, thumbnail, SEO, roteiro, etc.
 */

import type { VideoScriptStructured } from "@/lib/wizard-services/types";

// Re-export for convenience
export type { VideoScriptStructured };

// ============================================================================
// VIDEO METADATA TYPES
// ============================================================================

/**
 * Estrutura completa dos metadados de um vídeo gerado pelo wizard
 */
export interface VideoLibraryMetadata {
  // Identificação básica
  wizardId?: number;

  // Título selecionado
  selectedTitle: {
    id: string;
    title: string;
    hook_factor: number;
    word_count?: number;
    formula_used?: string;
    triggers?: string[];
    tribal_angle?: string;
    reason?: string;
  };

  // Thumbnail gerada
  thumbnail: {
    imageUrl?: string;
    promptUsed: string;
    negativePrompt?: string;
    especificacoes?: {
      texto_exato: string;
      palavras?: number;
      cor_texto: string;
      cor_texto_nome?: string;
      estilo_texto?: string;
      posicao_texto: string;
      cor_fundo_dominante: string;
      cor_fundo_nome?: string;
      expressao_facial: string;
      layout_usado?: string;
      psychological_triggers?: string[];
    };
    reasoning?: {
      why_this_expression?: string;
      why_this_layout?: string;
      why_these_colors?: string;
      ctr_prediction?: string;
    };
    variacoes?: Array<{
      variation_name?: string;
      changes?: string;
      full_prompt: string;
    }>;
    // Configurações usadas
    config?: {
      estilo?: string;
      expressao?: string;
      contextoTematico?: string;
      instrucoesCustomizadas?: string;
      tipoFundo?: string;
      corTexto?: string;
      posicaoTexto?: string;
      tipoIluminacao?: string;
    };
  };

  // SEO do YouTube gerado
  youtubeSEO?: {
    titulo: {
      principal: string;
      caracteres: number;
      formula_usada: string;
      keyword_position: string;
      variações: string[];
    };
    descricao: {
      above_the_fold: string;
      corpo_completo: string;
      caracteres_total: number;
      estrutura: {
        hook: string;
        valor: string;
        contexto: string;
        timestamps: string;
        cta_engagement: string;
        cta_subscribe: string;
        links_relacionados: string;
        recursos: string;
        hashtags: string;
        keyword_block: string;
      };
    };
    tags: {
      lista_ordenada: string[];
      caracteres_total: number;
      estrategia: string;
    };
    hashtags: {
      acima_titulo: string[];
      na_descricao: string[];
    };
    seo_analysis: {
      primary_keyword: string;
      keyword_density_titulo: string;
      keyword_density_descricao: string;
      search_intent_match: string;
      estimated_search_volume: string;
      competition_level: string;
      ranking_potential: string;
    };
    engagement_hooks: {
      comment_question: string;
      controversy_angle: string;
      share_trigger: string;
    };
  };

  // Roteiro/Script gerado
  script?: {
    valorCentral?: string;
    hookTexto?: string;
    roteiro?: VideoScriptStructured;
    topicos?: string[];
    duracao?: string;
  };

  // Contexto do wizard
  wizardContext?: {
    duration?: string; // "2-5min" | "5-10min" | "+10min" | "+30min"
    theme?: string;
    niche?: string;
    objective?: string;
    targetAudience?: string;
    tone?: string;
  };

  // Contexto da narrativa
  narrativeContext?: {
    angle?: string; // "HEREGE" | "VISIONÁRIO" | "TRADUTOR" | "TESTEMUNHA" | "PROVOCADOR" | "CURADOR"
    title?: string;
    description?: string;
  };

  // Timestamps de criação
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados do item de biblioteca para vídeo
 */
export interface VideoLibraryItem {
  id: number;
  userId: string;
  type: "video";
  status: "draft" | "scheduled" | "published" | "archived";
  title: string; // Título selecionado
  content: string; // JSON string do VideoScriptStructured
  mediaUrl: string; // JSON array com URLs [thumbnailUrl, ...]
  metadata: string; // JSON string de VideoLibraryMetadata
  scheduledFor?: Date;
  publishedAt?: Date;
  categoryId?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Formulário para criar/editar vídeo na biblioteca
 */
export interface VideoLibraryFormData {
  title: string;
  content?: string; // Roteiro completo
  mediaUrls: string[]; // [thumbnailUrl, ...]
  status?: "draft" | "scheduled" | "published" | "archived";
  scheduledFor?: string; // ISO date string
  categoryId?: number;
  tagIds?: number[];
  metadata?: VideoLibraryMetadata;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Serializa metadados de vídeo para JSON string
 */
export function serializeVideoMetadata(metadata: VideoLibraryMetadata): string {
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    console.error("[serializeVideoMetadata] Error:", error);
    return "{}";
  }
}

/**
 * Deserializa JSON string para metadados de vídeo
 */
export function deserializeVideoMetadata(metadataJson: string): VideoLibraryMetadata | null {
  try {
    const parsed = JSON.parse(metadataJson);
    return parsed as VideoLibraryMetadata;
  } catch (error) {
    console.error("[deserializeVideoMetadata] Error:", error);
    return null;
  }
}

/**
 * Extrai a URL da thumbnail dos metadados
 */
export function extractThumbnailUrl(metadata: VideoLibraryMetadata): string | undefined {
  return metadata.thumbnail?.imageUrl;
}

/**
 * Extrai o título SEO do YouTube dos metadados
 */
export function extractYouTubeTitle(metadata: VideoLibraryMetadata): string | undefined {
  return metadata.youtubeSEO?.titulo?.principal;
}

/**
 * Extrai as tags do YouTube dos metadados
 */
export function extractYouTubeTags(metadata: VideoLibraryMetadata): string[] | undefined {
  return metadata.youtubeSEO?.tags?.lista_ordenada;
}

/**
 * Extrai as hashtags do YouTube dos metadados
 */
export function extractYouTubeHashtags(metadata: VideoLibraryMetadata): string[] {
  const titleTags = metadata.youtubeSEO?.hashtags?.acima_titulo || [];
  const descTags = metadata.youtubeSEO?.hashtags?.na_descricao || [];
  return [...titleTags, ...descTags];
}
