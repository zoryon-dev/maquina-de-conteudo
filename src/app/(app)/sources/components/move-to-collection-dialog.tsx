/**
 * Move to Collection Dialog
 *
 * Dialog for moving documents to collections.
 */

"use client"

import * as React from "react"
import { Folder, FolderPlus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  getRootCollectionsAction,
  addDocumentToCollectionAction,
  getDocumentCollectionsAction,
  removeDocumentFromCollectionAction,
  type DocumentCollectionWithCount,
} from "../actions/collections-actions"

interface MoveToCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentIds: number[]
  documentTitle?: string
  onSuccess?: () => void
}

export function MoveToCollectionDialog({
  open,
  onOpenChange,
  documentIds,
  documentTitle,
  onSuccess,
}: MoveToCollectionDialogProps) {
  const [collections, setCollections] = React.useState<DocumentCollectionWithCount[]>([])
  const [selectedCollections, setSelectedCollections] = React.useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const documentCount = documentIds.length
  const titleText = documentCount === 1 && documentTitle
    ? `"${documentTitle}"`
    : `${documentCount} ${documentCount === 1 ? "documento" : "documentos"}`

  // Fetch collections when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchCollections()
      fetchDocumentCollections()
    }
  }, [open, documentIds])

  const fetchCollections = async () => {
    setIsLoading(true)
    try {
      const data = await getRootCollectionsAction()
      setCollections(data)
    } catch (error) {
      console.error("Failed to fetch collections:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDocumentCollections = async () => {
    if (documentIds.length === 1) {
      try {
        const docCollections = await getDocumentCollectionsAction(documentIds[0])
        setSelectedCollections(new Set(docCollections.map((c) => c.id)))
      } catch (error) {
        console.error("Failed to fetch document collections:", error)
      }
    }
  }

  const toggleCollection = (collectionId: number) => {
    setSelectedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(collectionId)) {
        next.delete(collectionId)
      } else {
        next.add(collectionId)
      }
      return next
    })
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      // For each document, update its collections
      for (const documentId of documentIds) {
        // Get current collections for this document
        const currentCollections = await getDocumentCollectionsAction(documentId)
        const currentIds = new Set(currentCollections.map((c) => c.id))

        // Add to new collections
        for (const collectionId of selectedCollections) {
          if (!currentIds.has(collectionId)) {
            await addDocumentToCollectionAction(documentId, collectionId)
          }
        }

        // Remove from unselected collections
        for (const collection of currentCollections) {
          if (!selectedCollections.has(collection.id)) {
            await removeDocumentFromCollectionAction(documentId, collection.id)
          }
        }
      }

      toast.success(
        `${titleText} movido${documentCount === 1 ? "" : "s"} para ${selectedCollections.size} coleção${selectedCollections.size === 1 ? "" : "ões"}`
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast.error("Falha ao mover documentos")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            Mover para Coleção
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Selecione as coleções onde {titleText} será adicionado
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-xs text-white/40">Carregando coleções...</div>
            </div>
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FolderPlus className="h-8 w-8 text-white/20 mb-2" />
              <p className="text-xs text-white/40">Nenhuma coleção criada</p>
              <p className="text-xs text-white/30 mt-1">
                Crie uma coleção primeiro
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {collections.map((collection) => {
                const isSelected = selectedCollections.has(collection.id)
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => toggleCollection(collection.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                      isSelected
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-white/5 hover:bg-white/10 border border-transparent"
                    )}
                  >
                    <div
                      className="p-1.5 rounded"
                      style={{ color: collection.color || undefined }}
                    >
                      <Folder className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm text-left text-white/90">
                      {collection.name}
                    </span>
                    <span className="text-xs text-white/40">
                      {collection.itemCount}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-xs text-white/40">
            {selectedCollections.size} selecionada{selectedCollections.size === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || collections.length === 0}
              className="bg-primary text-[#0A0A0B] hover:bg-primary/90"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
