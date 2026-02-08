/**
 * Article Derivation Store
 *
 * Temporary Zustand store for transferring article context
 * to the Studio/Wizard when deriving cross-format content.
 */

import { create } from "zustand";

export type DerivationType = "social_post" | "video_script" | "carousel";

interface ArticleDerivationContext {
  articleId: number;
  title: string;
  primaryKeyword: string;
  content: string; // Assembled or final content
  seoScore?: number;
  wordCount?: number;
}

interface ArticleDerivationState {
  context: ArticleDerivationContext | null;
  derivationType: DerivationType | null;

  setDerivation: (context: ArticleDerivationContext, type: DerivationType) => void;
  clear: () => void;
}

export const useArticleDerivationStore = create<ArticleDerivationState>((set) => ({
  context: null,
  derivationType: null,

  setDerivation: (context, derivationType) =>
    set({ context, derivationType }),

  clear: () =>
    set({ context: null, derivationType: null }),
}));
