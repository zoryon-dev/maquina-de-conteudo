# Especificação: Sistema Modular de Geração de Imagens para Instagram

## Contexto do Problema

O sistema atual possui dois modos de geração de imagens:

1. **Modo DIRETO**: Muito simples, apenas adiciona hints básicos de estilo
2. **Modo TRIBAL**: Passa o prompt por uma IA que interpreta "filosofia tribal", resultando em prompts muito conceituais que fogem da intenção do usuário

**Problema principal**: O usuário digita "mulher empreendedora em café" e recebe uma imagem com "energia visionária de empoderamento com bokeh assimétrico" — fora do escopo solicitado.

**Solução**: Criar um sistema de campos modulares onde o usuário tem controle granular sobre cada aspecto visual, sem interpretação criativa da IA. O prompt final é uma concatenação previsível dos campos preenchidos.

---

## Arquitetura da Solução

### Fluxo Simplificado

```
[Usuário preenche campos] → [buildPrompt() concatena] → [Envia para modelo de imagem]
```

Não há mais uma IA intermediária interpretando o prompt. O usuário vê exatamente o que será enviado.

---

## Schema de Tipos TypeScript

```typescript
// types/image-generation.ts

/**
 * Campos para geração modular de imagens
 * Todos os campos são concatenados de forma previsível para formar o prompt final
 */
export interface ImagePromptFields {
  // ═══════════════════════════════════════════════════════════════
  // CAMPOS OBRIGATÓRIOS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * O que/quem aparece na imagem (sujeito principal)
   * @example "mulher empreendedora trabalhando no laptop"
   * @example "mãos segurando um celular"
   * @example "mesa de trabalho organizada"
   */
  subject: string;
  
  /**
   * Onde a cena acontece (cenário/ambiente)
   * @example "café moderno com plantas"
   * @example "home office minimalista"
   * @example "fundo gradiente abstrato"
   */
  setting: string;

  // ═══════════════════════════════════════════════════════════════
  // CAMPOS VISUAIS (selects/radios)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Tipo de enquadramento da câmera
   */
  shotType: "close-up" | "medium" | "wide" | "detail" | "overhead";
  
  /**
   * Tipo de iluminação da cena
   */
  lighting: "natural" | "studio" | "golden-hour" | "dramatic" | "soft" | "neon";
  
  /**
   * Paleta de cores predominante
   */
  colorPalette: "warm" | "cool" | "vibrant" | "muted" | "pastel" | "dark" | "b&w";
  
  /**
   * Estilo fotográfico geral
   */
  photoStyle: "editorial" | "lifestyle" | "corporate" | "candid" | "artistic" | "minimal" | "bold";

  // ═══════════════════════════════════════════════════════════════
  // FORMATO
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Proporção da imagem (aspect ratio)
   * - 1:1 = Feed quadrado
   * - 4:5 = Feed retrato (recomendado para Instagram)
   * - 9:16 = Stories/Reels
   * - 16:9 = Paisagem/YouTube
   */
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";

  // ═══════════════════════════════════════════════════════════════
  // TEXTO NA IMAGEM (opcional)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Se deve incluir texto sobreposto na imagem
   */
  includeText: boolean;
  
  /**
   * Conteúdo do texto (obrigatório se includeText = true)
   * @example "Comece hoje"
   * @example "Você não está sozinha"
   */
  textContent?: string;
  
  /**
   * Posição do texto na imagem
   */
  textPlacement?: "top" | "center" | "bottom";
  
  /**
   * Estilo visual do texto
   */
  textStyle?: "bold-sans" | "elegant-serif" | "handwritten" | "minimal";

  // ═══════════════════════════════════════════════════════════════
  // CAMPOS AVANÇADOS (opcionais, collapsed por padrão na UI)
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Humor/sentimento que a imagem deve transmitir
   * @example "confiante e determinada"
   * @example "calmo e reflexivo"
   * @example "energético e motivador"
   */
  mood?: string;
  
  /**
   * Elementos específicos para evitar na imagem
   * @example "sem pessoas ao fundo, sem logos visíveis"
   */
  avoidElements?: string;
  
  /**
   * Instruções adicionais livres do usuário
   * @example "estilo similar a fotos da Forbes"
   */
  additionalNotes?: string;
}

/**
 * Presets pré-configurados para casos de uso comuns
 */
export interface ImagePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaults: Partial<ImagePromptFields>;
}

/**
 * Resultado da função buildPrompt
 */
export interface BuiltPrompt {
  /** Prompt positivo completo para enviar ao modelo */
  prompt: string;
  /** Prompt negativo (elementos a evitar) */
  negativePrompt: string;
  /** Preview amigável para mostrar ao usuário */
  previewText: string;
}
```

