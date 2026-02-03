/**
 * Content Mapper
 *
 * Maps Wizard-generated content (ZoryonCarousel) to Studio templates (StudioSlide).
 * Bridges the gap between AI-generated content structure and visual template system.
 *
 * Fase 2: Integração Wizard → Studio
 */

import {
  type FigmaTemplate,
  type StudioSlide,
  type SlideContent,
  type SlideStyle,
  type StudioProfile,
  type StudioHeader,
  type StudioState,
  DEFAULT_SLIDE_STYLE,
  DEFAULT_PROFILE,
  DEFAULT_HEADER,
  TEMPLATE_METADATA,
  createDefaultSlide,
} from "@/lib/studio-templates/types";
import type { ZoryonCarousel, GeneratedSlide, GeneratedContent } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface ContentMappingConfig {
  /** Template to use for content slides (default: "202") */
  contentTemplate: FigmaTemplate;
  /** Template to use for cover slide (default: "01_CAPA") */
  coverTemplate: FigmaTemplate;
  /** Template to use for CTA/final slide (default: "203") */
  ctaTemplate: FigmaTemplate;
  /** Apply same template to all slides */
  uniformTemplate: boolean;
  /** Auto-generate image prompts for templates that support images */
  generateImagePrompts: boolean;
  /** Custom style to apply */
  style?: Partial<SlideStyle>;
  /** Custom profile */
  profile?: Partial<StudioProfile>;
  /** Custom header */
  header?: Partial<StudioHeader>;
}

