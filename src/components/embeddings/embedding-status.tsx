/**
 * Embedding Status Badge
 *
 * Displays the current embedding status of a document with visual indicator.
 *
 * States:
 * - pending: Document not yet embedded
 * - processing: Embedding in progress (shows progress)
 * - completed: Successfully embedded
 * - failed: Embedding failed
 */

"use client"

import { CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react"

export interface EmbeddingStatusProps {
  /** Whether document is embedded */
  embedded: boolean
  /** Current embedding status */
  status?: "pending" | "processing" | "completed" | "failed" | null
  /** Progress (current / total) */
  progress?: number
  /** Total chunks */
  total?: number
  /** Error message if failed */
  error?: string | null
  /** Compact variant (smaller) */
  compact?: boolean
  /** Custom className */
  className?: string
}

/**
 * Get status from embedded flag and optional status string
 */
export function getStatusFromEmbedded(
  embedded: boolean,
  status?: string | null
): "pending" | "processing" | "completed" | "failed" {
  if (status === "failed") return "failed"
  if (status === "processing") return "processing"
  if (embedded) return "completed"
  return "pending"
}

/**
 * Color variants for each status
 */
const STATUS_CONFIGS = {
  pending: {
    bg: "bg-white/5",
    text: "text-white/50",
    border: "border-white/10",
    icon: Clock,
    label: "Pendente",
  },
  processing: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
    icon: Loader2,
    label: "Processando",
  },
  completed: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
    icon: CheckCircle2,
    label: "Indexado",
  },
  failed: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    icon: AlertCircle,
    label: "Erro",
  },
} as const

/**
 * Embedding Status Badge Component
 */
export function EmbeddingStatusBadge({
  embedded,
  status,
  progress = 0,
  total = 0,
  error,
  compact = false,
  className = "",
}: EmbeddingStatusProps) {
  // Determine actual status
  const actualStatus = status || getStatusFromEmbedded(embedded, status)
  const config = STATUS_CONFIGS[actualStatus]
  const Icon = config.icon

  const baseClasses = "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium"
  const sizeClasses = compact ? "px-1.5 py-0.5 text-[10px]" : ""
  const statusClasses = `${config.bg} ${config.text} ${config.border}`

  return (
    <div className={`${baseClasses} ${sizeClasses} ${statusClasses} ${className}`} title={error || undefined}>
      <Icon className={actualStatus === "processing" ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
      {actualStatus === "processing" && total > 0 ? (
        <span>{progress}/{total}</span>
      ) : (
        <span>{config.label}</span>
      )}
    </div>
  )
}

/**
 * Simplified text-only status indicator
 */
export function EmbeddingStatusText({
  embedded,
  status,
  progress,
  total,
}: Pick<EmbeddingStatusProps, "embedded" | "status" | "progress" | "total">) {
  const actualStatus = status || getStatusFromEmbedded(embedded, status)

  if (actualStatus === "processing" && total && total > 0) {
    return <span className="text-primary">{progress}/{total}</span>
  }

  switch (actualStatus) {
    case "completed":
      return <span className="text-green-400">Indexado</span>
    case "failed":
      return <span className="text-red-400">Erro</span>
    case "processing":
      return <span className="text-primary">Processando</span>
    default:
      return <span className="text-white/50">Pendente</span>
  }
}

/**
 * Mini dot indicator for compact status display
 */
export function EmbeddingStatusDot({
  embedded,
  status,
  className = "",
}: {
  embedded: boolean
  status?: string | null
  className?: string
}) {
  const actualStatus = (status || getStatusFromEmbedded(embedded, status)) as
    | "pending"
    | "processing"
    | "completed"
    | "failed"

  const colors: Record<typeof actualStatus, string> = {
    pending: "bg-white/30",
    processing: "bg-primary animate-pulse",
    completed: "bg-green-400",
    failed: "bg-red-400",
  }

  return (
    <div className={`h-2 w-2 rounded-full ${colors[actualStatus]} ${className}`} />
  )
}