---

## Função de Construção do Prompt

```typescript
// lib/image-generation/build-prompt.ts

import { ImagePromptFields, BuiltPrompt } from "@/types/image-generation";

/**
 * Mapas de tradução dos campos para texto do prompt
 * Cada campo tem uma tradução clara e consistente
 */
const SHOT_TYPE_MAP: Record<ImagePromptFields["shotType"], string> = {
  "close-up": "close-up portrait shot, face and shoulders visible",
  "medium": "medium shot, waist up, showing upper body and environment",
  "wide": "wide environmental shot, full body with surroundings visible",
  "detail": "detail shot, macro focus on specific element",
  "overhead": "overhead flat lay shot, top-down perspective",
};

const LIGHTING_MAP: Record<ImagePromptFields["lighting"], string> = {
  "natural": "natural daylight, soft window light",
  "studio": "professional studio lighting, clean and even",
  "golden-hour": "golden hour warm sunlight, soft shadows",
  "dramatic": "dramatic lighting, strong contrast, defined shadows",
  "soft": "soft diffused lighting, minimal shadows",
  "neon": "neon accent lighting, colorful glows",
};

const COLOR_PALETTE_MAP: Record<ImagePromptFields["colorPalette"], string> = {
  "warm": "warm color palette, oranges, yellows, and earth tones",
  "cool": "cool color palette, blues, teals, and greens",
  "vibrant": "vibrant saturated colors, bold and eye-catching",
  "muted": "muted desaturated tones, soft and understated",
  "pastel": "pastel color palette, soft pinks, blues, and lavenders",
  "dark": "dark moody palette, deep shadows, rich blacks",
  "b&w": "black and white, high contrast monochrome",
};

const PHOTO_STYLE_MAP: Record<ImagePromptFields["photoStyle"], string> = {
  "editorial": "editorial photography style, magazine quality, polished",
  "lifestyle": "lifestyle photography, authentic and relatable moments",
  "corporate": "corporate professional photography, clean and trustworthy",
  "candid": "candid photography style, natural unposed moments",
  "artistic": "artistic photography, creative composition and unique angles",
  "minimal": "minimalist photography, clean backgrounds, single focus point",
  "bold": "bold graphic style, strong shapes and high impact visuals",
};

const TEXT_STYLE_MAP: Record<NonNullable<ImagePromptFields["textStyle"]>, string> = {
  "bold-sans": "bold sans-serif typography, modern and impactful",
  "elegant-serif": "elegant serif typography, sophisticated and classic",
  "handwritten": "handwritten script typography, personal and authentic",
  "minimal": "minimal clean typography, simple and readable",
};

const ASPECT_RATIO_MAP: Record<ImagePromptFields["aspectRatio"], string> = {
  "1:1": "square 1:1 aspect ratio",
  "4:5": "portrait 4:5 aspect ratio, optimized for Instagram feed",
  "9:16": "vertical 9:16 aspect ratio, optimized for Stories and Reels",
  "16:9": "landscape 16:9 aspect ratio, cinematic wide format",
};

/**
 * Constrói o prompt final a partir dos campos preenchidos
 * 
 * @param fields - Campos preenchidos pelo usuário
 * @returns Objeto com prompt, negativePrompt e previewText
 * 
 * @example
 * const result = buildPrompt({
 *   subject: "mulher empreendedora trabalhando no laptop",
 *   setting: "café moderno com plantas",
 *   shotType: "medium",
 *   lighting: "natural",
 *   colorPalette: "warm",
 *   photoStyle: "lifestyle",
 *   aspectRatio: "4:5",
 *   includeText: false,
 * });
 * 
 * // result.prompt será uma string concatenada de todos os elementos
 */
export function buildPrompt(fields: ImagePromptFields): BuiltPrompt {
  const promptParts: string[] = [];
  
  // ═══════════════════════════════════════════════════════════════
  // 1. SUJEITO E CENÁRIO (Core da imagem)
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(`${fields.subject}, set in ${fields.setting}`);
  
  // ═══════════════════════════════════════════════════════════════
  // 2. ENQUADRAMENTO
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(SHOT_TYPE_MAP[fields.shotType]);
  
  // ═══════════════════════════════════════════════════════════════
  // 3. ILUMINAÇÃO
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(LIGHTING_MAP[fields.lighting]);
  
  // ═══════════════════════════════════════════════════════════════
  // 4. ESTILO FOTOGRÁFICO
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(PHOTO_STYLE_MAP[fields.photoStyle]);
  
  // ═══════════════════════════════════════════════════════════════
  // 5. PALETA DE CORES
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(COLOR_PALETTE_MAP[fields.colorPalette]);
  
  // ═══════════════════════════════════════════════════════════════
  // 6. MOOD (se fornecido)
  // ═══════════════════════════════════════════════════════════════
  if (fields.mood && fields.mood.trim()) {
    promptParts.push(`conveying a ${fields.mood} mood and atmosphere`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 7. TEXTO NA IMAGEM (se solicitado)
  // ═══════════════════════════════════════════════════════════════
  if (fields.includeText && fields.textContent && fields.textContent.trim()) {
    const placement = fields.textPlacement || "center";
    const style = fields.textStyle ? TEXT_STYLE_MAP[fields.textStyle] : "clean readable typography";
    
    promptParts.push(
      `with text overlay saying "${fields.textContent}" positioned at the ${placement} of the image, ${style}`
    );
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 8. NOTAS ADICIONAIS (se fornecidas)
  // ═══════════════════════════════════════════════════════════════
  if (fields.additionalNotes && fields.additionalNotes.trim()) {
    promptParts.push(fields.additionalNotes);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 9. FORMATO E OTIMIZAÇÃO INSTAGRAM (sempre incluído)
  // ═══════════════════════════════════════════════════════════════
  promptParts.push(ASPECT_RATIO_MAP[fields.aspectRatio]);
  promptParts.push("scroll-stopping visual optimized for Instagram");
  promptParts.push("high quality, sharp focus, professional photography");
  
  // ═══════════════════════════════════════════════════════════════
  // CONSTRUIR PROMPT NEGATIVO
  // ═══════════════════════════════════════════════════════════════
  const negativePromptParts: string[] = [
    "blurry",
    "low quality",
    "distorted",
    "watermark",
    "logo",
    "amateur",
    "poorly lit",
    "oversaturated",
    "unnatural colors",
  ];
  
  // Adiciona elementos que o usuário quer evitar
  if (fields.avoidElements && fields.avoidElements.trim()) {
    negativePromptParts.push(fields.avoidElements);
  }
  
  // Se NÃO quer texto, adiciona ao negativo
  if (!fields.includeText) {
    negativePromptParts.push("text", "words", "letters", "typography", "captions");
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CONSTRUIR PREVIEW AMIGÁVEL
  // ═══════════════════════════════════════════════════════════════
  const previewText = `📸 ${fields.subject} | 📍 ${fields.setting} | 🎬 ${fields.shotType} | 💡 ${fields.lighting} | 🎨 ${fields.colorPalette}`;
  
  return {
    prompt: promptParts.join(". ") + ".",
    negativePrompt: negativePromptParts.join(", "),
    previewText,
  };
}

/**
 * Valida os campos obrigatórios antes de construir o prompt
 */
export function validateFields(fields: Partial<ImagePromptFields>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!fields.subject || !fields.subject.trim()) {
    errors.push("O campo 'O que aparece na imagem' é obrigatório");
  }
  
  if (!fields.setting || !fields.setting.trim()) {
    errors.push("O campo 'Cenário/Ambiente' é obrigatório");
  }
  
  if (fields.includeText && (!fields.textContent || !fields.textContent.trim())) {
    errors.push("Você marcou 'incluir texto' mas não digitou o texto");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## Presets Pré-Configurados

```typescript
// lib/image-generation/presets.ts

