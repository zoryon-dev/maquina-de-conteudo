/**
 * Studio Templates Types
 *
 * Tipos TypeScript para os templates do Editor Visual (Studio).
 * Baseado nos templates do Figma: 01_CAPA, 201, 202, 203.
 *
 * Dimensões padrão: 1080x1350 (Instagram 4:5)
 */

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

/**
 * Templates disponíveis no Studio
 *
 * Figma Templates (com perfil/avatar):
 * - 01_CAPA: Template de capa com imagem de fundo + headline gigante
 * - 201: Slide com texto bold no início → texto normal → imagem
 * - 202: Slide padrão (texto → texto → imagem → texto bold)
 * - 203: Slide com swipe indicator
 *
 * Generic Templates (com diferentes layouts):
 * - DARK_MODE: Fundo escuro com gradiente, inclui footer com perfil
 * - WHITE_MODE: Fundo claro minimalista, inclui footer com perfil
 * - TWITTER: Estilo tweet com avatar e verificado
 * - SUPER_HEADLINE: Headline gigante com grid de fundo
 */
export type FigmaTemplate =
  | "01_CAPA"
  | "201"
  | "202"
  | "203"
  | "DARK_MODE"
  | "WHITE_MODE"
  | "TWITTER"
  | "SUPER_HEADLINE";

/**
 * Tipo de conteúdo que pode ser criado no Studio
 */
export type StudioContentType = "carousel" | "single" | "story";

/**
 * Aspect ratio suportados
 */
export type AspectRatio = "4:5" | "1:1" | "9:16";

// ============================================================================
// PROFILE & HEADER CONFIGURATION
// ============================================================================

/**
 * Configurações do perfil (avatar, nome, handle)
 * Exibido em todos os slides
 */
export interface StudioProfile {
  /** URL do avatar (imagem circular) */
  avatarUrl?: string;
  /** Nome de exibição */
  name: string;
  /** Handle do usuário (@usuario) */
  handle: string;
  /** Exibir badge de verificado */
  showVerifiedBadge: boolean;
}

/**
 * Configurações do header (categoria, marca, copyright)
 * Exibido no topo de todos os slides
 */
export interface StudioHeader {
  /** Categoria do conteúdo (ex: "ESTUDO DE CASO") */
  category: string;
  /** Nome da marca/brand (ex: "BRANDS DECODED") */
  brand: string;
  /** Texto de copyright (ex: "©COPYRIGHT 2025") */
  copyright: string;
}

// ============================================================================
// SLIDE CONTENT & STYLE
// ============================================================================

/**
 * Conteúdo editável de um slide
 */
export interface SlideContent {
  /** Texto 1 - geralmente o gancho/hook */
  texto1: string;
  /** Se texto1 deve ser exibido em bold */
  texto1Bold: boolean;
  /** Texto 2 - contexto/corpo */
  texto2: string;
  /** Texto 3 - conclusão (opcional em alguns templates) */
  texto3?: string;
  /** Se texto3 deve ser exibido em bold */
  texto3Bold: boolean;
  /** URL da imagem central (usado em 201, 202, 203) */
  imageUrl?: string;
  /** URL da imagem de fundo (usado apenas em 01_CAPA) */
  backgroundImageUrl?: string;
}

/**
 * Estilo visual de um slide
 */
export interface SlideStyle {
  /** Cor de fundo do slide */
  backgroundColor: string;
  /** Cor do texto */
  textColor: string;
  /** Cor primária/destaque (ex: amarelo do swipe indicator) */
  primaryColor: string;
  /** Exibir o indicador "Arraste pro lado" */
  showSwipeIndicator: boolean;
}

/**
 * Um slide completo no Studio
 */
export interface StudioSlide {
  /** ID único do slide */
  id: string;
  /** Template selecionado para este slide */
  template: FigmaTemplate;
  /** Conteúdo textual e imagens */
  content: SlideContent;
  /** Configurações visuais */
  style: SlideStyle;
}

