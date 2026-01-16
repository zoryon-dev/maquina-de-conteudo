/**
 * Models Section
 *
 * Configure default AI models for different use cases
 */

"use client"

import * as React from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModelSelector } from "@/components/chat/model-selector"
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL,
} from "@/lib/models"

/**
 * Models Section Props
 */
export interface ModelsSectionProps {
  onChange?: () => void
  className?: string
}

/**
 * Model Option Card
 */
interface ModelOptionCardProps {
  title: string
  description: string
  selectedModel: string
  onModelChange: (modelId: string) => void
  modelType: "text" | "image"
}

function ModelOptionCard({
  title,
  description,
  selectedModel,
  onModelChange,
  modelType,
}: ModelOptionCardProps) {
  const models = modelType === "text" ? TEXT_MODELS : IMAGE_MODELS
  const selectedModelData = models.find((m) => m.id === selectedModel)

  return (
    <div className="p-4 rounded-xl border bg-white/[0.02] hover:border-white/10 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white">{title}</h3>
            <div className="group/tooltip relative">
              <Info className="h-3.5 w-3.5 text-white/40 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1a2e] border border-white/10 rounded text-xs text-white/80 whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                Modelo usado quando nenhum outro for especificado
              </div>
            </div>
          </div>
          <p className="text-xs text-white/60">{description}</p>
          <p className="text-xs text-white/40">
            Atual: {selectedModelData?.name || "Nenhum"}
          </p>
        </div>

        <ModelSelector
          value={selectedModel}
          onValueChange={(modelId) => {
            onModelChange(modelId)
          }}
          modelType={modelType}
        />
      </div>
    </div>
  )
}

/**
 * Models Section Component
 */
export function ModelsSection({ onChange, className }: ModelsSectionProps) {
  const [defaultTextModel, setDefaultTextModel] = React.useState(
    DEFAULT_TEXT_MODEL.id
  )
  const [defaultImageModel, setDefaultImageModel] = React.useState(
    DEFAULT_IMAGE_MODEL.id
  )

  const handleTextModelChange = (modelId: string) => {
    setDefaultTextModel(modelId)
    onChange?.()
  }

  const handleImageModelChange = (modelId: string) => {
    setDefaultImageModel(modelId)
    onChange?.()
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-white">Modelos de IA</h2>
        <p className="text-sm text-white/60">
          Configure os modelos padrão para geração de conteúdo. Estes modelos
          serão usados quando nenhum modelo específico for selecionado.
        </p>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-white/90">
            O sistema seleciona automaticamente o melhor modelo para cada tarefa.
            Estas configurações são usadas apenas como fallback.
          </p>
        </div>
      </div>

      {/* Model Options */}
      <div className="space-y-3">
        <ModelOptionCard
          title="Modelo de Texto"
          description="Modelo padrão para geração de textos e posts"
          selectedModel={defaultTextModel}
          onModelChange={handleTextModelChange}
          modelType="text"
        />

        <ModelOptionCard
          title="Modelo de Imagem"
          description="Modelo padrão para geração de imagens"
          selectedModel={defaultImageModel}
          onModelChange={handleImageModelChange}
          modelType="image"
        />
      </div>

      {/* Advanced Settings (Future) */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-white/40">
          Configurações avançadas de embedding e processamento estarão
          disponíveis em breve.
        </p>
      </div>
    </div>
  )
}