import { ImagePreset } from "@/types/image-generation";

/**
 * Presets para casos de uso comuns no Instagram
 * O usuário pode selecionar um preset e depois ajustar campos individuais
 */
export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: "hook-poderoso",
    name: "Hook Poderoso",
    description: "Imagem de alto impacto para capturar atenção imediata",
    icon: "⚡",
    defaults: {
      shotType: "close-up",
      lighting: "dramatic",
      colorPalette: "vibrant",
      photoStyle: "bold",
      mood: "intense, powerful, commanding attention",
    },
  },
  {
    id: "lifestyle-aspiracional",
    name: "Lifestyle Aspiracional",
    description: "Cenas do dia-a-dia que inspiram e conectam",
    icon: "✨",
    defaults: {
      shotType: "medium",
      lighting: "golden-hour",
      colorPalette: "warm",
      photoStyle: "lifestyle",
      mood: "aspirational, successful, relatable",
    },
  },
  {
    id: "profissional-confiavel",
    name: "Profissional Confiável",
    description: "Imagem clean para posicionamento profissional",
    icon: "💼",
    defaults: {
      shotType: "medium",
      lighting: "studio",
      colorPalette: "cool",
      photoStyle: "corporate",
      mood: "trustworthy, professional, competent",
    },
  },
  {
    id: "minimalista-elegante",
    name: "Minimalista Elegante",
    description: "Menos é mais - foco total no essencial",
    icon: "◻️",
    defaults: {
      shotType: "detail",
      lighting: "soft",
      colorPalette: "muted",
      photoStyle: "minimal",
      mood: "calm, sophisticated, intentional",
    },
  },
  {
    id: "stories-dinamico",
    name: "Stories Dinâmico",
    description: "Vertical, vibrante, feito para Stories e Reels",
    icon: "📱",
    defaults: {
      aspectRatio: "9:16",
      shotType: "medium",
      lighting: "natural",
      colorPalette: "vibrant",
      photoStyle: "candid",
      mood: "energetic, authentic, in-the-moment",
    },
  },
  {
    id: "flatlay-produtos",
    name: "Flat Lay Produtos",
    description: "Vista de cima para mostrar produtos ou objetos",
    icon: "🎯",
    defaults: {
      shotType: "overhead",
      lighting: "soft",
      colorPalette: "pastel",
      photoStyle: "minimal",
      mood: "organized, aesthetic, curated",
    },
  },
];

