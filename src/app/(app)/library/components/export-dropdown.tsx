/**
 * Export Dropdown Component
 *
 * Dropdown menu for exporting library items in CSV, JSON, or ZIP formats.
 * Supports batch export (multiple selected items) and single item export.
 */

"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileJson, FileArchive, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

interface ExportDropdownProps {
  /** IDs of selected items for batch export */
  selectedIds?: number[]
  /** Single item ID for individual export */
  itemId?: number
  /** Variant for styling */
  variant?: "default" | "ghost" | "outline"
  /** Size */
  size?: "default" | "sm" | "icon"
  /** Custom class name */
  className?: string
}

type ExportFormat = "csv" | "json" | "zip"

// ============================================================================
// COMPONENT
// ============================================================================

export function ExportDropdown({
  selectedIds,
  itemId,
  variant = "outline",
  size = "sm",
  className,
}: ExportDropdownProps) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null)

  const hasIds = (selectedIds && selectedIds.length > 0) || itemId

  async function handleExport(format: ExportFormat) {
    if (!hasIds) {
      toast.error("Nenhum item selecionado para exportar")
      return
    }

    setLoadingFormat(format)

    try {
      // Build query params
      const params = new URLSearchParams({ format })

      if (itemId) {
        params.set("ids", String(itemId))
      } else if (selectedIds && selectedIds.length > 0) {
        params.set("ids", selectedIds.join(","))
      }

      const response = await fetch(`/api/library/export?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro ao exportar" }))
        throw new Error(errorData.error || `Erro HTTP ${response.status}`)
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get("Content-Disposition")
      const filenameMatch = disposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `export.${format}`

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)

      const formatLabels: Record<ExportFormat, string> = {
        csv: "CSV",
        json: "JSON",
        zip: "ZIP",
      }
      toast.success(`Exportado como ${formatLabels[format]}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao exportar"
      toast.error(message)
    } finally {
      setLoadingFormat(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={!hasIds || loadingFormat !== null}
        >
          {loadingFormat ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#0f0f15] border-white/10"
      >
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={loadingFormat !== null}
          className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
        >
          {loadingFormat === "csv" ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />
          )}
          Exportar CSV
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("json")}
          disabled={loadingFormat !== null}
          className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
        >
          {loadingFormat === "json" ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileJson className="w-4 h-4 mr-2 text-blue-400" />
          )}
          Exportar JSON
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          onClick={() => handleExport("zip")}
          disabled={loadingFormat !== null}
          className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
        >
          {loadingFormat === "zip" ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileArchive className="w-4 h-4 mr-2 text-purple-400" />
          )}
          ZIP (Imagens)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
