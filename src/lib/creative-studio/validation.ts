/**
 * Creative Studio — Zod Validation Schemas
 */

import { z } from "zod";
import { CREATIVE_MODELS, FORMAT_DIMENSIONS, MAX_QUANTITY_PER_FORMAT } from "./constants";

const validModelIds = CREATIVE_MODELS.map((m) => m.id);
const validFormats = Object.keys(FORMAT_DIMENSIONS);

export const generateSchema = z.object({
  projectId: z.number().int().positive().optional(),
  mode: z.enum(["create", "vary", "replicate"]).default("create"),
  prompt: z.string().max(5000).optional(),
  model: z.string().refine((v) => validModelIds.includes(v), {
    message: `Modelo inválido. Válidos: ${validModelIds.join(", ")}`,
  }),
  formats: z
    .array(z.string().refine((v) => validFormats.includes(v)))
    .min(1, "Selecione pelo menos um formato")
    .max(6),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_FORMAT).default(1),
  textMode: z.enum(["ai_embedded", "canvas_overlay"]).nullable().optional(),
  textConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  sourceImage: z.string().nullable().optional(),
  variationType: z.string().nullable().optional(),
  presetId: z.string().nullable().optional(),
  templateSlug: z.string().nullable().optional(),
  templateVars: z.record(z.string(), z.string()).optional(),
  analysisData: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const resizeSchema = z.object({
  imageUrl: z.string().min(1, "imageUrl é obrigatório"),
  targetFormats: z
    .array(z.string().refine((v) => validFormats.includes(v)))
    .min(1, "Selecione pelo menos um formato"),
  fitMode: z.enum(["crop", "fill"]).default("crop"),
});

export const overlaySchema = z.object({
  imageUrl: z.string().min(1, "imageUrl é obrigatório"),
  textConfig: z.object({
    content: z.string().min(1, "Texto é obrigatório"),
    fontFamily: z.string(),
    fontSize: z.number().min(8).max(200),
    fontWeight: z.enum(["normal", "bold", "black"]),
    textColor: z.string(),
    textAlign: z.enum(["left", "center", "right"]),
    position: z.enum([
      "top-left", "top-center", "top-right",
      "center-left", "center", "center-right",
      "bottom-left", "bottom-center", "bottom-right",
    ]),
    backgroundColor: z.string().optional(),
    backgroundOpacity: z.number().min(0).max(1).optional(),
    shadow: z.boolean().optional(),
    shadowConfig: z.object({
      offsetX: z.number(),
      offsetY: z.number(),
      blur: z.number(),
      color: z.string(),
    }).optional(),
    textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
    lineHeight: z.number().optional(),
    letterSpacing: z.number().optional(),
    maxWidth: z.number().min(10).max(100).optional(),
  }),
  format: z.string().optional(),
});

export const analyzeSchema = z.object({
  imageUrl: z.string().min(1, "imageUrl é obrigatório"),
});

export type GenerateInput = z.infer<typeof generateSchema>;
export type ResizeInput = z.infer<typeof resizeSchema>;
export type OverlayInput = z.infer<typeof overlaySchema>;
export type AnalyzeInput = z.infer<typeof analyzeSchema>;