/**
 * Retorna um preset pelo ID
 */
export function getPresetById(id: string): ImagePreset | undefined {
  return IMAGE_PRESETS.find((preset) => preset.id === id);
}

/**
 * Aplica um preset aos campos, mesclando com valores existentes
 */
export function applyPreset(
  currentFields: Partial<ImagePromptFields>,
  presetId: string
): Partial<ImagePromptFields> {
  const preset = getPresetById(presetId);
  if (!preset) return currentFields;
  
  return {
    ...currentFields,
    ...preset.defaults,
  };
}
```

---

## Componente React da UI

```tsx
// components/image-generator/image-prompt-form.tsx

"use client";

import { useState, useMemo } from "react";
import { ImagePromptFields, BuiltPrompt } from "@/types/image-generation";
import { buildPrompt, validateFields } from "@/lib/image-generation/build-prompt";
import { IMAGE_PRESETS, applyPreset } from "@/lib/image-generation/presets";

// ═══════════════════════════════════════════════════════════════
// OPÇÕES PARA OS SELECTS
// ═══════════════════════════════════════════════════════════════

const SHOT_TYPE_OPTIONS = [
  { value: "close-up", label: "Close-up (rosto)", icon: "👤" },
  { value: "medium", label: "Médio (cintura pra cima)", icon: "🧍" },
  { value: "wide", label: "Aberto (corpo inteiro + ambiente)", icon: "🏞️" },
  { value: "detail", label: "Detalhe (macro)", icon: "🔍" },
  { value: "overhead", label: "Vista de cima (flat lay)", icon: "⬇️" },
] as const;

