/**
 * Import Dialog Component
 *
 * Multi-step dialog for importing library items from CSV or JSON files.
 * Step 1: File upload (drag & drop)
 * Step 2: Preview parsed data with validation errors
 * Step 3: Import progress and results
 */

"use client"

import { useState, useCallback, useRef } from "react"
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Loader2,
  FileUp,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parseCSV, parseJSON } from "@/lib/import/parsers"
import type { ParsedImportItem, ParseError } from "@/lib/import/parsers"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

type ImportStep = "upload" | "preview" | "importing" | "done"

interface ImportResult {
  imported: number
  errors?: Array<{ index: number; error: string }>
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [validItems, setValidItems] = useState<ParsedImportItem[]>([])
  const [parseErrors, setParseErrors] = useState<ParseError[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when dialog closes
  function handleOpenChange(value: boolean) {
    if (!value) {
      // Reset state after closing
      setTimeout(() => {
        setStep("upload")
        setFileName(null)
        setValidItems([])
        setParseErrors([])
        setImportProgress(0)
        setImportResult(null)
      }, 300)
    }
    onOpenChange(value)
  }

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase()

    if (!ext || !["csv", "json"].includes(ext)) {
      toast.error("Formato nao suportado. Use CSV ou JSON.")
      return
    }

    setFileName(file.name)

    try {
      const text = await file.text()

      const result = ext === "csv" ? parseCSV(text) : parseJSON(text)

      setValidItems(result.valid)
      setParseErrors(result.errors)
      setStep("preview")
    } catch (error) {
      toast.error("Erro ao ler arquivo")
      console.error("[Import] File read error:", error)
    }
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // ============================================================================
  // IMPORT EXECUTION
  // ============================================================================

  async function handleImport() {
    if (validItems.length === 0) return

    setStep("importing")
    setImportProgress(10)

    try {
      // Simulate incremental progress
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 5, 85))
      }, 200)

      const response = await fetch("/api/library/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: validItems }),
      })

      clearInterval(progressInterval)
      setImportProgress(95)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao importar")
      }

      setImportProgress(100)
      setImportResult({
        imported: result.imported,
        errors: result.errors,
      })

      setStep("done")

      if (result.imported > 0) {
        toast.success(`${result.imported} ${result.imported === 1 ? "item importado" : "itens importados"} com sucesso`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao importar"
      toast.error(message)
      setStep("preview")
    }
  }

  // ============================================================================
  // TEMPLATE DOWNLOAD
  // ============================================================================

  async function handleDownloadTemplate() {
    try {
      const response = await fetch("/api/library/import/template")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "template-importacao-biblioteca.csv"
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)
    } catch {
      toast.error("Erro ao baixar template")
    }
  }

  // ============================================================================
  // TYPE LABELS
  // ============================================================================

  const TYPE_LABELS: Record<string, string> = {
    text: "Texto",
    image: "Imagem",
    carousel: "Carrossel",
    video: "Video",
    story: "Story",
  }

  const STATUS_LABELS: Record<string, string> = {
    draft: "Rascunho",
    scheduled: "Agendado",
    published: "Publicado",
    archived: "Arquivado",
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importar Conteudo
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {step === "upload" && "Arraste um arquivo CSV ou JSON para importar conteudos para a biblioteca."}
            {step === "preview" && `${validItems.length} itens prontos para importar${parseErrors.length > 0 ? `, ${parseErrors.length} com erros` : ""}.`}
            {step === "importing" && "Importando conteudos..."}
            {step === "done" && "Importacao concluida."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-12 px-6 cursor-pointer transition-all",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-white/20 bg-white/[0.02]"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                isDragging ? "bg-primary/20" : "bg-white/5"
              )}>
                <FileUp className={cn(
                  "w-7 h-7",
                  isDragging ? "text-primary" : "text-white/40"
                )} />
              </div>
              <div className="text-center">
                <p className="text-sm text-white/70">
                  {isDragging
                    ? "Solte o arquivo aqui"
                    : "Arraste e solte seu arquivo aqui"}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Formatos aceitos: CSV, JSON
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {/* Quick actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white/50">CSV</span>
                <FileJson className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/50">JSON</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-primary hover:text-primary/80 hover:bg-primary/10 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Baixar Template CSV
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4 py-4">
            {/* File info */}
            <div className="flex items-center gap-2 text-sm text-white/60 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/10">
              {fileName?.endsWith(".csv") ? (
                <FileSpreadsheet className="w-4 h-4 text-green-400" />
              ) : (
                <FileJson className="w-4 h-4 text-blue-400" />
              )}
              <span className="truncate">{fileName}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-auto text-white/40 hover:text-white"
                onClick={() => {
                  setStep("upload")
                  setValidItems([])
                  setParseErrors([])
                  setFileName(null)
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white/80">{validItems.length} validos</span>
              </div>
              {parseErrors.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">{parseErrors.length} erros</span>
                </div>
              )}
            </div>

            {/* Preview Table */}
            {validItems.length > 0 && (
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/[0.04] sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">#</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Tipo</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Titulo</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Status</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Categoria</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {validItems.slice(0, 50).map((item, index) => (
                        <tr key={index} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-white/40">{index + 1}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] border-white/10 text-white/70"
                            >
                              {TYPE_LABELS[item.type] || item.type}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-white/80 max-w-[200px] truncate">
                            {item.title || "-"}
                          </td>
                          <td className="px-3 py-2 text-white/60">
                            {STATUS_LABELS[item.status] || item.status}
                          </td>
                          <td className="px-3 py-2 text-white/60">
                            {item.category || "-"}
                          </td>
                          <td className="px-3 py-2 text-white/60 max-w-[150px] truncate">
                            {item.tags.length > 0 ? item.tags.join(", ") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validItems.length > 50 && (
                  <div className="px-3 py-2 text-xs text-white/40 bg-white/[0.02] border-t border-white/5">
                    Mostrando 50 de {validItems.length} itens
                  </div>
                )}
              </div>
            )}

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <div className="border border-red-500/20 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
                  <span className="text-xs font-medium text-red-400">
                    Erros de validacao ({parseErrors.length})
                  </span>
                </div>
                <div className="max-h-[120px] overflow-y-auto divide-y divide-red-500/10">
                  {parseErrors.map((err, idx) => (
                    <div key={idx} className="px-3 py-1.5 text-xs text-red-300/80">
                      <span className="text-red-400 font-mono">Linha {err.line}:</span>{" "}
                      {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-white/70">
                Importando {validItems.length} {validItems.length === 1 ? "item" : "itens"}...
              </p>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-xs text-white/40">{importProgress}%</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-white">Importacao Concluida</h3>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Itens importados:</span>
                <span className="text-green-400 font-medium">{importResult.imported}</span>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Erros:</span>
                  <span className="text-red-400 font-medium">{importResult.errors.length}</span>
                </div>
              )}
            </div>

            {/* Import errors */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="border border-red-500/20 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
                  <span className="text-xs font-medium text-red-400">
                    Erros durante importacao
                  </span>
                </div>
                <div className="max-h-[120px] overflow-y-auto divide-y divide-red-500/10">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="px-3 py-1.5 text-xs text-red-300/80">
                      <span className="text-red-400 font-mono">Item {err.index + 1}:</span>{" "}
                      {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2">
          {step === "upload" && (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("upload")
                  setValidItems([])
                  setParseErrors([])
                  setFileName(null)
                }}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={validItems.length === 0}
                className="bg-primary text-black hover:bg-primary/90 min-w-[140px]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar {validItems.length} {validItems.length === 1 ? "item" : "itens"}
              </Button>
            </>
          )}

          {step === "done" && (
            <Button
              onClick={() => {
                handleOpenChange(false)
                onImportComplete?.()
              }}
              className="bg-primary text-black hover:bg-primary/90"
            >
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
