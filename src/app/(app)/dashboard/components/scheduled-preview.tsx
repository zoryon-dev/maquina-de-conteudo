/**
 * Scheduled Posts Preview
 *
 * Preview dos próximos posts agendados com link para o calendário.
 */

"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { CalendarPost } from "@/types/calendar"
import { PLATFORM_CONFIGS } from "@/types/calendar"
import {
  Calendar,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Film,
  FileText,
} from "lucide-react"

// Type for posts with serialized dates (from server to client)
export type SerializedCalendarPost = Omit<CalendarPost, 'scheduledFor' | 'createdAt' | 'updatedAt' | 'postedAt'> & {
  scheduledFor: string | null
  createdAt: string
  updatedAt: string
  postedAt: string | null
}

// Custom Instagram icon
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  image: ImageIcon,
  carousel: Film,
  video: Video,
  story: ImageIcon,
}

function formatRelativeDate(dateInput: Date | string): string {
  const now = new Date()
  const targetDate = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const diffMs = targetDate.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Hoje"
  if (diffDays === 1) return "Amanhã"
  if (diffDays === -1) return "Ontem"

  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  }
  return targetDate.toLocaleDateString("pt-BR", options)
}

function getPlatformIcon(platform: string): React.ComponentType<{ className?: string }> {
  if (platform === "instagram") return InstagramIcon
  // Para outras plataformas, você pode adicionar ícones customizados depois
  return Calendar
}

interface ScheduledPostCardProps {
  post: SerializedCalendarPost
}

function ScheduledPostCard({ post }: ScheduledPostCardProps) {
  const platformConfig = PLATFORM_CONFIGS[post.platform]
  const PlatformIcon = getPlatformIcon(post.platform)
  const TypeIcon = TYPE_ICONS[post.type] || FileText

  // Format date safely
  const formattedDate = React.useMemo(() => {
    if (!post.scheduledFor) return "Sem data"
    try {
      return formatRelativeDate(post.scheduledFor)
    } catch {
      return "Sem data"
    }
  }, [post.scheduledFor])

  // Format calendar link safely
  const calendarLink = React.useMemo(() => {
    if (!post.scheduledFor) return "/calendar"
    try {
      return `/calendar?date=${new Date(post.scheduledFor).toISOString().split("T")[0]}`
    } catch {
      return "/calendar"
    }
  }, [post.scheduledFor])

  return (
    <Link
      href={calendarLink}
      className="group flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all"
    >
      {/* Thumbnail / Type Icon */}
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/5 to-white/0 flex items-center justify-center shrink-0">
        <TypeIcon className="h-5 w-5 text-white/60" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">
          {post.title || "Sem título"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <PlatformIcon className={cn("h-3 w-3", platformConfig?.color)} />
          <span className="text-xs text-white/50 capitalize">{platformConfig?.label}</span>
          <span className="text-xs text-white/30">•</span>
          <span className="text-xs text-white/50">{formattedDate}</span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
    </Link>
  )
}

interface ScheduledPreviewProps {
  posts: SerializedCalendarPost[]
  isLoading?: boolean
}

export function ScheduledPreview({ posts, isLoading }: ScheduledPreviewProps) {
  if (isLoading) {
    return (
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/[0.02] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const upcomingPosts: SerializedCalendarPost[] = posts
    .filter((p): p is SerializedCalendarPost => {
      if (!p.scheduledFor) return false
      const scheduledDate = new Date(p.scheduledFor)
      return !isNaN(scheduledDate.getTime()) && scheduledDate >= new Date()
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduledFor || 0)
      const dateB = new Date(b.scheduledFor || 0)
      return dateA.getTime() - dateB.getTime()
    })
    .slice(0, 3)

  return (
    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Próximas Publicações
        </h3>
        <Link
          href="/calendar"
          className="text-xs text-white/40 hover:text-primary transition-colors flex items-center gap-1"
        >
          Ver calendário
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Posts List */}
      {upcomingPosts.length > 0 ? (
        <div className="space-y-2">
          {upcomingPosts.map((post) => (
            <ScheduledPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="h-10 w-10 mx-auto text-white/10 mb-2" />
          <p className="text-sm text-white/40">Nenhuma publicação agendada</p>
          <Link
            href="/wizard"
            className="inline-block mt-3 text-xs text-primary hover:underline"
          >
            Criar primeiro post
          </Link>
        </div>
      )}
    </div>
  )
}