const LIGHTING_OPTIONS = [
  { value: "natural", label: "Natural", icon: "☀️" },
  { value: "studio", label: "Estúdio", icon: "💡" },
  { value: "golden-hour", label: "Golden Hour", icon: "🌅" },
  { value: "dramatic", label: "Dramática", icon: "🎭" },
  { value: "soft", label: "Suave", icon: "☁️" },
  { value: "neon", label: "Neon", icon: "💜" },
] as const;

const COLOR_PALETTE_OPTIONS = [
  { value: "warm", label: "Quente", icon: "🔥" },
  { value: "cool", label: "Fria", icon: "❄️" },
  { value: "vibrant", label: "Vibrante", icon: "🌈" },
  { value: "muted", label: "Suave", icon: "🌫️" },
  { value: "pastel", label: "Pastel", icon: "🍬" },
  { value: "dark", label: "Escura", icon: "🌑" },
  { value: "b&w", label: "P&B", icon: "⚫" },
] as const;

const PHOTO_STYLE_OPTIONS = [
  { value: "editorial", label: "Editorial", icon: "📰" },
  { value: "lifestyle", label: "Lifestyle", icon: "🌿" },
  { value: "corporate", label: "Corporativo", icon: "💼" },
  { value: "candid", label: "Espontâneo", icon: "📸" },
  { value: "artistic", label: "Artístico", icon: "🎨" },
  { value: "minimal", label: "Minimalista", icon: "◻️" },
  { value: "bold", label: "Bold/Impacto", icon: "⚡" },
] as const;

const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "1:1 Quadrado", icon: "⬜" },
  { value: "4:5", label: "4:5 Feed", icon: "📱" },
  { value: "9:16", label: "9:16 Stories", icon: "📲" },
  { value: "16:9", label: "16:9 Paisagem", icon: "🖼️" },
] as const;

const TEXT_STYLE_OPTIONS = [
  { value: "bold-sans", label: "Bold Sans (moderno)" },
  { value: "elegant-serif", label: "Serif Elegante" },
  { value: "handwritten", label: "Manuscrito" },
  { value: "minimal", label: "Minimalista" },
] as const;

const TEXT_PLACEMENT_OPTIONS = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Rodapé" },
] as const;

// ═══════════════════════════════════════════════════════════════
// VALORES PADRÃO
// ═══════════════════════════════════════════════════════════════

const DEFAULT_VALUES: ImagePromptFields = {
  subject: "",
  setting: "",
  shotType: "medium",
  lighting: "natural",
  colorPalette: "warm",
  photoStyle: "lifestyle",
  aspectRatio: "4:5",
  includeText: false,
  textContent: "",
  textPlacement: "center",
  textStyle: "bold-sans",
  mood: "",
  avoidElements: "",
  additionalNotes: "",
};

// ═══════════════════════════════════════════════════════════════
// PROPS DO COMPONENTE
// ═══════════════════════════════════════════════════════════════

