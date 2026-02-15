/**
 * Library Analytics Dashboard
 *
 * Main container for the analytics tab in the library page.
 * Fetches data from server actions and renders:
 * - Stats cards (overview)
 * - Publication timeline chart
 * - Content breakdown by type and platform
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, RefreshCw, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatsCards } from "./stats-cards"
import { PublicationChart } from "./publication-chart"
import { ContentBreakdown } from "./content-breakdown"
import {
  getLibraryOverviewAction,
  getPublicationTimelineAction,
  getPlatformBreakdownAction,
  type LibraryOverview,
  type TimelineEntry,
  type PlatformBreakdownEntry,
} from "../../actions/analytics-actions"

export function LibraryAnalytics() {
  const [isLoading, setIsLoading] = useState(true)
  const [overview, setOverview] = useState<LibraryOverview | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [platformData, setPlatformData] = useState<PlatformBreakdownEntry[]>([])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [overviewResult, timelineResult, platformResult] = await Promise.all([
        getLibraryOverviewAction(),
        getPublicationTimelineAction(30),
        getPlatformBreakdownAction(),
      ])

      setOverview(overviewResult)
      setTimeline(timelineResult)
      setPlatformData(platformResult)
    } catch (error) {
      console.error("[LibraryAnalytics] Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (isLoading) {
    return <AnalyticsLoadingState />
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-white/30" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Erro ao carregar analytics
        </h3>
        <p className="text-sm text-white/60 mb-4 max-w-md">
          Nao foi possivel carregar os dados. Tente novamente.
        </p>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (overview.totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-white/30" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Sem dados para exibir
        </h3>
        <p className="text-sm text-white/60 max-w-md">
          Crie seu primeiro conteudo para comecar a ver as estatisticas da sua biblioteca.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          className="h-8 text-white/50 hover:text-white hover:bg-white/5"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards overview={overview} />

      {/* Publication Chart */}
      <PublicationChart data={timeline} />

      {/* Content Breakdown */}
      <ContentBreakdown
        byType={overview.byType}
        platformData={platformData}
        totalItems={overview.totalItems}
      />
    </div>
  )
}

/**
 * Loading skeleton for analytics
 */
function AnalyticsLoadingState() {
  return (
    <div className="space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/[0.02] border border-white/10 rounded-lg p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-7 w-16 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="w-10 h-10 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
        <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-6" />
        <div className="flex items-end gap-1 h-40">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex-1 flex justify-center">
              <div
                className="w-full max-w-[24px] bg-white/5 rounded-t-sm animate-pulse"
                style={{
                  height: `${Math.random() * 60 + 10}%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/[0.02] border border-white/10 rounded-lg p-6"
          >
            <div className="h-4 w-24 bg-white/5 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
