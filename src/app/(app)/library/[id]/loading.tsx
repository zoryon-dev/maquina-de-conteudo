/**
 * Library Detail Loading Skeleton
 *
 * Skeleton de carregamento para a página de detalhes.
 */

import { ChevronLeft, Download } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LibraryDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="w-20 h-5 bg-white/10 rounded" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-8 w-48 bg-white/10 rounded mb-2" />
          <div className="h-5 w-32 bg-white/10 rounded" />
        </div>
        <div className="h-10 w-32 bg-white/10 rounded" />
      </div>

      {/* Main Content - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left - Preview Section (65%) */}
        <div className="space-y-4">
          {/* Media/Carousel Skeleton */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <div className="aspect-video bg-white/5" />
          </div>

          {/* Caption Section */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="h-5 w-24 bg-white/10 rounded" />
            <div className="space-y-2">
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
            </div>
          </div>
        </div>

        {/* Right - Actions Section (35%) */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="h-10 bg-white/10 rounded w-full" />
            <div className="h-10 bg-white/10 rounded w-full" />
            <div className="h-10 bg-white/10 rounded w-full" />
            <div className="h-10 bg-white/10 rounded w-full" />
          </div>

          {/* Origin Info */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="h-5 w-20 bg-white/10 rounded" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>

          {/* Hashtags */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="h-5 w-16 bg-white/10 rounded" />
            <div className="flex flex-wrap gap-2">
              <div className="h-6 w-16 bg-white/5 rounded-full" />
              <div className="h-6 w-20 bg-white/5 rounded-full" />
              <div className="h-6 w-14 bg-white/5 rounded-full" />
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-2">
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}
