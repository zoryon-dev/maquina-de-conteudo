/**
 * Pagination Component
 *
 * Reusable pagination component with page numbers, prev/next buttons, and page size selector.
 */

"use client"

import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationProps {
  currentPage: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  isLoading?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  isLoading = false,
}: PaginationProps) {
  const startItem = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, total)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
      }
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Item count */}
      <div className="text-sm text-white/70">
        {total === 0
          ? "Nenhum item"
          : `Mostrando ${startItem}-${endItem} de ${total} item${total !== 1 ? "s" : ""}`
        }
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-2">
        {/* First page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          className="text-white/70 hover:text-white border-white/10 hover:bg-white/10"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="text-white/70 hover:text-white border-white/10 hover:bg-white/10"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, i) => (
            typeof page === "number" ? (
              <Button
                key={i}
                variant={page === currentPage ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className={
                  page === currentPage
                    ? ""
                    : "text-white/70 hover:text-white border-white/10 hover:bg-white/10"
                }
              >
                {page}
              </Button>
            ) : (
              <span key={i} className="text-white/40 px-1">
                {page}
              </span>
            )
          ))}
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="text-white/70 hover:text-white border-white/10 hover:bg-white/10"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          className="text-white/70 hover:text-white border-white/10 hover:bg-white/10"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>

      {/* Page size selector */}
      {onLimitChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">Itens por página:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={isLoading}
            className="bg-white/[0.02] border border-white/10 rounded px-2 py-1 text-sm text-white/90 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      )}
    </div>
  )
}