// ============================================================================
// STUDIO STATE
// ============================================================================

/**
 * Estado completo do editor Studio (usado no Zustand store)
 */
export interface StudioState {
  /** Tipo de conteúdo sendo criado */
  contentType: StudioContentType;
  /** Aspect ratio do conteúdo */
  aspectRatio: AspectRatio;
  /** Lista de slides */
  slides: StudioSlide[];
  /** Índice do slide ativo (sendo editado) */
  activeSlideIndex: number;
  /** Legenda/caption do post */
  caption: string;
  /** Hashtags do post */
  hashtags: string[];
  /** Configurações globais do perfil */
  profile: StudioProfile;
  /** Configurações globais do header */
  header: StudioHeader;
  /** Título do projeto (para salvar) */
  projectTitle: string;
  /** Se há mudanças não salvas */
  isDirty: boolean;
  /** Se está salvando */
  isSaving: boolean;
  /** Se está publicando */
  isPublishing: boolean;
}

// ============================================================================
// TEMPLATE METADATA
// ============================================================================

/**
 * Metadados de um template (para exibição na galeria)
 */
export interface TemplateMetadata {
  /** ID do template */
  id: FigmaTemplate;
  /** Nome para exibição */
  label: string;
  /** Descrição curta */
  description: string;
  /** Uso recomendado (capa, meio, final) */
  recommendedUse: "cover" | "content" | "final" | "any";
  /** Campos obrigatórios */
  requiredFields: (keyof SlideContent)[];
  /** Se suporta imagem de fundo */
  supportsBackgroundImage: boolean;
  /** Se suporta imagem central (slot de imagem) */
  supportsImage: boolean;
  /** Se exibe swipe indicator por padrão */
  defaultShowSwipe: boolean;
}

/**
 * Metadados de todos os templates disponíveis
 */
