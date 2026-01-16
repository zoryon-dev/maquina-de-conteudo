/**
 * Post Card Component
 *
 * Compact card displaying a scheduled post in the calendar grid.
 * Shows platform icon, status badge, content preview, and time.
 */

"use client"

import { motion } from "framer-motion"
import {
  Clock,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Instagram,
  Twitter,
  Linkedin,
  Video,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CalendarPost } from "@/types/calendar"
import {
  PLATFORM_CONFIGS,
  STATUS_CONFIGS,
} from "@/types/calendar"
import { extractContentPreview } from "@/lib/calendar-utils"

// Platform icon mapping
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  tiktok: Video,
}

interface PostCardProps {
  post: CalendarPost
  onClick?: (post: CalendarPost) => void
  onEdit?: (post: CalendarPost) => void
  onDelete?: (postId: number) => void
  onDuplicate?: (postId: number) => void
}

export function PostCard({
  post,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
}: PostCardProps) {
  const platformConfig = PLATFORM_CONFIGS[post.platform]
  const statusConfig = STATUS_CONFIGS[post.status]
  const PlatformIcon = PLATFORM_ICONS[post.platform]

  const contentPreview = extractContentPreview(post.content)

  return (
    <motion.div
      layoutId={`post-${post.id}`}
      draggable
      onDragStart={(e) => {
        const dragEvent = e as unknown as React.DragEvent
        dragEvent.dataTransfer.setData("text/plain", String(post.id))
        dragEvent.dataTransfer.effectAllowed = "move"
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(post)}
      className={cn(
        "group relative p-2 rounded-lg cursor-pointer overflow-hidden",
        "border border-white/10 hover:border-white/20",
        "transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/20",
        platformConfig.bgGradient
      )}
    >
      {/* Header: Platform Badge + Status Badge + Quick Actions */}
      <div className="flex items-center gap-1.5 mb-1">
        {/* Platform Badge with Icon */}
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1 px-1.5 py-0 h-5 border-0 font-medium text-[10px]",
            "shrink-0",
            post.platform === "instagram" && "bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-300",
            post.platform === "twitter" && "bg-blue-500/30 text-blue-300",
            post.platform === "linkedin" && "bg-sky-500/30 text-sky-300",
            post.platform === "tiktok" && "bg-gray-500/30 text-gray-300"
          )}
        >
          <PlatformIcon className="w-3 h-3" />
          <span className="max-w-[50px] truncate hidden xs:inline">
            {platformConfig.label}
          </span>
        </Badge>

        {/* Status Badge */}
        <Badge
          variant="outline"
          className={cn(
            "px-1.5 py-0 text-[10px] font-medium h-4 border-0 shrink-0",
            statusConfig.color
            )}
        >
          {statusConfig.label}
        </Badge>

        {/* Quick Actions Menu */}
        {(onEdit || onDelete || onDuplicate) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3 h-3 text-white/60 hover:text-white" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-32"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(post)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(post.id)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(post.id)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content Preview */}
      {post.title && (
        <p className="text-xs text-white/90 font-medium line-clamp-1 mb-0.5">
          {post.title}
        </p>
      )}
      <p className="text-xs text-white/70 line-clamp-2 mb-1">
        {contentPreview}
      </p>

      {/* Footer: Time Badge */}
      {post.scheduledFor && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-white/40" />
          <span className="text-xs text-white/60">
            {post.scheduledFor.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Drag Handle Visual Indicator */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-30">
        <div className="flex gap-0.5">
          <div className="w-1 h-1 bg-white/30 rounded-full" />
          <div className="w-1 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </motion.div>
  )
}
