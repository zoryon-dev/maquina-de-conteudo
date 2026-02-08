/**
 * Creative Studio — Zustand Store (Phase 5)
 *
 * Client-side state for the creative studio wizard flow.
 */

import { create } from "zustand";
import type { TextOverlayConfig, ImageAnalysis } from "@/lib/creative-studio/types";
import type { CreativeOutput, CreativeStudioMode } from "@/db/schema";
import { DEFAULT_CREATIVE_MODEL } from "@/lib/creative-studio/constants";

interface CreativeStudioState {
  // Current mode
  mode: CreativeStudioMode;

  // Shared config
  selectedFormats: string[];
  quantityPerFormat: number;
  selectedModel: string;
  selectedPreset: string | null;

  // Mode 1: Create
  prompt: string;
  textMode: "ai_embedded" | "canvas_overlay" | null;
  textConfig: TextOverlayConfig | null;

  // Mode 2: Vary
  sourceImageUrl: string | null;
  sourceImageKey: string | null;
  variationType: "resize" | "restyle" | "inpaint" | null;
  variationStrength: number;

  // Mode 3: Replicate
  referenceImageUrl: string | null;
  referenceImageKey: string | null;
  analysis: ImageAnalysis | null;
  userEdits: Record<string, unknown>;

  // Status
  isGenerating: boolean;
  currentJobId: number | null;
  currentProjectId: number | null;
  outputs: CreativeOutput[];

  // Actions
  setMode: (mode: CreativeStudioMode) => void;
  setFormats: (formats: string[]) => void;
  setQuantity: (quantity: number) => void;
  setModel: (model: string) => void;
  setPreset: (preset: string | null) => void;
  setPrompt: (prompt: string) => void;
  setTextMode: (mode: "ai_embedded" | "canvas_overlay" | null) => void;
  setTextConfig: (config: TextOverlayConfig | null) => void;
  setSourceImage: (url: string | null, key: string | null) => void;
  setVariationType: (type: "resize" | "restyle" | "inpaint" | null) => void;
  setVariationStrength: (strength: number) => void;
  setReferenceImage: (url: string | null, key: string | null) => void;
  setAnalysis: (analysis: ImageAnalysis | null) => void;
  setUserEdits: (edits: Record<string, unknown>) => void;
  setGenerating: (generating: boolean, jobId?: number | null, projectId?: number | null) => void;
  setOutputs: (outputs: CreativeOutput[]) => void;
  addOutput: (output: CreativeOutput) => void;
  reset: () => void;
}

const initialState = {
  mode: "create" as CreativeStudioMode,
  selectedFormats: ["1:1"],
  quantityPerFormat: 1,
  selectedModel: DEFAULT_CREATIVE_MODEL,
  selectedPreset: null,
  prompt: "",
  textMode: null,
  textConfig: null,
  sourceImageUrl: null,
  sourceImageKey: null,
  variationType: null,
  variationStrength: 0.7,
  referenceImageUrl: null,
  referenceImageKey: null,
  analysis: null,
  userEdits: {},
  isGenerating: false,
  currentJobId: null,
  currentProjectId: null,
  outputs: [],
};

export const useCreativeStudioStore = create<CreativeStudioState>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setFormats: (selectedFormats) => set({ selectedFormats }),
  setQuantity: (quantityPerFormat) => set({ quantityPerFormat }),
  setModel: (selectedModel) => set({ selectedModel }),
  setPreset: (selectedPreset) => set({ selectedPreset }),
  setPrompt: (prompt) => set({ prompt }),
  setTextMode: (textMode) => set({ textMode }),
  setTextConfig: (textConfig) => set({ textConfig }),
  setSourceImage: (sourceImageUrl, sourceImageKey) =>
    set({ sourceImageUrl, sourceImageKey }),
  setVariationType: (variationType) => set({ variationType }),
  setVariationStrength: (variationStrength) => set({ variationStrength }),
  setReferenceImage: (referenceImageUrl, referenceImageKey) =>
    set({ referenceImageUrl, referenceImageKey }),
  setAnalysis: (analysis) => set({ analysis }),
  setUserEdits: (userEdits) => set({ userEdits }),
  setGenerating: (isGenerating, currentJobId = null, currentProjectId = null) =>
    set({ isGenerating, currentJobId, currentProjectId }),
  setOutputs: (outputs) => set({ outputs }),
  addOutput: (output) =>
    set((state) => ({ outputs: [...state.outputs, output] })),
  reset: () => set(initialState),
}));
