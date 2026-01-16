/**
 * Calendar Types
 *
 * Complete type definitions for the editorial calendar feature.
 * These types combine library_items and scheduled_posts tables.
 */

import type { PostType, ContentStatus } from "@/db/schema"

/**
 * Calendar filters for querying posts
 */
export interface CalendarFilters {
  platforms?: Platform[]
  statuses?: ContentStatus[]
  types?: PostType[]
}

/**
 * Calendar view modes
 */
export type CalendarView = "month" | "week" | "day"

/**
 * Social media platforms
 */
export type Platform = "instagram" | "twitter" | "linkedin" | "tiktok"

/**
 * Calendar filters for querying posts
 */
export interface CalendarFilters {
  platforms?: Platform[]
  statuses?: ContentStatus[]
  types?: PostType[]
}

/**
 * Combined calendar post from library_items + scheduled_posts
 * This is the main type used throughout the calendar UI
 */
export interface CalendarPost {
  // Library item fields
  id: number
  libraryItemId: number
  type: PostType
  status: ContentStatus
  title: string | null
  content: string | null
  scheduledFor: Date | null
  mediaUrl: string | null
  metadata: string | null
  createdAt: Date
  updatedAt: Date

  // Scheduled post fields
  scheduledPostId: number
  platform: Platform
  scheduledPostStatus: "pending" | "published" | "failed"
  postedAt: Date | null
  platformPostId: string | null
}

/**
 * Post form data for create/edit operations
 */
export interface PostFormData {
  title?: string
  content: string
  type: PostType
  platforms: Platform[]
  scheduledFor?: Date
  mediaUrl?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Calendar date range for queries
 */
export interface CalendarDateRange {
  start: Date
  end: Date
  visibleStart: Date // Includes padding days for month view
  visibleEnd: Date
}

/**
 * Calendar grid cell data
 */
export interface CalendarDayCell {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  posts: CalendarPost[]
}

/**
 * Platform configuration for UI
 */
export interface PlatformConfig {
  label: string
  icon: string // Lucide icon name
  color: string // Tailwind color class
  bgGradient: string // Tailwind gradient classes
  characterLimit?: number
}

/**
 * Status configuration for UI
 */
export interface StatusConfig {
  label: string
  color: string // Tailwind color class
  icon?: string // Lucide icon name
}

/**
 * Content type configuration for UI
 */
export interface ContentTypeConfig {
  label: string
  icon: string // Lucide icon name
  color: string // Tailwind color class
}

/**
 * Server action result type
 */
export interface ActionResult {
  success: boolean
  error?: string
  libraryItemId?: number
}

/**
 * Calendar statistics
 */
export interface CalendarStats {
  totalPosts: number
  scheduledThisWeek: number
  scheduledThisMonth: number
  byPlatform: Record<Platform, number>
  byStatus: Record<ContentStatus, number>
}

/**
 * Drag and drop context
 */
export interface DragContext {
  postId: number
  originalDate: Date
  platform: Platform
}

/**
 * Calendar navigation state
 */
export interface CalendarNavigationState {
  currentDate: Date
  view: CalendarView
}

/**
 * Time slot for day view
 */
export interface TimeSlot {
  hour: number // 0-23
  posts: CalendarPost[]
}

/**
 * Week day column
 */
export interface WeekDayColumn {
  date: Date
  isToday: boolean
  posts: CalendarPost[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Platform configurations
 */
export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    icon: "instagram",
    color: "text-pink-400",
    bgGradient: "from-pink-500/10 to-purple-500/10",
  },
  twitter: {
    label: "Twitter",
    icon: "twitter",
    color: "text-blue-400",
    bgGradient: "from-blue-500/10",
  },
  linkedin: {
    label: "LinkedIn",
    icon: "linkedin",
    color: "text-sky-400",
    bgGradient: "from-sky-500/10",
  },
  tiktok: {
    label: "TikTok",
    icon: "video",
    color: "text-gray-400",
    bgGradient: "from-gray-500/10 to-white/5",
  },
}

/**
 * Status configurations
 */
export const STATUS_CONFIGS: Record<ContentStatus, StatusConfig> = {
  draft: {
    label: "Rascunho",
    color: "bg-gray-500/10 text-gray-400",
  },
  scheduled: {
    label: "Agendado",
    color: "bg-primary/10 text-primary",
  },
  published: {
    label: "Publicado",
    color: "bg-green-500/10 text-green-400",
  },
  archived: {
    label: "Arquivado",
    color: "bg-amber-500/10 text-amber-400",
  },
}

/**
 * Content type configurations
 */
export const CONTENT_TYPE_CONFIGS: Record<PostType, ContentTypeConfig> = {
  text: {
    label: "Texto",
    icon: "type",
    color: "text-blue-400",
  },
  image: {
    label: "Imagem",
    icon: "image",
    color: "text-purple-400",
  },
  carousel: {
    label: "Carrossel",
    icon: "layers",
    color: "text-pink-400",
  },
  video: {
    label: "Vídeo",
    icon: "video",
    color: "text-red-400",
  },
  story: {
    label: "Story",
    icon: "camera",
    color: "text-orange-400",
  },
}

/**
 * View labels in Portuguese
 */
export const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Mês",
  week: "Semana",
  day: "Dia",
}

/**
 * Weekday names in Portuguese (abbreviated)
 */
export const WEEKDAY_ABBREVS = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const

/**
 * Month names in Portuguese
 */
export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const

/**
 * Default date format options
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
}

/**
 * Short date format options
 */
export const SHORT_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
}

/**
 * Time format options
 */
export const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
}
