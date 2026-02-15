/**
 * Trash View Component
 *
 * Exibe itens deletados (lixeira) com opcoes de restaurar e excluir permanentemente.
 */

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Trash2,
  Undo2,
  AlertTriangle,
  Type,
  Image,
  Layers,
  Video,
  Camera,
  Clock,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"
import NextImage from "next/image"
import { cn } from "@/lib/utils"
import {
  getTrashItemsAction,
  restoreLibraryItemAction,
  restoreAllTrashAction,
  permanentDeleteLibraryItemAction,
  emptyTrashAction,
} from "../actions/library-actions"
import type { LibraryItemWithRelations } from "@/types/library"
import { CONTENT_TYPE_CONFIGS } from "@/types/calendar"

interface TrashViewProps {
  onTrashCountChange: (count: number) => void
}

const TYPE_ICONS: Record<string, typeof Type> = {
  text: Type,
  image: Image,
  carousel: Layers,
  video: Video,
  story: Camera,
}

/**
 * Calculate days since deletion and days until permanent deletion
 */
function getDeleteTimeInfo(deletedAt: Date | null): {
  daysSinceDelete: number
  daysUntilPermanent: number
  deletedAgoText: string
  permanentDeleteText: string
} {
  if (!deletedAt) {
    return {
      daysSinceDelete: 0,
      daysUntilPermanent: 30,
      deletedAgoText: "Agora",
      permanentDeleteText: "em 30 dias",
    }
  }

  const now = new Date()
  const deletedDate = typeof deletedAt === "string" ? new Date(deletedAt) : deletedAt
  const diffMs = now.getTime() - deletedDate.getTime()
  const daysSinceDelete = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const daysUntilPermanent = Math.max(0, 30 - daysSinceDelete)

  let deletedAgoText: string
  if (daysSinceDelete === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diffMs / (1000 * 60))
      deletedAgoText = minutes <= 1 ? "Agora" : `${minutes} minutos`
    } else {
      deletedAgoText = hours === 1 ? "1 hora" : `${hours} horas`
    }
  } else if (daysSinceDelete === 1) {
    deletedAgoText = "1 dia"
  } else {
    deletedAgoText = `${daysSinceDelete} dias`
  }

  let permanentDeleteText: string
  if (daysUntilPermanent === 0) {
    permanentDeleteText = "a qualquer momento"
  } else if (daysUntilPermanent === 1) {
    permanentDeleteText = "em 1 dia"
  } else {
    permanentDeleteText = `em ${daysUntilPermanent} dias`
  }

  return { daysSinceDelete, daysUntilPermanent, deletedAgoText, permanentDeleteText }
}