export const TEMPLATE_METADATA: Record<FigmaTemplate, TemplateMetadata> = {
  // === FIGMA TEMPLATES (com perfil/avatar) ===
  "01_CAPA": {
    id: "01_CAPA",
    label: "Capa",
    description: "Imagem de fundo + headline gigante + swipe indicator",
    recommendedUse: "cover",
    requiredFields: ["texto1"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: true,
  },
  "201": {
    id: "201",
    label: "Slide Bold Início",
    description: "Texto bold → texto normal → imagem",
    recommendedUse: "content",
    requiredFields: ["texto1", "texto2"],
    supportsBackgroundImage: false,
    supportsImage: true,
    defaultShowSwipe: true,
  },
  "202": {
    id: "202",
    label: "Slide Padrão",
    description: "Texto → texto → imagem → texto bold",
    recommendedUse: "content",
    requiredFields: ["texto1", "texto2", "texto3"],
    supportsBackgroundImage: false,
    supportsImage: true,
    defaultShowSwipe: true,
  },
  "203": {
    id: "203",
    label: "Slide com Swipe",
    description: "Texto bold → texto → imagem + swipe destaque",
    recommendedUse: "content",
    requiredFields: ["texto1", "texto2"],
    supportsBackgroundImage: false,
    supportsImage: true,
    defaultShowSwipe: true,
  },
  // === GENERIC TEMPLATES (headline/descrição) ===
  "DARK_MODE": {
    id: "DARK_MODE",
    label: "Dark Mode",
    description: "Fundo escuro com gradiente verde/teal",
    recommendedUse: "any",
    requiredFields: ["texto1", "texto2"],
    supportsBackgroundImage: false,
    supportsImage: false,
    defaultShowSwipe: true,
  },
  "WHITE_MODE": {
    id: "WHITE_MODE",
    label: "White Mode",
    description: "Fundo claro minimalista com estilo clean",
    recommendedUse: "any",
    requiredFields: ["texto1", "texto2"],
    supportsBackgroundImage: false,
    supportsImage: false,
    defaultShowSwipe: true,
  },
  "TWITTER": {
    id: "TWITTER",
    label: "Twitter Style",
    description: "Estilo de tweet com avatar e badge verificado",
    recommendedUse: "any",
    requiredFields: ["texto1"],
    supportsBackgroundImage: false,
    supportsImage: false,
    defaultShowSwipe: true,
  },
  "SUPER_HEADLINE": {
    id: "SUPER_HEADLINE",
    label: "Super Headline",
    description: "Headline gigante com grid de fundo",
    recommendedUse: "cover",
    requiredFields: ["texto1"],
    supportsBackgroundImage: false,
    supportsImage: false,
    defaultShowSwipe: true,
  },
};

// ============================================================================
// DIMENSION CONSTANTS
// ============================================================================

/**
 * Dimensões padrão para cada aspect ratio
 */
export const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

/**
 * Dimensões padrão do Instagram (4:5)
 */
export const INSTAGRAM_DIMENSIONS = DIMENSIONS["4:5"];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Valores padrão para um novo slide
 */
export const DEFAULT_SLIDE_CONTENT: SlideContent = {
  texto1: "",
  texto1Bold: false,
  texto2: "",
  texto3: "",
  texto3Bold: false,
  imageUrl: undefined,
  backgroundImageUrl: undefined,
};

/**
 * Estilo visual padrão (tema claro)
 */
export const DEFAULT_SLIDE_STYLE: SlideStyle = {
  backgroundColor: "#FFFFFF",
  textColor: "#000000",
  primaryColor: "#FFD700", // Amarelo
  showSwipeIndicator: true,
};

/**
 * Perfil padrão
 */
export const DEFAULT_PROFILE: StudioProfile = {
  avatarUrl: undefined,
  name: "Seu Nome",
  handle: "@seu.handle",
  showVerifiedBadge: false,
};

/**
 * Header padrão
 */
export const DEFAULT_HEADER: StudioHeader = {
  category: "ESTUDO DE CASO",
  brand: "MINHA MARCA",
  copyright: `©COPYRIGHT ${new Date().getFullYear()}`,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Cria um novo slide com valores padrão
 */
export function createDefaultSlide(
  template: FigmaTemplate = "202",
  overrides?: Partial<StudioSlide>
): StudioSlide {
  const metadata = TEMPLATE_METADATA[template];

  return {
    id: crypto.randomUUID(),
    template,
    content: {
      ...DEFAULT_SLIDE_CONTENT,
      texto1Bold: template === "201" || template === "203",
      texto3Bold: template === "202",
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      showSwipeIndicator: metadata.defaultShowSwipe,
    },
    ...overrides,
  };
}

/**
 * Cria o estado inicial do Studio
 */
export function createInitialStudioState(): StudioState {
  return {
    contentType: "carousel",
    aspectRatio: "4:5",
    slides: [createDefaultSlide("01_CAPA")],
    activeSlideIndex: 0,
    caption: "",
    hashtags: [],
    profile: { ...DEFAULT_PROFILE },
    header: { ...DEFAULT_HEADER },
    projectTitle: "Novo Projeto",
    isDirty: false,
    isSaving: false,
    isPublishing: false,
  };
}

/**
 * Retorna o template recomendado baseado na posição do slide
 */
export function getRecommendedTemplate(
  slideIndex: number,
  totalSlides: number
): FigmaTemplate {
  if (slideIndex === 0) return "01_CAPA";
  if (slideIndex === totalSlides - 1) return "203"; // Último slide com swipe mais proeminente
  return "202"; // Slides do meio
}

/**
 * Escapa HTML para evitar XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

/**
 * Escapa URL para uso seguro em CSS url()
 * Previne CSS injection
 */
export function escapeCssUrl(url: string): string {
  return url.replace(/['"()\\]/g, (char) => `\\${char}`).replace(/[\n\r]/g, "");
}

/** Maximum slides per project (Instagram carousel limit) */
export const MAX_SLIDES = 10;
