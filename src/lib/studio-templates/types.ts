/**
 * Studio Templates Types
 *
 * Tipos TypeScript para os templates do Editor Visual (Studio).
 * Baseado nos templates do Figma: 01_CAPA, 201, 202, 203.
 *
 * Dimensões padrão: 1080x1440 (Instagram 3:4)
 */

import type { WizardMotor } from "@/db/schema";

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
  | "SUPER_HEADLINE"
  | "IMAGE_OVERLAY"
  | "IMAGE_SPLIT"
  | "IMAGE_MINIMAL"
  // BrandsDecoded v4 — alternado dark/light com tom editorial-jornalístico
  | "BD_CAPA"
  | "BD_DARK"
  | "BD_LIGHT"
  | "BD_CTA";

/**
 * Motor de criação de conteúdo que o template é projetado para servir.
 *
 * Alias de `WizardMotor` (single source of truth em `@/db/schema`) para manter
 * os dois tipos sempre sincronizados. Hoje equivale a:
 *
 * - `tribal_v4`: ângulos tribais (hook emocional, urgência, identidade)
 * - `brandsdecoded_v4`: análise editorial (Folha de S.Paulo, 9 slides alternados)
 *
 * Templates sem motor são considerados genéricos/compatíveis com qualquer motor.
 */
export type TemplateMotor = WizardMotor;

/**
 * Tipo de conteúdo que pode ser criado no Studio
 */
export type StudioContentType = "carousel" | "single" | "story";

/**
 * Aspect ratio suportados
 */
export type AspectRatio = "3:4" | "1:1" | "9:16";

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
 * Preview visual mínimo (bg + accent) usado na galeria de templates.
 *
 * Nota: `template-gallery.tsx` consome só `{ bg, accent }`, enquanto
 * `visual-template-selector.tsx` enriquece com `textPreview` localmente —
 * mantemos o shape canônico mínimo aqui e consumidores estendem como quiser.
 */
export interface TemplatePreview {
  bg: string;
  accent: string;
}

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
  /**
   * Motor de conteúdo ao qual o template pertence.
   * Se omitido, o template é considerado genérico (compatível com todos os motores).
   */
  motor?: TemplateMotor;
  /** Tags livres para filtragem/agrupamento na galeria */
  tags?: string[];
  /**
   * Nome do ícone lucide-react (PascalCase) a ser usado no card do template.
   * Ex.: `"LayoutTemplate"`, `"Newspaper"`. Consumidor (gallery/selector) faz
   * `ICON_MAP[iconName]` para obter o componente.
   */
  icon: string;
  /** Cores de preview (bg + accent) usadas no card de galeria. */
  preview: TemplatePreview;
}

/**
 * Metadados de todos os templates disponíveis
 */
