/**
 * Content Breakdown Component
 *
 * Two-column layout showing:
 * - Left: Distribution by content type (text, image, carousel, video, story)
 * - Right: Distribution by platform (Instagram, Facebook)
 */

"use client"

import { FileText, Image, LayoutGrid, Video, Sparkles, Instagram } from "lucide-react"
import type { PostType } from "@/db/schema"
import type { PlatformBreakdownEntry } from "../../actions/analytics-actions"

interface ContentBreakdownProps {
  byType: Record<PostType, number>
  platformData: PlatformBreakdownEntry[]
  totalItems: number
}

const TYPE_CONFIGS: Record<PostType, { label: string; icon: typeof FileText; color: string }> = {
  text: { label: "Texto", icon: FileText, color: "bg-blue-400" },
  image: { label: "Imagem", icon: Image, color: "bg-purple-400" },
  carousel: { label: "Carrossel", icon: LayoutGrid, color: "bg-primary" },
  video: { label: "Video", icon: Video, color: "bg-red-400" },
  story: { label: "Story", icon: Sparkles, color: "bg-yellow-400" },
}

const PLATFORM_CONFIGS: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "bg-pink-400" },
  facebook: { label: "Facebook", color: "bg-blue-500" },
}

export function ContentBreakdown({ byType, platformData, totalItems }: ContentBreakdownProps) {
  const totalPlatform = platformData.reduce((sum, p) => sum + p.count, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* By Type */}
      <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white/90 mb-4">Por Tipo</h3>
        <div className="space-y-3">
          {(Object.entries(TYPE_CONFIGS) as Array<[PostType, typeof TYPE_CONFIGS[PostType]]>).map(
            ([type, config]) => {
              const count = byType[type] || 0
              const percentage = totalItems > 0 ? (count / totalItems) * 100 : 0
              const Icon = config.icon

              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-white/50" />
                      <span className="text-sm text-white/70">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{count}</span>
                      <span className="text-xs text-white/40 w-10 text-right">
                        {percentage > 0 ? `${Math.round(percentage)}%` : "0%"}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 0)}%` }}
                    />
                  </div>
                </div>
              )
            }
          )}
        </div>
      </div>

      {/* By Platform */}
      <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-lg p-6">
        <h3 className="text-sm font-medium text-white/90 mb-4">Por Plataforma</h3>
        {platformData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Instagram className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-sm text-white/40">
              Nenhuma publicacao registrada ainda.
            </p>
            <p className="text-xs text-white/30 mt-1">
              Os dados aparecerrao aqui quando voce publicar conteudos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {platformData.map((entry) => {
              const config = PLATFORM_CONFIGS[entry.platform] || {
                label: entry.platform,
                color: "bg-gray-400",
              }
              const percentage = totalPlatform > 0 ? (entry.count / totalPlatform) * 100 : 0

              return (
                <div key={entry.platform} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">{config.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{entry.count}</span>
                      <span className="text-xs text-white/40 w-10 text-right">
                        {percentage > 0 ? `${Math.round(percentage)}%` : "0%"}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
