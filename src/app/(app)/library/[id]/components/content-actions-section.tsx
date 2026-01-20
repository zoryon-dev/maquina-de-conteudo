/**
 * Content Actions Section
 *
 * Seção de ações e metadados (35% da largura).
 * Contém botões de ação, informações de origem e metadados.
 */

"use client"

import Link from "next/link"
import {
  Wand2,
  CalendarClock,
  Send,
  RefreshCw,
  Sparkles,
  Info,
  Hash,
  Clock,
  Calendar as CalendarIcon,
  FileText,
  MoreHorizontal,
  ImagePlus,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/format"
import type { LibraryItemWithRelations } from "@/types/library"
import { CONTENT_TYPE_CONFIGS } from "@/types/calendar"
import { clearMediaUrlAction } from "../../actions/library-actions"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

export interface ContentActionsSectionProps {
  item: LibraryItemWithRelations
  origin: string
  narrative: string | null
  wizardId: number | null
  hashtags: string[]
  metadata: Record<string, unknown>
  isRefreshing: boolean
  onRefresh: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ContentActionsSection({
  item,
  origin,
  narrative,
  wizardId,
  hashtags,
  metadata,
  isRefreshing,
  onRefresh,
}: ContentActionsSectionProps) {
  const typeConfig = CONTENT_TYPE_CONFIGS[item.type]

  // Handlers
  function handleSchedule(id: number) {
    console.log("Schedule post:", id)
  }

  function handlePublishNow(id: number) {
    console.log("Publish now:", id)
  }

  function handleRebuild(id: number) {
    console.log("Rebuild:", id)
  }

  async function handleGenerateImages(id: number) {
    try {
      toast.info("Gerando imagens... isso pode levar um momento.")
      const response = await fetch(`/api/library/${id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            method: "template",
            templateName: "dark-mode",
          },
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Imagem gerada com sucesso!")
        window.location.reload()
      } else {
        toast.error(result.error || "Erro ao gerar imagem")
      }
    } catch (error) {
      console.error("Error generating image:", error)
      toast.error("Erro ao gerar imagem")
    }
  }

  async function handleClearMedia(id: number) {
    if (!confirm("Tem certeza que deseja limpar as mídias? Isso não pode ser desfeito.")) {
      return
    }

    try {
      const result = await clearMediaUrlAction(id)

      if (result.success) {
        toast.success("Mídias limpas com sucesso!")
        window.location.reload()
      } else {
        toast.error(result.error || "Erro ao limpar mídias")
      }
    } catch (error) {
      console.error("Error clearing media:", error)
      toast.error("Erro ao limpar mídias")
    }
  }

  return (
    <div className="space-y-4">
      {/* Actions Card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Ações
        </h3>

        <div className="space-y-2">
          {/* Edit Post */}
          <Link href={`/library?edit=${item.id}`} className="block">
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Editar Post
            </Button>
          </Link>

          {/* Schedule Post */}
          <Button
            variant="outline"
            className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
            onClick={() => handleSchedule(item.id)}
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            Agendar Publicação
          </Button>

          {/* Publish Now */}
          <Button
            variant="outline"
            className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
            onClick={() => handlePublishNow(item.id)}
          >
            <Send className="w-4 h-4 mr-2" />
            Publicar Agora
          </Button>

          {/* Rebuild */}
          <Button
            variant="outline"
            className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
            onClick={() => handleRebuild(item.id)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Reconstruir
          </Button>

          {/* Generate Images */}
          {(item.type === "carousel" || item.type === "image") && (
            <Button
              variant="outline"
              className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
              onClick={() => handleGenerateImages(item.id)}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Gerar Imagens
            </Button>
          )}

          {/* Clear Invalid Media */}
          {item.mediaUrl && (
            <Button
              variant="outline"
              className="w-full justify-start border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10"
              onClick={() => handleClearMedia(item.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Mídia
            </Button>
          )}
        </div>
      </div>

      {/* Origin Card */}
      {(origin !== "Biblioteca" || narrative || wizardId) && (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
            <Info className="w-4 h-4 text-white/60" />
            Origem
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Criado via:</span>
              <span className="text-white/90">{formatOrigin(origin)}</span>
            </div>

            {narrative && (
              <div className="flex justify-between">
                <span className="text-white/60">Narrativa:</span>
                <span className="text-white/90">{formatNarrative(narrative)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-white/60">Data:</span>
              <span className="text-white/90">{formatDate(item.createdAt)}</span>
            </div>

            {wizardId && (
              <Link
                href={`/wizard?id=${wizardId}`}
                className="text-primary hover:text-primary/80 text-xs"
              >
                Ver no Wizard →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Hashtags Card */}
      {hashtags.length > 0 && (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
            <Hash className="w-4 h-4 text-white/60" />
            Hashtags
          </h3>

          <div className="flex flex-wrap gap-2">
            {hashtags.slice(0, 10).map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-primary/10 text-primary border-primary/30"
              >
                {tag}
              </Badge>
            ))}
            {hashtags.length > 10 && (
              <span className="text-xs text-white/40">+{hashtags.length - 10} mais</span>
            )}
          </div>
        </div>
      )}

      {/* Scheduled Posts */}
      {item.scheduledPosts.length > 0 && (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-white/60" />
            Agendado para
          </h3>

          <div className="space-y-2">
            {item.scheduledPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between text-sm p-2 bg-white/5 rounded-md"
              >
                <span className="text-white/90 capitalize">{post.platform}</span>
                {post.scheduledFor && (
                  <span className="text-white/60 text-xs">
                    {formatDate(new Date(post.scheduledFor))}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
          <FileText className="w-4 h-4 text-white/60" />
          Detalhes
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">Tipo:</span>
            <span className="text-white/90">{typeConfig.label}</span>
          </div>

          {item.updatedAt && (
            <div className="flex justify-between">
              <span className="text-white/60">Atualizado:</span>
              <span className="text-white/90">{formatDate(item.updatedAt)}</span>
            </div>
          )}

          {item.scheduledFor && (
            <div className="flex justify-between">
              <span className="text-white/60">Agendado:</span>
              <span className="text-white/90">{formatDate(item.scheduledFor)}</span>
            </div>
          )}

          {item.publishedAt && (
            <div className="flex justify-between">
              <span className="text-white/60">Publicado:</span>
              <span className="text-white/90">{formatDate(item.publishedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* More Options */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white/60"
        >
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatOrigin(origin: string): string {
  const originMap: Record<string, string> = {
    "Biblioteca": "Upload Manual",
    "Wizard": "Wizard de Criação",
    "Chat": "Chat com IA",
    "API": "Integração",
  }
  return originMap[origin] || origin
}

function formatNarrative(narrative: string): string {
  const narrativeMap: Record<string, string> = {
    "criativo": "Criativo",
    "estrategico": "Estratégico",
    "dinamico": "Dinâmico",
    "inspirador": "Inspirador",
  }
  return narrativeMap[narrative] || narrative
}
