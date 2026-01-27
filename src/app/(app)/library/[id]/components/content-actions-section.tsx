/**
 * Content Actions Section
 *
 * Seção de ações e metadados (35% da largura).
 * Contém botões de ação, informações de origem e metadados.
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CalendarClock,
  Send,
  RefreshCw,
  Sparkles,
  Hash,
  Calendar as CalendarIcon,
  FileText,
  MoreHorizontal,
  ImagePlus,
  Trash2,
  Download,
  Film,
  Copy,
  Instagram,
  Facebook,
  Check,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"
import type { LibraryItemWithRelations } from "@/types/library"
import { CONTENT_TYPE_CONFIGS, STATUS_CONFIGS } from "@/types/calendar"
import { clearMediaUrlAction } from "../../actions/library-actions"
import { ScheduleDrawer } from "./schedule-drawer"
import { toast } from "sonner"
import {
  deserializeVideoMetadata,
  extractThumbnailUrl,
  extractYouTubeHashtags,
  extractYouTubeTags,
  extractYouTubeTitle,
} from "@/types/library-video"
import type { VideoLibraryMetadata } from "@/types/library-video"
import { isVideoScriptStructured } from "@/components/library/video-script-viewer"
import type { VideoScriptStructured } from "@/lib/wizard-services/types"

// ============================================================================
// TYPES
// ============================================================================

export interface ContentActionsSectionProps {
  item: LibraryItemWithRelations
  origin?: string
  narrative?: string | null
  wizardId?: number | null
  hashtags: string[]
  metadata?: Record<string, unknown>
  isRefreshing: boolean
  onRefresh: () => void
}

interface Platform {
  id: "instagram" | "facebook"
  name: string
  icon: typeof Instagram
  color: string
}

const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-500" },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function ContentActionsSection({
  item,
  wizardId,
  hashtags,
  isRefreshing,
  onRefresh,
}: ContentActionsSectionProps) {
  const typeConfig = CONTENT_TYPE_CONFIGS[item.type]
  const statusConfig = STATUS_CONFIGS[item.status]
  const parseJsonObject = (value: string): Record<string, unknown> | null => {
    const safeParse = (input: string): unknown => {
      try {
        return JSON.parse(input)
      } catch {
        if (input.trim().startsWith("{")) {
          try {
            const normalized = input.replace(/\r?\n/g, "\\n")
            return JSON.parse(normalized)
          } catch {
            return null
          }
        }
        return null
      }
    }

    let current: unknown = value
    for (let i = 0; i < 3; i += 1) {
      if (typeof current !== "string") {
        return current && typeof current === "object"
          ? (current as Record<string, unknown>)
          : null
      }
      const parsed = safeParse(current)
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>
      }
      if (typeof parsed === "string") {
        current = parsed
        continue
      }
      return null
    }
    return null
  }

  const videoMetadata: VideoLibraryMetadata | null =
    item.metadata
      ? deserializeVideoMetadata(
          typeof item.metadata === "string"
            ? item.metadata
            : JSON.stringify(item.metadata)
        )
      : null

  const videoThumbnailUrl = videoMetadata ? extractThumbnailUrl(videoMetadata) : undefined
  const seoTitle = videoMetadata ? extractYouTubeTitle(videoMetadata) : undefined
  const seoHashtags = videoMetadata ? extractYouTubeHashtags(videoMetadata) : []
  const seoTags = videoMetadata ? extractYouTubeTags(videoMetadata) : []
  const seoDescription =
    videoMetadata?.youtubeSEO?.descricao?.corpo_completo ||
    videoMetadata?.youtubeSEO?.descricao?.above_the_fold

  const parsedVideoContent = item.content ? parseJsonObject(item.content) : null
  const hasVideoShape = Boolean(
    parsedVideoContent &&
      "meta" in parsedVideoContent &&
      "thumbnail" in parsedVideoContent &&
      "roteiro" in parsedVideoContent
  )
  const hasVideoShapeFromText = typeof item.content === "string" &&
    /"meta"\s*:\s*\{/.test(item.content) &&
    /"roteiro"\s*:\s*\{/.test(item.content)

  const isVideo =
    item.type === "video" ||
    hasVideoShape ||
    hasVideoShapeFromText ||
    Boolean(videoMetadata?.youtubeSEO || videoMetadata?.thumbnail || videoMetadata?.script)

  const structuredScript: VideoScriptStructured | null = (() => {
    if (!parsedVideoContent) return null
    if (isVideoScriptStructured(parsedVideoContent)) {
      return parsedVideoContent
    }
    const nestedScript = parsedVideoContent.script
    if (isVideoScriptStructured(nestedScript as Record<string, unknown>)) {
      return nestedScript as VideoScriptStructured
    }
    if (typeof nestedScript === "string") {
      const parsedNested = parseJsonObject(nestedScript)
      return parsedNested && isVideoScriptStructured(parsedNested)
        ? (parsedNested as VideoScriptStructured)
        : null
    }
    return null
  })()

  const scriptText = (() => {
    if (structuredScript) return JSON.stringify(structuredScript, null, 2)
    if (typeof parsedVideoContent?.script === "string") return parsedVideoContent.script
    if (typeof parsedVideoContent?.caption === "string") return parsedVideoContent.caption
    return null
  })()

  // Schedule drawer state
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false)

  // Publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "facebook">("instagram")
  const [publishCaption, setPublishCaption] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishItemId, setPublishItemId] = useState<number | null>(null)

  // Rebuild state - SEPARATE from isRefreshing to avoid confusion
  // isRefreshing is for data refresh, isRebuilding is for rebuild API call
  const [isRebuilding, setIsRebuilding] = useState(false)

  // Extract caption for scheduling
  const caption = (() => {
    if (!item.content) return null
    try {
      const parsed = JSON.parse(item.content)
      return parsed.caption || item.content
    } catch {
      return item.content
    }
  })()

  // Handlers
  function handleSchedule(id: number) {
    setScheduleDrawerOpen(true)
  }

  function handlePublishNow(id: number) {
    setPublishItemId(id)
    setPublishDialogOpen(true)
    // Reset to default platform and caption
    setSelectedPlatform("instagram")
    setPublishCaption(caption || "")
  }

  async function handleConfirmPublish() {
    if (!publishItemId) return

    setIsPublishing(true)

    try {
      const response = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryItemId: publishItemId,
          platform: selectedPlatform,
          caption: publishCaption || undefined,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Handle queued (async) publishing - new behavior
        if (result.queued) {
          toast.success(`Publicação enfileirada para ${selectedPlatform === "instagram" ? "Instagram" : "Facebook"}!`, {
            description: "A publicação está sendo processada em segundo plano. Você será notificado quando concluída.",
            duration: 5000,
          })
          setPublishDialogOpen(false)
          console.log("[ContentActionsSection] Publish queued successfully, calling onRefresh()")
          onRefresh()
        } else {
          // Handle immediate (synchronous) publishing - legacy support
          toast.success(`Publicado no ${selectedPlatform === "instagram" ? "Instagram" : "Facebook"}!`, {
            description: result.platformPostUrl ? (
              <a
                href={result.platformPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Ver publicação
              </a>
            ) : undefined,
          })
          setPublishDialogOpen(false)
          console.log("[ContentActionsSection] Publish successful (immediate), calling onRefresh()")
          onRefresh()
        }
      } else {
        // Handle token expired error with helpful message
        if (result.code === "TOKEN_EXPIRED") {
          toast.error(result.error || "Sessão expirada", {
            description: (
              <div className="flex flex-col gap-2">
                <span>Vá em Configurações &gt; Redes Sociais e reconecte sua conta.</span>
                <a
                  href="/settings?tab=social"
                  className="text-primary underline hover:text-primary/80"
                >
                  Ir para Configurações →
                </a>
              </div>
            ),
            duration: 8000,
          })
          setPublishDialogOpen(false)
          console.log("[ContentActionsSection] Token expired, calling onRefresh() to update connection status")
          onRefresh() // Refresh to update connection status
        } else {
          toast.error(result.error || "Erro ao publicar")
        }
      }
    } catch (error) {
      console.error("Error publishing:", error)
      toast.error("Erro ao publicar. Tente novamente.")
    } finally {
      setIsPublishing(false)
    }
  }

  async function handleRebuild(id: number) {
    console.log("[ContentActionsSection] Rebuild button clicked for item:", id)
    setIsRebuilding(true)

    try {
      toast.info("Reconstruindo conteúdo...")
      const response = await fetch(`/api/library/${id}/regenerate-images`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Conteúdo reconstruído!")
        console.log("[ContentActionsSection] Rebuild successful, calling onRefresh()")
        onRefresh()
      } else {
        toast.error("Erro ao reconstruir")
        console.error("[ContentActionsSection] Rebuild API failed:", response.status)
      }
    } catch (error) {
      console.error("[ContentActionsSection] Error rebuilding:", error)
      toast.error("Erro ao reconstruir")
    } finally {
      setIsRebuilding(false)
    }
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

  async function handleDownloadThumbnail() {
    if (!videoThumbnailUrl) return
    try {
      const response = await fetch(videoThumbnailUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = videoThumbnailUrl.split("/").pop() || "thumbnail.jpg"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error("Erro ao baixar thumbnail")
    }
  }

  async function handleCopyText(text?: string, successMessage?: string) {
    if (!text) {
      toast.error("Nada para copiar")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage || "Copiado!")
    } catch {
      toast.error("Erro ao copiar")
    }
  }

  async function handleDownloadScript() {
    if (!scriptText) {
      toast.error("Roteiro indisponível")
      return
    }
    try {
      const blob = new Blob([scriptText], { type: "text/plain;charset=utf-8" })
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = `roteiro-${item.id}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error("Erro ao baixar roteiro")
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
          {isVideo ? (
            <>
              {wizardId && (
                <Link
                  href={`/wizard?type=video&wizardId=${wizardId}`}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Abrir no Wizard
                  </Button>
                </Link>
              )}

              <Button
                variant="outline"
                className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
                onClick={handleDownloadThumbnail}
                disabled={!videoThumbnailUrl}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Thumbnail
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-56 bg-[#0f0f15] border-white/10"
                >
                  <DropdownMenuItem
                    onClick={() => handleCopyText(seoTitle, "Título SEO copiado!")}
                    className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
                    disabled={!seoTitle}
                  >
                    Copiar Título
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyText(seoDescription, "Descrição copiada!")}
                    className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
                    disabled={!seoDescription}
                  >
                    Copiar Descrição
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyText(seoTags.join(", "), "Tags copiadas!")}
                    className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
                    disabled={seoTags.length === 0}
                  >
                    Copiar Tags
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyText(seoHashtags.join(" "), "Hashtags copiadas!")}
                    className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
                    disabled={seoHashtags.length === 0}
                  >
                    Copiar Hashtags
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyText(scriptText || undefined, "Roteiro copiado!")}
                    className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
                    disabled={!scriptText}
                  >
                    Copiar Roteiro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="w-full justify-start border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10"
                onClick={handleDownloadScript}
                disabled={!scriptText}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Roteiro
              </Button>

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
            </>
          ) : (
            <>
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
                disabled={isRebuilding}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRebuilding && "animate-spin")} />
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
            </>
          )}
        </div>
      </div>

      {/* Origin Card */}
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

          <div className="flex justify-between">
            <span className="text-white/60">Status:</span>
            <span className={cn("text-xs px-2 py-0.5 rounded", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/60">Criado em:</span>
            <span className="text-white/90">{formatDate(item.createdAt)}</span>
          </div>

          {item.updatedAt && item.updatedAt !== item.createdAt && (
            <div className="flex justify-between">
              <span className="text-white/60">Atualizado:</span>
              <span className="text-white/90">{formatDate(item.updatedAt)}</span>
            </div>
          )}

          {wizardId && (
            <Link
              href={isVideo ? `/wizard?type=video&wizardId=${wizardId}` : `/wizard?wizardId=${wizardId}`}
              className="text-primary hover:text-primary/80 text-xs block mt-2"
            >
              Ver no Wizard →
            </Link>
          )}
        </div>
      </div>

      {/* Hashtags Card */}
      {!isVideo && hashtags.length > 0 && (
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

      {/* Schedule Drawer */}
      <ScheduleDrawer
        open={scheduleDrawerOpen}
        onClose={() => setScheduleDrawerOpen(false)}
        libraryItemId={item.id}
        itemTitle={item.title}
        itemType={item.type}
        caption={caption}
      />

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Publicar Agora
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Selecione a plataforma para publicar este conteúdo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Platform Selection */}
            <div className="space-y-3">
              <Label className="text-white/70 text-sm">Plataforma</Label>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                        selectedPlatform === platform.id
                          ? "bg-primary/20 border-primary"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20"
                      )}
                    >
                      <Icon className={cn("w-6 h-6", platform.color)} />
                      <span className="text-sm text-white/90">{platform.name}</span>
                      {selectedPlatform === platform.id && (
                        <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">
                Legenda <span className="text-white/30">(opcional)</span>
              </Label>
              <Textarea
                value={publishCaption}
                onChange={(e) => setPublishCaption(e.target.value)}
                placeholder="Adicione uma legenda para esta publicação..."
                rows={4}
                className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 resize-none"
                maxLength={2200}
              />
              <p className="text-xs text-white/30 text-right">
                {publishCaption.length} / 2200 caracteres
              </p>
            </div>

            {/* Preview */}
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3 space-y-2">
              <div className="text-xs text-white/60">Preview</div>
              <div className="flex items-center gap-2">
                {selectedPlatform === "instagram" ? (
                  <Instagram className="w-4 h-4 text-pink-500" />
                ) : (
                  <Facebook className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-sm text-white/90">
                  {item.type === "carousel" ? "Carrossel" : item.type === "image" ? "Imagem" : "Post"}
                </span>
              </div>
              {item.title && (
                <div className="text-xs text-white/40 truncate">
                  "{item.title}"
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
              disabled={isPublishing}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPublish}
              disabled={isPublishing}
              className="bg-primary text-black hover:bg-primary/90 min-w-[120px]"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publicar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================
