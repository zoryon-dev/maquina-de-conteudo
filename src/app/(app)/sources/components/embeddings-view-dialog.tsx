/**
 * Embeddings View Dialog
 *
 * Dialog for viewing the embeddings/chunks of a document.
 */

"use client"

import * as React from "react"
import { Database, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { ChunkViewer } from "@/components/embeddings"

interface EmbeddingsViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: {
    id: number
    title: string
    embedded: boolean
    chunksCount?: number | null
    embeddingModel: string | null
  }
}

export function EmbeddingsViewDialog({
  open,
  onOpenChange,
  document,
}: EmbeddingsViewDialogProps) {
  const [embeddings, setEmbeddings] = React.useState<Array<{
    chunkIndex: number | null
    chunkText: string | null
    startPos: number | null
    endPos: number | null
  }>>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && document.embedded) {
      fetchEmbeddings()
    }
  }, [open, document.id])

  const fetchEmbeddings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/documents/${document.id}/embeddings`)
      const data = await response.json()
      setEmbeddings(data)
    } catch (err) {
      setError("Falha ao carregar embeddings")
      toast.error("Erro ao carregar embeddings")
    } finally {
      setIsLoading(false)
    }
  }

  const chunks = React.useMemo(() => {
    return embeddings.map((emb) => ({
      index: emb.chunkIndex ?? 0,
      text: emb.chunkText || "",
      startPos: emb.startPos ?? undefined,
      endPos: emb.endPos ?? undefined,
    }))
  }, [embeddings])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Database className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white truncate pr-4">
                Embeddings - {document.title}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-1">
                {document.chunksCount && (
                  <span className="text-xs text-white/60">
                    {document.chunksCount} {document.chunksCount === 1 ? "chunk" : "chunks"}
                  </span>
                )}
                {document.embeddingModel && (
                  <>
                    <span className="text-white/20">•</span>
                    <span className="text-xs text-purple-400">
                      {document.embeddingModel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="text-white/60" />
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-white/60">Carregando embeddings...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
              <p className="text-red-400">{error}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchEmbeddings}
                className="mt-4 text-white/60 hover:text-white"
              >
                Tentar novamente
              </Button>
            </div>
          ) : !document.embedded || chunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Database className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/40">Este documento ainda não foi indexado</p>
            </div>
          ) : (
            <ChunkViewer chunks={chunks} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-xs text-white/40">
            {chunks.length} {chunks.length === 1 ? "chunk" : "chunks"} disponíveis
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
