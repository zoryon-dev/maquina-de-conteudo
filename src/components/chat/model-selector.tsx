/**
 * Model Selector Component
 *
 * Dropdown for selecting AI models with provider grouping.
 */

"use client"

import * as React from "react"
import { Cpu, ChevronDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { TEXT_MODELS, IMAGE_MODELS, DEFAULT_TEXT_MODEL, type AIModel } from "@/lib/models"

export interface ModelSelectorProps {
  value?: string
  onChange: (model: string) => void
  className?: string
  disabled?: boolean
  showModelName?: boolean
  modelType?: "text" | "image" | "both"
}

/**
 * ModelSelector - Seletor de modelos de IA
 *
 * Dropdown para escolher entre diferentes modelos de IA,
 * agrupados por provider (OpenAI, Anthropic, Google, etc.)
 */
export function ModelSelector({
  value = DEFAULT_TEXT_MODEL.id,
  onChange,
  className,
  disabled = false,
  showModelName = true,
  modelType = "text",
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false)

  // Get models to show based on type
  const getTextModels = () => TEXT_MODELS
  const getImageModels = () => IMAGE_MODELS

  const textModels = modelType === "image" ? [] : getTextModels()
  const imageModels = modelType === "text" ? [] : getImageModels()

  // Find current model
  const allModels = [...textModels, ...imageModels]
  const currentModel = allModels.find((m) => m.id === value) || textModels[0] || allModels[0]

  // Group by provider
  const groupModels = (models: AIModel[]) => {
    return models.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = []
      }
      acc[model.provider].push(model)
      return acc
    }, {} as Record<string, AIModel[]>)
  }

  const textByProvider = groupModels(textModels)
  const imageByProvider = groupModels(imageModels)

  const handleSelect = (modelId: string) => {
    onChange(modelId)
    setOpen(false)
  }

  const providerNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    "x-ai": "xAI",
    "black-forest-labs": "Black Forest",
    bytedance: "ByteDance",
    sourceful: "Sourceful",
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-lg",
          "bg-white/5 border border-white/10",
          "text-xs text-white/70 hover:text-white/90",
          "hover:bg-white/10 hover:border-white/20",
          "transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "data-[state=open]:bg-white/10 data-[state=open]:border-white/20",
          className
        )}
      >
        <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
        {showModelName && (
          <span className="truncate max-w-[120px]">{currentModel.name}</span>
        )}
        <ChevronDown className="w-3 h-3 text-white/40 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className={cn(
          "w-72 bg-[#1a1a2e] border-white/10",
          "max-h-[400px] overflow-y-auto"
        )}
      >
        {/* Text Models */}
        {Object.entries(textByProvider).map(([provider, models]) => (
          <div key={provider}>
            <DropdownMenuLabel className="text-white/40 text-xs uppercase tracking-wider py-2">
              {providerNames[provider] || provider}
            </DropdownMenuLabel>
            {models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={cn(
                  "flex items-center justify-between gap-2 py-2 px-3",
                  "text-white/70 hover:text-white hover:bg-white/5",
                  "cursor-pointer text-xs",
                  value === model.id && "bg-white/5 text-white"
                )}
              >
                <span>{model.name}</span>
                {value === model.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}

        {/* Separator */}
        {textModels.length > 0 && imageModels.length > 0 && (
          <DropdownMenuSeparator className="bg-white/10" />
        )}

        {/* Image Models */}
        {Object.entries(imageByProvider).map(([provider, models]) => (
          <div key={provider}>
            <DropdownMenuLabel className="text-white/40 text-xs uppercase tracking-wider py-2">
              {providerNames[provider] || provider}
            </DropdownMenuLabel>
            {models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={cn(
                  "flex items-center justify-between gap-2 py-2 px-3",
                  "text-white/70 hover:text-white hover:bg-white/5",
                  "cursor-pointer text-xs",
                  value === model.id && "bg-white/5 text-white"
                )}
              >
                <span>{model.name}</span>
                {value === model.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Hook para gerenciar modelo selecionado
 */
export function useModelSelector(defaultModel?: string) {
  const [selectedModel, setSelectedModel] = React.useState<string>(
    defaultModel || DEFAULT_TEXT_MODEL.id
  )

  const modelInfo = React.useMemo(() => {
    const allModels = [...TEXT_MODELS, ...IMAGE_MODELS]
    return allModels.find((m) => m.id === selectedModel)
  }, [selectedModel])

  return {
    selectedModel,
    setSelectedModel,
    modelInfo,
    isTextModel: modelInfo?.type === "text",
    isImageModel: modelInfo?.type === "image",
  }
}
