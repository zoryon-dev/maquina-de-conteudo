/**
 * Studio Store
 *
 * Zustand store para gerenciar o estado do Editor Visual (Studio).
 * Inclui slides, perfil, header, configurações visuais e ações.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  StudioState,
  StudioSlide,
  StudioProfile,
  StudioHeader,
  SlideContent,
  SlideStyle,
  FigmaTemplate,
  StudioContentType,
  AspectRatio,
} from "@/lib/studio-templates/types";
import {
  createDefaultSlide,
  createInitialStudioState,
  DEFAULT_PROFILE,
  DEFAULT_HEADER,
  getRecommendedTemplate,
  MAX_SLIDES,
} from "@/lib/studio-templates/types";
import { undoRedo, type UndoRedoState } from "./middleware/undo-redo";

// ============================================================================
// STORE ACTIONS
// ============================================================================

interface StudioActions {
  // ============ SLIDES ============
  /** Adiciona um novo slide no índice especificado (ou no final) */
  addSlide: (template?: FigmaTemplate, atIndex?: number) => void;
  /** Remove um slide pelo ID */
  removeSlide: (slideId: string) => void;
  /** Duplica um slide */
  duplicateSlide: (slideId: string) => void;
  /** Move um slide para nova posição */
  moveSlide: (fromIndex: number, toIndex: number) => void;
  /** Define o slide ativo */
  setActiveSlide: (index: number) => void;
  /** Atualiza o template de um slide */
  setSlideTemplate: (slideId: string, template: FigmaTemplate) => void;

  // ============ SLIDE CONTENT ============
  /** Atualiza o conteúdo de um slide */
  updateSlideContent: (slideId: string, content: Partial<SlideContent>) => void;
  /** Atualiza o estilo de um slide */
  updateSlideStyle: (slideId: string, style: Partial<SlideStyle>) => void;
  /** Aplica estilo a todos os slides */
  applyStyleToAllSlides: (style: Partial<SlideStyle>) => void;

  // ============ PROFILE & HEADER ============
  /** Atualiza o perfil */
  updateProfile: (profile: Partial<StudioProfile>) => void;
  /** Atualiza o header */
  updateHeader: (header: Partial<StudioHeader>) => void;

  // ============ PROJECT ============
  /** Define o tipo de conteúdo */
  setContentType: (type: StudioContentType) => void;
  /** Define o aspect ratio */
  setAspectRatio: (ratio: AspectRatio) => void;
  /** Define o título do projeto */
  setProjectTitle: (title: string) => void;
  /** Define a legenda/caption */
  setCaption: (caption: string) => void;
  /** Define as hashtags */
  setHashtags: (hashtags: string[]) => void;
  /** Adiciona uma hashtag */
  addHashtag: (hashtag: string) => void;
  /** Remove uma hashtag */
  removeHashtag: (hashtag: string) => void;

  // ============ STATE FLAGS ============
  /** Marca como modificado */
  setDirty: (dirty: boolean) => void;
  /** Define estado de salvando */
  setSaving: (saving: boolean) => void;
  /** Define estado de publicando */
  setPublishing: (publishing: boolean) => void;

  // ============ RESET ============
  /** Reseta o store para estado inicial */
  reset: () => void;
  /** Carrega um projeto existente */
  loadProject: (state: Partial<StudioState>) => void;
}

// ============================================================================
// STORE TYPE
// ============================================================================