export interface MappedContent {
  slides: StudioSlide[];
  profile: StudioProfile;
  header: StudioHeader;
  caption: string;
  hashtags: string[];
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_MAPPING_CONFIG: ContentMappingConfig = {
  contentTemplate: "202",
  coverTemplate: "01_CAPA",
  ctaTemplate: "203",
  uniformTemplate: false,
  generateImagePrompts: true,
};

// ============================================================================
// TEMPLATE SELECTION LOGIC
// ============================================================================

/**
 * Determines the best template based on slide type and position
 */
export function selectTemplateForSlide(
  slideType: ZoryonCarousel["slides"][number]["tipo"],
  slideIndex: number,
  totalSlides: number,
  config: ContentMappingConfig
): FigmaTemplate {
  // If uniform template, use content template for all except cover
  if (config.uniformTemplate) {
    if (slideIndex === 0) return config.coverTemplate;
    return config.contentTemplate;
  }

  // First slide is always cover
  if (slideIndex === 0) {
    return config.coverTemplate;
  }

  // Last slide uses CTA template if it's a CTA type
  if (slideIndex === totalSlides - 1 && slideType === "cta") {
    return config.ctaTemplate;
  }

  // Select based on slide type
  switch (slideType) {
    case "problema":
      // Problems work well with bold start (201)
      return "201";

    case "conceito":
    case "passo":
      // Concepts and steps use standard layout (202)
      return "202";

    case "exemplo":
      // Examples often have images, use 202
      return "202";

    case "erro":
      // Errors can use 201 for emphasis
      return "201";

    case "sintese":
      // Synthesis uses 203 with swipe indicator
      return "203";

    case "cta":
      return config.ctaTemplate;

    default:
      return config.contentTemplate;
  }
}

// ============================================================================
// CONTENT MAPPING FUNCTIONS
// ============================================================================

/**
 * Maps a single ZoryonCarousel slide to SlideContent
 */
function mapSlideContent(
  slide: ZoryonCarousel["slides"][number],
  template: FigmaTemplate,
  config: ContentMappingConfig
): SlideContent {
  const metadata = TEMPLATE_METADATA[template];

  // Determine text distribution based on template
  let texto1 = "";
  let texto2 = "";
  let texto3 = "";
  let texto1Bold = false;
  let texto3Bold = false;

  switch (template) {
    case "01_CAPA":
      // Cover: titulo as main text
      texto1 = slide.titulo;
      texto1Bold = true;
      texto2 = slide.corpo.substring(0, 100); // Short preview
      break;

    case "201":
      // Bold start: titulo bold, then corpo
      texto1 = slide.titulo;
      texto1Bold = true;
      texto2 = slide.corpo;
      break;

    case "202":
      // Standard: titulo, corpo, conexao
      texto1 = slide.titulo;
      texto2 = slide.corpo;
      texto3 = slide.conexao_proximo || "";
      texto3Bold = true;
      break;

    case "203":
      // Swipe: titulo bold, corpo, with prominent swipe
      texto1 = slide.titulo;
      texto1Bold = true;
      texto2 = slide.corpo;
      break;

    case "DARK_MODE":
    case "WHITE_MODE":
      // Generic: headline + description
      texto1 = slide.titulo;
      texto2 = slide.corpo;
      break;

    case "TWITTER":
      // Twitter: single text block
      texto1 = `${slide.titulo}\n\n${slide.corpo}`;
      break;

    case "SUPER_HEADLINE":
      // Super headline: just the title
      texto1 = slide.titulo;
      break;

    default:
      texto1 = slide.titulo;
      texto2 = slide.corpo;
  }

  return {
    texto1,
    texto1Bold,
    texto2,
    texto3,
    texto3Bold,
    imageUrl: undefined,
    backgroundImageUrl: undefined,
  };
}

/**
 * Maps ZoryonCarousel cover to SlideContent
 */
function mapCoverContent(
  capa: ZoryonCarousel["capa"],
  throughline: string,
  template: FigmaTemplate
): SlideContent {
  return {
    texto1: capa.titulo,
    texto1Bold: true,
    texto2: capa.subtitulo || throughline,
    texto3: "",
    texto3Bold: false,
    imageUrl: undefined,
    backgroundImageUrl: undefined, // Can be set later with image generation
  };
}

/**
 * Generates an image prompt based on slide content
 */
export function generateImagePromptForSlide(
  slide: ZoryonCarousel["slides"][number],
  slideIndex: number,
  throughline: string
): string {
  const baseContext = `Para um carrossel sobre: "${throughline}"`;

  switch (slide.tipo) {
    case "problema":
      return `${baseContext}. Ilustração minimalista representando o problema: "${slide.titulo}". Estilo clean, cores sóbrias, sem texto.`;

    case "conceito":
      return `${baseContext}. Ilustração abstrata representando o conceito: "${slide.titulo}". Estilo moderno, geométrico, sem texto.`;

    case "passo":
      return `${baseContext}. Ilustração de ação/progresso para: "${slide.titulo}". Estilo motivacional, cores vibrantes, sem texto.`;

    case "exemplo":
      return `${baseContext}. Ilustração representando exemplo prático de: "${slide.titulo}". Estilo realista, profissional, sem texto.`;

    case "erro":
      return `${baseContext}. Ilustração representando erro/armadilha: "${slide.titulo}". Estilo de aviso, cores contrastantes, sem texto.`;

    case "sintese":
      return `${baseContext}. Ilustração representando síntese/conclusão: "${slide.titulo}". Estilo celebratório, cores positivas, sem texto.`;

    case "cta":
      return `${baseContext}. Ilustração motivacional para call-to-action: "${slide.titulo}". Estilo inspirador, cores da marca, sem texto.`;

    default:
      return `${baseContext}. Ilustração minimalista para: "${slide.titulo}". Estilo clean e profissional, sem texto.`;
  }
}

// ============================================================================
// MAIN MAPPING FUNCTIONS
// ============================================================================

/**
 * Maps a ZoryonCarousel to an array of StudioSlides
 */
export function mapCarouselToStudio(
  carousel: ZoryonCarousel,
  config: Partial<ContentMappingConfig> = {}
): MappedContent {
  const finalConfig: ContentMappingConfig = {
    ...DEFAULT_MAPPING_CONFIG,
    ...config,
  };

  const totalSlides = carousel.slides.length + 1; // +1 for cover
  const slides: StudioSlide[] = [];

  // Style to use
  const baseStyle: SlideStyle = {
    ...DEFAULT_SLIDE_STYLE,
    ...finalConfig.style,
  };

  // 1. Map cover slide
  const coverTemplate = finalConfig.coverTemplate;
  const coverContent = mapCoverContent(
    carousel.capa,
    carousel.throughline,
    coverTemplate
  );

  slides.push({
    id: crypto.randomUUID(),
    template: coverTemplate,
    content: coverContent,
    style: {
      ...baseStyle,
      showSwipeIndicator: true, // Cover always shows swipe
    },
  });

  // 2. Map content slides
  carousel.slides.forEach((slide, index) => {
    const slideIndex = index + 1; // +1 because cover is index 0
    const isLastSlide = slideIndex === totalSlides - 1;

    const template = selectTemplateForSlide(
      slide.tipo,
      slideIndex,
      totalSlides,
      finalConfig
    );

    const content = mapSlideContent(slide, template, finalConfig);

    // Add image prompt if template supports images and config allows
    const metadata = TEMPLATE_METADATA[template];
    if (
      finalConfig.generateImagePrompts &&
      metadata.supportsImage &&
      slide.imagePrompt
    ) {
      // Store the prompt for later image generation
      // The actual imageUrl will be set after generation
    }

    slides.push({
      id: crypto.randomUUID(),
      template,
      content,
      style: {
        ...baseStyle,
        showSwipeIndicator: !isLastSlide, // No swipe on last slide
      },
    });
  });

  // 3. Build profile and header
  const profile: StudioProfile = {
    ...DEFAULT_PROFILE,
    ...finalConfig.profile,
  };

  const header: StudioHeader = {
    ...DEFAULT_HEADER,
    ...finalConfig.header,
  };

  return {
    slides,
    profile,
    header,
    caption: carousel.legenda,
    hashtags: carousel.hashtags || [],
  };
}

/**
 * Maps GeneratedContent (legacy format) to StudioSlides
 * Supports both carousel (multiple slides) and image (single slide) types
 */
export function mapGeneratedContentToStudio(
  content: GeneratedContent,
  config: Partial<ContentMappingConfig> = {}
): MappedContent | null {
  const finalConfig: ContentMappingConfig = {
    ...DEFAULT_MAPPING_CONFIG,
    ...config,
  };

  // Style to use
  const baseStyle: SlideStyle = {
    ...DEFAULT_SLIDE_STYLE,
    ...finalConfig.style,
  };

  // Build profile and header (common for all types)
  const profile: StudioProfile = {
    ...DEFAULT_PROFILE,
    ...finalConfig.profile,
  };

  const header: StudioHeader = {
    ...DEFAULT_HEADER,
    ...finalConfig.header,
  };

  // Handle image type (single slide)
  if (content.type === "image") {
    const imagePrompt = (content.metadata as any)?.imagePrompt || "";

    // Create a single slide for image post
    const slideContent: SlideContent = {
      texto1: content.caption?.split("\n")[0] || "Imagem",
      texto1Bold: true,
      texto2: content.cta || "",
      texto3: "",
      texto3Bold: false,
      imageUrl: undefined, // Will be generated/uploaded in Visual Studio
      backgroundImageUrl: undefined,
    };

    const slides: StudioSlide[] = [{
      id: crypto.randomUUID(),
      template: finalConfig.coverTemplate, // Use cover template for single image
      content: slideContent,
      style: {
        ...baseStyle,
        showSwipeIndicator: false, // Single image, no swipe needed
      },
      // Store imagePrompt for AI generation in Visual Studio
      metadata: {
        imagePrompt,
        originalCaption: content.caption,
      },
    } as StudioSlide & { metadata?: Record<string, unknown> }];

    return {
      slides,
      profile,
      header,
      caption: content.caption || "",
      hashtags: content.hashtags || [],
    };
  }

  // Handle carousel type (multiple slides)
  if (content.type !== "carousel" || !content.slides) {
    return null;
  }

  const slides: StudioSlide[] = [];
  const totalSlides = content.slides.length;

  content.slides.forEach((slide, index) => {
    const isFirst = index === 0;
    const isLast = index === totalSlides - 1;

    // Select template based on position
    let template: FigmaTemplate;
    if (isFirst) {
      template = finalConfig.coverTemplate;
    } else if (isLast) {
      template = finalConfig.ctaTemplate;
    } else {
      template = finalConfig.contentTemplate;
    }

    // Map content
    const slideContent: SlideContent = {
      texto1: slide.title,
      texto1Bold: isFirst || template === "201",
      texto2: slide.content,
      texto3: "",
      texto3Bold: false,
      imageUrl: slide.imageUrl,
      backgroundImageUrl: isFirst ? slide.imageUrl : undefined,
    };

    slides.push({
      id: crypto.randomUUID(),
      template,
      content: slideContent,
      style: {
        ...baseStyle,
        showSwipeIndicator: !isLast,
      },
    });
  });

  return {
    slides,
    profile,
    header,
    caption: content.caption || "",
    hashtags: content.hashtags || [],
  };
}

/**
 * Creates a complete StudioState from mapped content
 */
export function createStudioStateFromMappedContent(
  mapped: MappedContent,
  projectTitle: string = "Conteúdo do Wizard"
): StudioState {
  return {
    contentType: "carousel",
    aspectRatio: "4:5",
    slides: mapped.slides,
    activeSlideIndex: 0,
    caption: mapped.caption,
    hashtags: mapped.hashtags,
    profile: mapped.profile,
    header: mapped.header,
    projectTitle,
    isDirty: true,
    isSaving: false,
    isPublishing: false,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extracts image prompts from all slides that support images
 */
export function extractImagePrompts(
  carousel: ZoryonCarousel
): Array<{ slideIndex: number; prompt: string }> {
  const prompts: Array<{ slideIndex: number; prompt: string }> = [];

  carousel.slides.forEach((slide, index) => {
    if (slide.imagePrompt) {
      prompts.push({
        slideIndex: index + 1, // +1 because cover is index 0
        prompt: slide.imagePrompt,
      });
    } else {
      // Generate a prompt based on content
      const generatedPrompt = generateImagePromptForSlide(
        slide,
        index,
        carousel.throughline
      );
      prompts.push({
        slideIndex: index + 1,
        prompt: generatedPrompt,
      });
    }
  });

  return prompts;
}

/**
 * Updates slides with generated image URLs
 */
export function updateSlidesWithImages(
  slides: StudioSlide[],
  imageMap: Map<number, string> // slideIndex -> imageUrl
): StudioSlide[] {
  return slides.map((slide, index) => {
    const imageUrl = imageMap.get(index);
    if (!imageUrl) return slide;

    const metadata = TEMPLATE_METADATA[slide.template];

    return {
      ...slide,
      content: {
        ...slide.content,
        imageUrl: metadata.supportsImage ? imageUrl : slide.content.imageUrl,
        backgroundImageUrl: metadata.supportsBackgroundImage
          ? imageUrl
          : slide.content.backgroundImageUrl,
      },
    };
  });
}

/**
 * Validates that mapped content is complete
 */
export function validateMappedContent(mapped: MappedContent): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!mapped.slides || mapped.slides.length === 0) {
    issues.push("Nenhum slide foi mapeado");
  }

  if (mapped.slides.length > 10) {
    issues.push("Carrossel excede limite de 10 slides do Instagram");
  }

  mapped.slides.forEach((slide, index) => {
    if (!slide.content.texto1?.trim()) {
      issues.push(`Slide ${index + 1}: texto principal está vazio`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}