export function TrashView({ onTrashCountChange }: TrashViewProps) {
  const [items, setItems] = useState<LibraryItemWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 12

  // Dialog states
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchTrashItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getTrashItemsAction({ page, limit })
      setItems(result.items)
      setTotal(result.pagination.total)
      setTotalPages(result.pagination.totalPages)
      onTrashCountChange(result.pagination.total)
    } catch (error) {
      console.error("[TrashView] Error fetching trash items:", error)
      toast.error("Erro ao carregar itens da lixeira")
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, onTrashCountChange])

  useEffect(() => {
    fetchTrashItems()
  }, [fetchTrashItems])

  // Restore single item
  const handleRestore = async (id: number) => {
    setIsProcessing(true)
    try {
      const result = await restoreLibraryItemAction(id)
      if (result.success) {
        toast.success("Conteudo restaurado com sucesso")
        fetchTrashItems()
      } else {
        toast.error(result.error ?? "Erro ao restaurar conteudo")
      }
    } catch {
      toast.error("Erro ao restaurar conteudo")
    } finally {
      setIsProcessing(false)
    }
  }

  // Restore all items
  const handleRestoreAll = async () => {
    setIsProcessing(true)
    try {
      const result = await restoreAllTrashAction()
      if (result.success) {
        toast.success(`${result.count} ${result.count === 1 ? "conteudo restaurado" : "conteudos restaurados"} com sucesso`)
        fetchTrashItems()
      } else {
        toast.error(result.error ?? "Erro ao restaurar conteudos")
      }
    } catch {
      toast.error("Erro ao restaurar conteudos")
    } finally {
      setIsProcessing(false)
    }
  }

  // Permanent delete single item
  const handlePermanentDelete = (id: number) => {
    setItemToDelete(id)
    setPermanentDeleteDialogOpen(true)
  }

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return

    setIsProcessing(true)
    try {
      const result = await permanentDeleteLibraryItemAction(itemToDelete)
      if (result.success) {
        toast.success("Conteudo excluido permanentemente")
        fetchTrashItems()
      } else {
        toast.error(result.error ?? "Erro ao excluir conteudo")
      }
    } catch {
      toast.error("Erro ao excluir conteudo")
    } finally {
      setIsProcessing(false)
      setPermanentDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  // Empty trash
  const handleEmptyTrash = () => {
    setEmptyTrashDialogOpen(true)
  }

  const confirmEmptyTrash = async () => {
    setIsProcessing(true)
    try {
      const result = await emptyTrashAction()
      if (result.success) {
        toast.success(`${result.count} ${result.count === 1 ? "conteudo excluido" : "conteudos excluidos"} permanentemente`)
        fetchTrashItems()
      } else {
        toast.error(result.error ?? "Erro ao esvaziar lixeira")
      }
    } catch {
      toast.error("Erro ao esvaziar lixeira")
    } finally {
      setIsProcessing(false)
      setEmptyTrashDialogOpen(false)
    }
  }

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Loading state
  if (isLoading) {
    return <TrashLoadingState />
  }

  // Empty state
  if (items.length === 0) {
    return <TrashEmptyState />
  }

  return (
    <div className="space-y-4">
      {/* Top Bar: Actions */}
      <div className="flex items-center justify-between bg-white/[0.02] border border-white/10 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Trash2 className="w-4 h-4" />
          <span>
            {total} {total === 1 ? "item" : "itens"} na lixeira
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestoreAll}
            disabled={isProcessing}
            className="h-8 text-white/70 hover:text-white hover:bg-white/5"
          >
            <Undo2 className="w-4 h-4 mr-1.5" />
            Restaurar Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEmptyTrash}
            disabled={isProcessing}
            className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Esvaziar Lixeira
          </Button>
        </div>
      </div>

      {/* Grid of trash items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <TrashItemCard
            key={item.id}
            item={item}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            isProcessing={isProcessing}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle>Excluir permanentemente?</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              Esta acao nao pode ser desfeita. O conteudo sera excluido permanentemente
              e nao podera ser recuperado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setPermanentDeleteDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/5"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmPermanentDelete}
              variant="destructive"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Permanentemente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Trash Confirmation Dialog */}
      <Dialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <DialogTitle>Esvaziar lixeira?</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              Todos os {total} {total === 1 ? "item" : "itens"} na lixeira serao excluidos
              permanentemente. Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setEmptyTrashDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/5"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmEmptyTrash}
              variant="destructive"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Esvaziando...
                </>
              ) : (
                "Esvaziar Lixeira"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// TRASH ITEM CARD
// ============================================================================

interface TrashItemCardProps {
  item: LibraryItemWithRelations
  onRestore: (id: number) => void
  onPermanentDelete: (id: number) => void
  isProcessing: boolean
}

function TrashItemCard({ item, onRestore, onPermanentDelete, isProcessing }: TrashItemCardProps) {
  const typeConfig = CONTENT_TYPE_CONFIGS[item.type]
  const TypeIcon = TYPE_ICONS[item.type] || Type
  const { deletedAgoText, permanentDeleteText, daysUntilPermanent } = getDeleteTimeInfo(item.deletedAt)

  // Parse media URL for thumbnail
  const previewUrl = useMemo(() => {
    if (!item.mediaUrl) return null
    try {
      const parsed = typeof item.mediaUrl === "string" ? JSON.parse(item.mediaUrl) : item.mediaUrl
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
      if (typeof parsed === "string") return parsed
    } catch {
      return item.mediaUrl
    }
    return null
  }, [item.mediaUrl])

  return (
    <div
      className={cn(
        "group relative bg-white/[0.02] border rounded-lg overflow-hidden transition-all",
        daysUntilPermanent <= 3
          ? "border-red-500/30 bg-red-500/5"
          : daysUntilPermanent <= 7
            ? "border-yellow-500/20 bg-yellow-500/[0.02]"
            : "border-white/10 opacity-80 hover:opacity-100"
      )}
    >
      {/* Preview/Thumbnail */}
      <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden relative rounded-t-lg">
        {previewUrl ? (
          <NextImage
            src={previewUrl}
            alt=""
            fill
            className="object-cover opacity-60"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-white/15">
            <TypeIcon className="w-12 h-12" />
          </div>
        )}

        {/* Overlay with delete info */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-center px-3">
            <Trash2 className="w-5 h-5 text-white/40 mx-auto mb-1" />
            <p className="text-xs text-white/50">Na lixeira</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-medium text-white/70 text-sm line-clamp-2 min-h-[2.5em]">
          {item.title || "Sem titulo"}
        </h3>

        {/* Type Badge */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn("text-xs px-1.5 py-0 border-0", typeConfig.color)}
          >
            {typeConfig.label}
          </Badge>
          {item.category && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0 bg-white/5 border-white/10 text-white/50"
            >
              {item.category.name}
            </Badge>
          )}
        </div>

        {/* Delete Time Info */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Clock className="w-3 h-3" />
            <span>Deletado ha {deletedAgoText}</span>
          </div>
          <p className={cn(
            "text-xs",
            daysUntilPermanent <= 3 ? "text-red-400" :
            daysUntilPermanent <= 7 ? "text-yellow-400" :
            "text-white/30"
          )}>
            Exclusao permanente {permanentDeleteText}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRestore(item.id)}
            disabled={isProcessing}
            className="flex-1 h-8 text-xs text-primary hover:text-primary hover:bg-primary/10 border border-primary/20"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" />
            Restaurar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPermanentDelete(item.id)}
            disabled={isProcessing}
            className="flex-1 h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// LOADING STATE
// ============================================================================

function TrashLoadingState() {
  return (
    <div className="space-y-4">
      {/* Top bar skeleton */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg px-4 py-3">
        <div className="h-4 bg-white/5 rounded w-48 animate-pulse" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-3"
          >
            <div className="aspect-video bg-white/5 rounded-md animate-pulse" />
            <div className="h-4 bg-white/5 rounded animate-pulse" />
            <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 bg-white/5 rounded flex-1 animate-pulse" />
              <div className="h-8 bg-white/5 rounded flex-1 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function TrashEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
        <Trash2 className="w-10 h-10 text-white/20" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        Lixeira vazia
      </h3>
      <p className="text-sm text-white/60 max-w-md">
        Nenhum conteudo na lixeira. Itens excluidos da biblioteca aparecerao aqui
        e serao mantidos por 30 dias antes da exclusao permanente.
      </p>
    </div>
  )
}
