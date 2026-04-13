"use client"

import * as React from "react"
import { toast } from "sonner"
import { Loader2, RotateCcw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  listBrandVersionsAction,
  restoreBrandVersionAction,
  type BrandVersionRow,
} from "@/app/(app)/settings/actions/brand"

type Props = {
  brandId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestored: () => void
}

export function BrandVersionsDialog({
  brandId,
  open,
  onOpenChange,
  onRestored,
}: Props) {
  const [versions, setVersions] = React.useState<BrandVersionRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [restoringId, setRestoringId] = React.useState<number | null>(null)
  const [confirmingVersionId, setConfirmingVersionId] = React.useState<
    number | null
  >(null)

  const fetchVersions = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await listBrandVersionsAction(brandId)
      if (res.success) {
        setVersions(res.data)
      } else {
        toast.error(res.error || "Falha ao carregar versões")
        setVersions([])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [brandId])

  React.useEffect(() => {
    if (open) {
      void fetchVersions()
    } else {
      setVersions([])
      setRestoringId(null)
      setConfirmingVersionId(null)
    }
  }, [open, fetchVersions])

  const handleRestore = async (versionId: number) => {
    setConfirmingVersionId(null)
    setRestoringId(versionId)
    try {
      const res = await restoreBrandVersionAction(brandId, versionId)
      if (res.success) {
        toast.success("Versão restaurada")
        onRestored()
        onOpenChange(false)
      } else {
        toast.error(res.error || "Falha ao restaurar versão")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-white">
                Histórico de versões
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Cada edição gera um snapshot automático. Restaure uma versão
                anterior a qualquer momento — a versão atual será preservada.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => void fetchVersions()}
              disabled={loading}
              className="shrink-0 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Atualizando…" : "Atualizar"}
            </button>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-white/40" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="size-8 text-white/30 mb-3" />
              <p className="text-sm text-white/60">
                Nenhuma versão histórica
              </p>
              <p className="text-xs text-white/40 mt-1">
                Edite a marca para gerar o primeiro snapshot
              </p>
            </div>
          ) : (
            <ul className="space-y-2 py-1">
              {versions.map((v) => {
                const isRestoring = restoringId === v.id
                const isDisabled = restoringId !== null
                let formattedDate = v.createdAt
                try {
                  formattedDate = new Date(v.createdAt).toLocaleString("pt-BR")
                } catch {
                  console.warn(
                    "[brand-versions] invalid date format:",
                    v.createdAt
                  )
                }

                return (
                  <li
                    key={v.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Clock className="size-4 text-white/40 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-sm text-white/90 font-medium">
                          {formattedDate}
                        </div>
                        <div className="text-xs text-white/70 break-words">
                          {v.message ?? "(sem mensagem)"}
                        </div>
                        <div className="text-[11px] text-white/40">
                          por {v.createdBy ?? "—"}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmingVersionId(v.id)}
                      disabled={isDisabled}
                      className="shrink-0 border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] hover:text-white"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Restaurando…
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-3.5" />
                          Restaurar
                        </>
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={restoringId !== null}
            className="border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] hover:text-white"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={confirmingVersionId !== null}
      onOpenChange={(next) => {
        if (!next) setConfirmingVersionId(null)
      }}
    >
      <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Restaurar versão?</DialogTitle>
          <DialogDescription className="text-white/60">
            Restaurar esta versão? A versão atual será preservada como
            snapshot.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmingVersionId(null)}
            className="border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (confirmingVersionId !== null) {
                void handleRestore(confirmingVersionId)
              }
            }}
            className="gap-2"
          >
            <RotateCcw className="size-3.5" />
            Restaurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
