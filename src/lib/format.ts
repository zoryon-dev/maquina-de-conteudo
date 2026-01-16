/**
 * Format utilities
 *
 * Date and number formatting functions.
 */

/**
 * Format a date to a localized string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date

  // Check if invalid date
  if (isNaN(d.getTime())) {
    return ""
  }

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Today
  if (diffDays === 0) {
    return "Hoje"
  }

  // Yesterday
  if (diffDays === 1) {
    return "Ontem"
  }

  // This week
  if (diffDays < 7) {
    return d.toLocaleDateString("pt-BR", { weekday: "long" })
  }

  // This year
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
  }

  // Otherwise
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Format a date to a detailed string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return ""
  }

  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("pt-BR").format(num)
}

/**
 * Format file size in bytes to human readable
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}