interface ImagePromptFormProps {
  onGenerate: (builtPrompt: BuiltPrompt) => void;
  isLoading?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export function ImagePromptForm({ onGenerate, isLoading = false }: ImagePromptFormProps) {
  const [fields, setFields] = useState<ImagePromptFields>(DEFAULT_VALUES);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  // Constrói o prompt em tempo real para preview
  const builtPrompt = useMemo(() => {
    const validation = validateFields(fields);
    if (!validation.valid) return null;
    return buildPrompt(fields);
  }, [fields]);
  
  const validation = useMemo(() => validateFields(fields), [fields]);
  
  // Atualiza um campo específico
  const updateField = <K extends keyof ImagePromptFields>(
    key: K,
    value: ImagePromptFields[K]
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSelectedPreset(null); // Limpa preset se usuário modificar manualmente
  };
  
  // Aplica um preset
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setFields((prev) => ({
      ...prev,
      ...applyPreset(prev, presetId),
    }));
  };
  
  // Submete o formulário
  const handleSubmit = () => {
    if (!builtPrompt) return;
    onGenerate(builtPrompt);
  };
  
  return (
    <div className="space-y-6 p-4">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PRESETS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <label className="block text-sm font-medium mb-2">
          ⚡ Começar com um preset (opcional)
        </label>
        <div className="flex flex-wrap gap-2">
          {IMAGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                selectedPreset === preset.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {preset.icon} {preset.name}
            </button>
          ))}
        </div>
        {selectedPreset && (
          <p className="text-xs text-muted-foreground mt-1">
            {IMAGE_PRESETS.find((p) => p.id === selectedPreset)?.description}
          </p>
        )}
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CAMPOS OBRIGATÓRIOS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            O que aparece na imagem? *
          </label>
          <input
            type="text"
            value={fields.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            placeholder="Ex: mulher empreendedora trabalhando no laptop"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Cenário / Ambiente *
          </label>
          <input
            type="text"
            value={fields.setting}
            onChange={(e) => updateField("setting", e.target.value)}
            placeholder="Ex: café moderno com plantas"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CAMPOS VISUAIS - GRID */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4">
        {/* Enquadramento */}
        <div>
          <label className="block text-sm font-medium mb-1">📷 Enquadramento</label>
          <select
            value={fields.shotType}
            onChange={(e) => updateField("shotType", e.target.value as any)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {SHOT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Iluminação */}
        <div>
          <label className="block text-sm font-medium mb-1">💡 Iluminação</label>
          <select
            value={fields.lighting}
            onChange={(e) => updateField("lighting", e.target.value as any)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {LIGHTING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Paleta de cores */}
        <div>
          <label className="block text-sm font-medium mb-1">🎨 Paleta de Cores</label>
          <select
            value={fields.colorPalette}
            onChange={(e) => updateField("colorPalette", e.target.value as any)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {COLOR_PALETTE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Estilo */}
        <div>
          <label className="block text-sm font-medium mb-1">📸 Estilo</label>
          <select
            value={fields.photoStyle}
            onChange={(e) => updateField("photoStyle", e.target.value as any)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {PHOTO_STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FORMATO */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <label className="block text-sm font-medium mb-2">📐 Formato</label>
        <div className="flex gap-2">
          {ASPECT_RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField("aspectRatio", opt.value)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                fields.aspectRatio === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TEXTO NA IMAGEM */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeText"
            checked={fields.includeText}
            onChange={(e) => updateField("includeText", e.target.checked)}
            className="rounded"
          />
          <label htmlFor="includeText" className="text-sm font-medium">
            ✏️ Adicionar texto na imagem
          </label>
        </div>
        
        {fields.includeText && (
          <div className="pl-6 space-y-3 border-l-2 border-primary/20">
            <div>
              <label className="block text-sm font-medium mb-1">Texto</label>
              <input
                type="text"
                value={fields.textContent || ""}
                onChange={(e) => updateField("textContent", e.target.value)}
                placeholder="Ex: Comece hoje"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Posição</label>
                <select
                  value={fields.textPlacement || "center"}
                  onChange={(e) => updateField("textPlacement", e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {TEXT_PLACEMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Estilo do texto</label>
                <select
                  value={fields.textStyle || "bold-sans"}
                  onChange={(e) => updateField("textStyle", e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {TEXT_STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* OPÇÕES AVANÇADAS (collapsed) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {showAdvanced ? "▼" : "▶"} Opções avançadas
        </button>
        
        {showAdvanced && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
            <div>
              <label className="block text-sm font-medium mb-1">
                Humor / Sentimento
              </label>
              <input
                type="text"
                value={fields.mood || ""}
                onChange={(e) => updateField("mood", e.target.value)}
                placeholder="Ex: confiante e determinada"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Elementos para evitar
              </label>
              <input
                type="text"
                value={fields.avoidElements || ""}
                onChange={(e) => updateField("avoidElements", e.target.value)}
                placeholder="Ex: sem pessoas ao fundo, sem logos"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Notas adicionais
              </label>
              <textarea
                value={fields.additionalNotes || ""}
                onChange={(e) => updateField("additionalNotes", e.target.value)}
                placeholder="Ex: estilo similar a fotos da Forbes"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg resize-none"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PREVIEW DO PROMPT */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {builtPrompt && (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">👁️ Preview do prompt</span>
            <span className="text-xs text-muted-foreground">
              ({builtPrompt.prompt.split(" ").length} palavras)
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">
            {builtPrompt.prompt}
          </p>
        </div>
      )}
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ERROS DE VALIDAÇÃO */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {!validation.valid && validation.errors.length > 0 && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3">
          <ul className="text-sm space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BOTÃO DE GERAR */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!validation.valid || isLoading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
      >
        {isLoading ? "⏳ Gerando..." : "✨ Gerar Imagem"}
      </button>
    </div>
  );
}
```

---

## Integração com API Existente

```typescript
// app/api/studio/generate-image/route.ts

import { buildPrompt } from "@/lib/image-generation/build-prompt";
import { ImagePromptFields } from "@/types/image-generation";

export async function POST(request: Request) {
  const body = await request.json();
  
  // ═══════════════════════════════════════════════════════════════
  // DETECTAR MODO DE OPERAÇÃO
  // ═══════════════════════════════════════════════════════════════
  
  // Modo 1: Campos modulares (novo sistema)
  if (body.fields && typeof body.fields === "object") {
    const fields = body.fields as ImagePromptFields;
    const { prompt, negativePrompt } = buildPrompt(fields);
    
    // Chama o modelo de imagem diretamente
    const imageResult = await generateImageWithModel({
      prompt,
      negativePrompt,
      aspectRatio: fields.aspectRatio,
      model: body.model || "google/gemini-3-pro-image-preview",
    });
    
    return Response.json(imageResult);
  }
  
  // Modo 2: Prompt direto (compatibilidade com sistema antigo)
  if (body.prompt && typeof body.prompt === "string") {
    // Mantém comportamento existente para não quebrar nada
    const directPrompt = body.directPrompt !== false;
    
    if (directPrompt) {
      // Modo direto simples
      const styleHints = getStyleHints(body.style || "realistic");
      const enhancedPrompt = `${body.prompt}. ${styleHints}. High quality, professional photography.`;
      
      const imageResult = await generateImageWithModel({
        prompt: enhancedPrompt,
        model: body.model || "google/gemini-3-pro-image-preview",
      });
      
      return Response.json(imageResult);
    } else {
      // Modo tribal (legado - manter para carrosséis existentes)
      // ... código existente ...
    }
  }
  
  return Response.json({ error: "Invalid request body" }, { status: 400 });
}
```

---

## Exemplos de Prompts Gerados

### Exemplo 1: Básico

**Input:**
```json
{
  "subject": "mulher empreendedora trabalhando no laptop",
  "setting": "café moderno com plantas",
  "shotType": "medium",
  "lighting": "natural",
  "colorPalette": "warm",
  "photoStyle": "lifestyle",
  "aspectRatio": "4:5",
  "includeText": false
}
```

**Output:**
```
mulher empreendedora trabalhando no laptop, set in café moderno com plantas. medium shot, waist up, showing upper body and environment. natural daylight, soft window light. lifestyle photography, authentic and relatable moments. warm color palette, oranges, yellows, and earth tones. portrait 4:5 aspect ratio, optimized for Instagram feed. scroll-stopping visual optimized for Instagram. high quality, sharp focus, professional photography.
```

### Exemplo 2: Com texto e mood

**Input:**
```json
{
  "subject": "mãos femininas segurando um celular",
  "setting": "mesa de madeira com café e notebook",
  "shotType": "detail",
  "lighting": "soft",
  "colorPalette": "muted",
  "photoStyle": "minimal",
  "aspectRatio": "1:1",
  "includeText": true,
  "textContent": "Sua rotina importa",
  "textPlacement": "bottom",
  "textStyle": "elegant-serif",
  "mood": "calmo e intencional"
}
```

**Output:**
```
mãos femininas segurando um celular, set in mesa de madeira com café e notebook. detail shot, macro focus on specific element. soft diffused lighting, minimal shadows. minimalist photography, clean backgrounds, single focus point. muted desaturated tones, soft and understated. conveying a calmo e intencional mood and atmosphere. with text overlay saying "Sua rotina importa" positioned at the bottom of the image, elegant serif typography, sophisticated and classic. square 1:1 aspect ratio. scroll-stopping visual optimized for Instagram. high quality, sharp focus, professional photography.
```

### Exemplo 3: Hook de impacto

**Input (usando preset "hook-poderoso"):**
```json
{
  "subject": "olhar direto para câmera, expressão confiante",
  "setting": "fundo escuro minimalista",
  "shotType": "close-up",
  "lighting": "dramatic",
  "colorPalette": "vibrant",
  "photoStyle": "bold",
  "aspectRatio": "4:5",
  "includeText": false,
  "mood": "intense, powerful, commanding attention"
}
```

**Output:**
```
olhar direto para câmera, expressão confiante, set in fundo escuro minimalista. close-up portrait shot, face and shoulders visible. dramatic lighting, strong contrast, defined shadows. bold graphic style, strong shapes and high impact visuals. vibrant saturated colors, bold and eye-catching. conveying a intense, powerful, commanding attention mood and atmosphere. portrait 4:5 aspect ratio, optimized for Instagram feed. scroll-stopping visual optimized for Instagram. high quality, sharp focus, professional photography.
```

---

## Checklist de Implementação

- [ ] Criar arquivo `types/image-generation.ts` com os tipos
- [ ] Criar arquivo `lib/image-generation/build-prompt.ts` com a função de build
- [ ] Criar arquivo `lib/image-generation/presets.ts` com os presets
- [ ] Criar componente `components/image-generator/image-prompt-form.tsx`
- [ ] Atualizar `app/api/studio/generate-image/route.ts` para aceitar o novo formato
- [ ] Integrar o novo componente na UI existente do Studio
- [ ] Testar com diferentes combinações de campos
- [ ] Manter compatibilidade com chamadas antigas (modo direto e tribal)

---

## Notas Importantes

1. **O prompt negativo é importante** - ele evita elementos indesejados como blur, watermarks, etc.

2. **O preview em tempo real** ajuda o usuário a entender o que está sendo gerado antes de gastar créditos/tokens.

3. **Os presets são atalhos** - o usuário pode começar com um preset e ajustar campos individuais depois.

4. **Mantemos compatibilidade** com o sistema antigo para não quebrar carrosséis existentes.

5. **Foco no Instagram** - todos os prompts incluem otimização para scroll-stopping e formatos adequados.