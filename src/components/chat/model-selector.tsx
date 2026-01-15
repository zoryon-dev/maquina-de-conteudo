"use client"

import * as React from "react"
import { Cpu, Image as ImageIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  DEFAULT_TEXT_MODEL,
  formatModelId,
  type AIModel,
} from "@/lib/models"

interface ModelSelectorProps {
  /** Modelo selecionado */
  value?: string
  /** Callback quando modelo é alterado */
  onValueChange?: (modelId: string) => void
  /** Tipo de modelo para filtrar */
  modelType?: "text" | "image" | "both"
  /** ClassName adicional */
  className?: string
}

/**
 * ModelSelector - Seletor de modelos de IA
 *
 * Usa DropdownMenu do shadcn em sua composição original.
 * Sem ícones dentro do dropdown, mantendo o padrão visual da aplicação.
 */
export function ModelSelector({
  value = DEFAULT_TEXT_MODEL.id,
  onValueChange,
  modelType = "text",
  className,
}: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = React.useState<AIModel>(() => {
    const allModels = modelType === "image" ? IMAGE_MODELS : TEXT_MODELS
    return (
      allModels.find((m) => m.id === value) ||
      (modelType === "image" ? IMAGE_MODELS[0] : TEXT_MODELS[0])
    )
  })

  const handleSelectModel = (model: AIModel) => {
    setSelectedModel(model)
    onValueChange?.(model.id)
  }

  const modelsToShow =
    modelType === "both"
      ? { text: TEXT_MODELS, image: IMAGE_MODELS }
      : modelType === "image"
        ? { text: [], image: IMAGE_MODELS }
        : { text: TEXT_MODELS, image: [] }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group",
            "data-[state=open]:bg-primary/20 data-[state=open]:text-white/90",
            className
          )}
        >
          {selectedModel.type === "image" ? (
            <ImageIcon className="w-4 h-4" />
          ) : (
            <Cpu className="w-4 h-4" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#1a1a2e] border-white/10 text-white"
      >
        {/* Modelos de Texto */}
        {modelsToShow.text.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-white/50 text-xs font-normal py-2">
              Modelos de Texto
            </DropdownMenuLabel>
            {TEXT_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                className={cn(
                  "cursor-pointer",
                  selectedModel.id === model.id && "bg-primary/20"
                )}
                onClick={() => handleSelectModel(model)}
              >
                <span className="flex-1">{formatModelId(model.id)}</span>
                {selectedModel.id === model.id && (
                  <span className="text-primary ml-2">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        {/* Separator se tem ambos */}
        {modelsToShow.text.length > 0 && modelsToShow.image.length > 0 && (
          <DropdownMenuSeparator className="bg-white/10" />
        )}

        {/* Modelos de Imagem */}
        {modelsToShow.image.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-white/50 text-xs font-normal py-2">
              Modelos de Imagem
            </DropdownMenuLabel>
            {IMAGE_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                className={cn(
                  "cursor-pointer",
                  selectedModel.id === model.id && "bg-primary/20"
                )}
                onClick={() => handleSelectModel(model)}
              >
                <span className="flex-1">{formatModelId(model.id)}</span>
                {selectedModel.id === model.id && (
                  <span className="text-primary ml-2">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
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
