/**
 * Dashboard Page
 *
 * Página principal do estúdio de conteúdo com visão geral de publicações,
 * atalhos rápidos e métricas.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getLibraryStatsAction } from "../library/actions/library-actions"
import { getCalendarPostsAction } from "../calendar/actions/calendar-actions"
import { StatsGrid } from "./components/stats-grid"
import { ScheduledPreview } from "./components/scheduled-preview"
import { QuickActions } from "./components/quick-actions"
import { StatusBreakdown } from "./components/status-breakdown"
import type { SerializedCalendarPost } from "./components/scheduled-preview"

async function getNextWeekPosts(): Promise<SerializedCalendarPost[]> {
  const now = new Date()
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + 7)

  try {
    const posts = await getCalendarPostsAction(
      { start: now, end: nextWeek },
      {}
    )
    // Convert Date objects to strings for safe serialization
    return posts.map(post => ({
      ...post,
      scheduledFor: post.scheduledFor ? post.scheduledFor.toISOString() : null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      postedAt: post.postedAt ? post.postedAt.toISOString() : null,
    }))
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Buscar dados em paralelo
  const [libraryStats, scheduledPosts] = await Promise.all([
    getLibraryStatsAction(),
    getNextWeekPosts(),
  ])

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">
            Bem-vindo de volta!
          </h1>
          <p className="text-sm text-white/50">
            Aqui está o resumo do seu estúdio de conteúdo
          </p>
        </div>

        {/* Stats Grid - Topo */}
        <div className="mb-6">
          <StatsGrid stats={libraryStats} />
        </div>

        {/* Status das Publicações - Largura Total */}
        <div className="mb-6">
          <StatusBreakdown stats={libraryStats} />
        </div>

        {/* Layout de duas colunas */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Coluna esquerda: Próximas publicações */}
          <div className="space-y-6">
            <ScheduledPreview posts={scheduledPosts} />
          </div>

          {/* Coluna direita: Ações rápidas */}
          <div className="space-y-6">
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  )
}