type StudioStoreBase = StudioState & StudioActions;
type StudioStore = StudioStoreBase & UndoRedoState;

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useStudioStore = create<StudioStore>()(
  devtools(
    persist(
      (undoRedo as unknown as (creator: import("zustand").StateCreator<StudioStoreBase>) => import("zustand").StateCreator<StudioStore>)(
      (set, get) => ({
        // ============ INITIAL STATE ============
        ...createInitialStudioState(),

        // ============ SLIDES ============
        addSlide: (template, atIndex) => {
          set((state) => {
            // Enforçar limite de slides (Instagram carousel limit)
            if (state.slides.length >= MAX_SLIDES) {
              console.warn(`[StudioStore] Cannot add slide: max ${MAX_SLIDES} reached`);
              return state;
            }

            const totalSlides = state.slides.length + 1;
            const insertIndex = atIndex ?? state.slides.length;

            // Se não especificar template, usar recomendado para posição
            const slideTemplate =
              template ?? getRecommendedTemplate(insertIndex, totalSlides);

            const newSlide = createDefaultSlide(slideTemplate);
            const newSlides = [...state.slides];
            newSlides.splice(insertIndex, 0, newSlide);

            return {
              slides: newSlides,
              activeSlideIndex: insertIndex,
              isDirty: true,
            };
          });
        },

        removeSlide: (slideId) => {
          set((state) => {
            // Não permitir remover o último slide
            if (state.slides.length <= 1) return state;

            const slideIndex = state.slides.findIndex((s) => s.id === slideId);
            if (slideIndex === -1) return state;

            const newSlides = state.slides.filter((s) => s.id !== slideId);
            const newActiveIndex = Math.min(
              state.activeSlideIndex,
              newSlides.length - 1
            );

            return {
              slides: newSlides,
              activeSlideIndex: newActiveIndex,
              isDirty: true,
            };
          });
        },

        duplicateSlide: (slideId) => {
          set((state) => {
            const slideIndex = state.slides.findIndex((s) => s.id === slideId);
            if (slideIndex === -1) return state;

            const originalSlide = state.slides[slideIndex];
            const duplicatedSlide: StudioSlide = {
              ...originalSlide,
              id: crypto.randomUUID(),
              content: { ...originalSlide.content },
              style: { ...originalSlide.style },
            };

            const newSlides = [...state.slides];
            newSlides.splice(slideIndex + 1, 0, duplicatedSlide);

            return {
              slides: newSlides,
              activeSlideIndex: slideIndex + 1,
              isDirty: true,
            };
          });
        },

        moveSlide: (fromIndex, toIndex) => {
          set((state) => {
            if (
              fromIndex < 0 ||
              fromIndex >= state.slides.length ||
              toIndex < 0 ||
              toIndex >= state.slides.length
            ) {
              return state;
            }

            const newSlides = [...state.slides];
            const [movedSlide] = newSlides.splice(fromIndex, 1);
            newSlides.splice(toIndex, 0, movedSlide);

            return {
              slides: newSlides,
              activeSlideIndex: toIndex,
              isDirty: true,
            };
          });
        },

        setActiveSlide: (index) => {
          set((state) => {
            if (index < 0 || index >= state.slides.length) return state;
            return { activeSlideIndex: index };
          });
        },

        setSlideTemplate: (slideId, template) => {
          set((state) => ({
            slides: state.slides.map((slide) =>
              slide.id === slideId ? { ...slide, template } : slide
            ),
            isDirty: true,
          }));
        },

        // ============ SLIDE CONTENT ============
        updateSlideContent: (slideId, content) => {
          set((state) => ({
            slides: state.slides.map((slide) =>
              slide.id === slideId
                ? { ...slide, content: { ...slide.content, ...content } }
                : slide
            ),
            isDirty: true,
          }));
        },

        updateSlideStyle: (slideId, style) => {
          set((state) => ({
            slides: state.slides.map((slide) =>
              slide.id === slideId
                ? { ...slide, style: { ...slide.style, ...style } }
                : slide
            ),
            isDirty: true,
          }));
        },

        applyStyleToAllSlides: (style) => {
          set((state) => ({
            slides: state.slides.map((slide) => ({
              ...slide,
              style: { ...slide.style, ...style },
            })),
            isDirty: true,
          }));
        },

        // ============ PROFILE & HEADER ============
        updateProfile: (profile) => {
          set((state) => ({
            profile: { ...state.profile, ...profile },
            isDirty: true,
          }));
        },

        updateHeader: (header) => {
          set((state) => ({
            header: { ...state.header, ...header },
            isDirty: true,
          }));
        },

        // ============ PROJECT ============
        setContentType: (contentType) => {
          set({ contentType, isDirty: true });
        },

        setAspectRatio: (aspectRatio) => {
          set({ aspectRatio, isDirty: true });
        },

        setProjectTitle: (projectTitle) => {
          set({ projectTitle, isDirty: true });
        },

        setCaption: (caption) => {
          set({ caption, isDirty: true });
        },

        setHashtags: (hashtags) => {
          set({ hashtags, isDirty: true });
        },

        addHashtag: (hashtag) => {
          set((state) => {
            const normalizedHashtag = hashtag.startsWith("#")
              ? hashtag
              : `#${hashtag}`;
            if (state.hashtags.includes(normalizedHashtag)) return state;
            return {
              hashtags: [...state.hashtags, normalizedHashtag],
              isDirty: true,
            };
          });
        },

        removeHashtag: (hashtag) => {
          set((state) => ({
            hashtags: state.hashtags.filter((h) => h !== hashtag),
            isDirty: true,
          }));
        },

        // ============ STATE FLAGS ============
        setDirty: (isDirty) => set({ isDirty }),
        setSaving: (isSaving) => set({ isSaving }),
        setPublishing: (isPublishing) => set({ isPublishing }),

        // ============ RESET ============
        reset: () => {
          set(createInitialStudioState());
          // Limpar historico de undo/redo apos reset
          const state = get();
          if ("clearHistory" in state) {
            (state as StudioStore).clearHistory();
          }
        },

        loadProject: (projectState) => {
          // Validar campos essenciais
          if (projectState.slides && !Array.isArray(projectState.slides)) {
            console.error("[StudioStore] Invalid slides in loadProject");
            return;
          }
          if (projectState.slides?.length === 0) {
            console.error("[StudioStore] Cannot load project with empty slides");
            return;
          }

          // Migrar aspect ratio legado (4:5 → 3:4)
          if ((projectState.aspectRatio as string) === "4:5") {
            projectState.aspectRatio = "3:4";
          }

          set((state) => ({
            ...state,
            ...projectState,
            // TODO: Consider migrating to activeSlideId for better stability when slides are reordered
            // Current index-based approach handles edge cases but is fragile
            // Garantir activeSlideIndex válido
            activeSlideIndex: Math.min(
              projectState.activeSlideIndex ?? state.activeSlideIndex,
              (projectState.slides?.length ?? state.slides.length) - 1
            ),
            isDirty: false,
          }));
          // Limpar historico de undo/redo ao carregar projeto
          const currentState = get();
          if ("clearHistory" in currentState) {
            (currentState as StudioStore).clearHistory();
          }
        },
      })),
      {
        name: "studio-store",
        version: 1,
        migrate: (persistedState, version) => {
          const state = persistedState as Record<string, unknown>;
          if (version === 0) {
            // Migrar aspect ratio 4:5 → 3:4 (Feb 2026)
            if (state.aspectRatio === "4:5") {
              state.aspectRatio = "3:4";
            }
          }
          return state as unknown as StudioStore;
        },
        // Não persistir flags de loading
        partialize: (state) => ({
          contentType: state.contentType,
          aspectRatio: state.aspectRatio,
          slides: state.slides,
          activeSlideIndex: state.activeSlideIndex,
          caption: state.caption,
          hashtags: state.hashtags,
          profile: state.profile,
          header: state.header,
          projectTitle: state.projectTitle,
        }),
      }
    ),
    { name: "StudioStore" }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Seletor para obter o slide ativo
 */
export const useActiveSlide = () =>
  useStudioStore((state) => state.slides[state.activeSlideIndex]);

/**
 * Seletor para obter todos os slides
 */
export const useSlides = () => useStudioStore((state) => state.slides);

/**
 * Seletor para obter o perfil
 */
export const useProfile = () => useStudioStore((state) => state.profile);

/**
 * Seletor para obter o header
 */
export const useHeader = () => useStudioStore((state) => state.header);

/**
 * Seletor para verificar se pode adicionar mais slides (máx MAX_SLIDES)
 */
export const useCanAddSlide = () =>
  useStudioStore((state) => state.slides.length < MAX_SLIDES);

/**
 * Seletor para verificar se pode remover slides
 */
export const useCanRemoveSlide = () =>
  useStudioStore((state) => state.slides.length > 1);
