/**
 * Shared score color utilities for SEO/GEO score displays.
 */

export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400"
  if (score >= 60) return "text-yellow-400"
  return "text-red-400"
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-400"
  if (score >= 60) return "bg-yellow-400"
  return "bg-red-400"
}

export function scoreBadge(score: number): string {
  if (score >= 80) return "bg-green-400/10 text-green-400"
  if (score >= 60) return "bg-yellow-400/10 text-yellow-400"
  return "bg-red-400/10 text-red-400"
}
