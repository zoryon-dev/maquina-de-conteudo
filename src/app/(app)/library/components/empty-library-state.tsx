/**
 * Empty Library State Component
 *
 * Estado vazio da biblioteca quando não há itens.
 */

"use client"

import { Library, FileText, Image, Layers, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyLibraryStateProps {
  hasActiveFilters: boolean
  onClearFilters: () => void
  onCreateNew: () => void
}

export function EmptyLibraryState({
  hasActiveFilters,
  onClearFilters,
  onCreateNew,
}: EmptyLibraryStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
          <Library className="w-10 h-10 text-white/20" />
        </div>

        {/* Floating type icons */}
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4 text-blue-400" />
        </div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <Image className="w-4 h-4 text-purple-400" />
        </div>
        <div className="absolute top-1/2 -right-8 w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center">
          <Layers className="w-4 h-4 text-pink-400" />
        </div>
        <div className="absolute top-1/2 -left-8 w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
          <Video className="w-4 h-4 text-red-400" />
        </div>
      </div>

      {/* Message */}
      {hasActiveFilters ? (
        <>
          <h3 className="text-lg font-medium text-white mb-2">
            Nenhum conteúdo encontrado
          </h3>
          <p className="text-sm text-white/60 mb-6 max-w-md">
            Nenhum conteúdo corresponde aos filtros selecionados. Tente ajustar
            os filtros ou criar um novo conteúdo.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={onClearFilters} variant="outline" size="sm">
              Limpar filtros
            </Button>
            <Button onClick={onCreateNew} className="bg-primary text-black hover:bg-primary/90" size="sm">
              Criar novo
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg font-medium text-white mb-2">
            Sua biblioteca está vazia
          </h3>
          <p className="text-sm text-white/60 mb-6 max-w-md">
            Comece a criar conteúdo para preencher sua biblioteca. Textos,
            imagens, carrosséis e muito mais.
          </p>
          <Button onClick={onCreateNew} className="bg-primary text-black hover:bg-primary/90" size="sm">
            Criar primeiro conteúdo
          </Button>
        </>
      )}

      {/* Feature hints */}
      {!hasActiveFilters && (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
          <FeatureHint
            icon={<FileText className="w-5 h-5" />}
            title="Textos"
            description="Posts de texto para qualquer rede social"
          />
          <FeatureHint
            icon={<Image className="w-5 h-5" />}
            title="Imagens"
            description="Imagens geradas por IA ou upload"
          />
          <FeatureHint
            icon={<Layers className="w-5 h-5" />}
            title="Carrosséis"
            description="Posts com múltiplos cards swipeáveis"
          />
        </div>
      )}
    </div>
  )
}

interface FeatureHintProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureHint({ icon, title, description }: FeatureHintProps) {
  return (
    <div className="text-left">
      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-white/40 mb-3">
        {icon}
      </div>
      <h4 className="text-sm font-medium text-white/80 mb-1">{title}</h4>
      <p className="text-xs text-white/40">{description}</p>
    </div>
  )
}