export const TEMPLATE_METADATA: Record<FigmaTemplate, TemplateMetadata> = {
  // === FIGMA TEMPLATES (com perfil/avatar) ===
  "01_CAPA": {
    id: "01_CAPA",
    label: "Capa",
    description: "Imagem de fundo + headline + subtitulo + swipe indicator",
    recommendedUse: "cover",
    requiredFields: ["texto1"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: true,
    icon: "LayoutTemplate",
    preview: { bg: "#1a1a2e", accent: "#FFD700" },
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
    icon: "Columns",
    preview: { bg: "#ffffff", accent: "#000000" },
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
    icon: "Layout",
    preview: { bg: "#ffffff", accent: "#000000" },
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
    icon: "ArrowRight",
    preview: { bg: "#ffffff", accent: "#FFD700" },
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
    icon: "Moon",
    preview: { bg: "#0f0f0f", accent: "#2dd4bf" },
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
    icon: "Sun",
    preview: { bg: "#fafafa", accent: "#f97316" },
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
    icon: "Twitter",
    preview: { bg: "#ffffff", accent: "#1d9bf0" },
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
    icon: "Type",
    preview: { bg: "#ffffff", accent: "#a3e635" },
  },
  // === IMAGE TEMPLATES (com imagem de fundo) ===
  "IMAGE_OVERLAY": {
    id: "IMAGE_OVERLAY",
    label: "Imagem Overlay",
    description: "Imagem full-bleed + gradiente + texto sobre",
    recommendedUse: "any",
    requiredFields: ["texto1"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: false,
    icon: "Layers",
    preview: { bg: "#1a1a2e", accent: "#ffffff" },
  },
  "IMAGE_SPLIT": {
    id: "IMAGE_SPLIT",
    label: "Imagem Split",
    description: "Imagem no topo + card de texto na base",
    recommendedUse: "any",
    requiredFields: ["texto1"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: false,
    icon: "SplitSquareHorizontal",
    preview: { bg: "#f5f5f5", accent: "#1a1a2e" },
  },
  "IMAGE_MINIMAL": {
    id: "IMAGE_MINIMAL",
    label: "Imagem Minimal",
    description: "Imagem dominante + barra sutil com texto",
    recommendedUse: "any",
    requiredFields: ["texto1"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: false,
    icon: "Image",
    preview: { bg: "#2a2a3e", accent: "#e0e0e0" },
  },
  // === BRANDSDECODED V4 (alternado claro/escuro, tom editorial) ===
  "BD_CAPA": {
    id: "BD_CAPA",
    label: "BrandsDecoded — Capa",
    description: "Capa editorial: foto full-bleed + headline condensada + badge do handle",
    recommendedUse: "cover",
    requiredFields: ["texto1"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: false,
    motor: "brandsdecoded_v4",
    tags: ["bd", "capa", "editorial"],
    icon: "Newspaper",
    preview: { bg: "#0F0D0C", accent: "#C8321E" },
  },
  "BD_DARK": {
    id: "BD_DARK",
    label: "BrandsDecoded — Dark",
    description: "Slide escuro com headline forte + parágrafo (slides 2, 4, 6)",
    recommendedUse: "content",
    requiredFields: ["texto1", "texto2"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: false,
    motor: "brandsdecoded_v4",
    tags: ["bd", "dark", "editorial"],
    icon: "Moon",
    preview: { bg: "#0F0D0C", accent: "#C8321E" },
  },
  "BD_LIGHT": {
    id: "BD_LIGHT",
    label: "BrandsDecoded — Light",
    description: "Slide claro com densidade de parágrafo (slides 3, 5, 7, 9)",
    recommendedUse: "content",
    requiredFields: ["texto1", "texto2"],
    supportsBackgroundImage: true,
    supportsImage: false,
    defaultShowSwipe: false,
    motor: "brandsdecoded_v4",
    tags: ["bd", "light", "editorial"],
    icon: "Sun",
    preview: { bg: "#F5F2EF", accent: "#C8321E" },
  },
  "BD_CTA": {
    id: "BD_CTA",
    label: "BrandsDecoded — CTA (Gradient)",
    description: "Slide de direção/CTA com gradient + keyword box (slide 8)",
    recommendedUse: "final",
    requiredFields: ["texto1"],
    supportsBackgroundImage: false,
    supportsImage: false,
    defaultShowSwipe: false,
    motor: "brandsdecoded_v4",
    tags: ["bd", "cta", "gradient"],
    icon: "Megaphone",
    preview: { bg: "#8B2412", accent: "#ffffff" },
  },
};

// ============================================================================
// DIMENSION CONSTANTS
// ============================================================================

/**
 * Dimensões padrão para cada aspect ratio
 */
export const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "3:4": { width: 1080, height: 1440 },
  "1:1": { width: 1080, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

/**
 * Dimensões padrão do Instagram (3:4)
 */
export const INSTAGRAM_DIMENSIONS = DIMENSIONS["3:4"];

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
    aspectRatio: "3:4",
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
