/**
 * Post Dialog Component
 *
 * Dialog for creating and editing scheduled posts.
 * Includes form with title, content, type, platforms, and scheduling.
 */

"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CalendarPost, PostFormData, Platform } from "@/types/calendar"
import { PLATFORM_CONFIGS } from "@/types/calendar"
import type { PostType } from "@/db/schema"

// Content types available
const CONTENT_TYPES: { value: PostType; label: string; icon: string }[] = [
  { value: "text", label: "Texto", icon: "T" },
  { value: "image", label: "Imagem", icon: "I" },
  { value: "carousel", label: "Carrossel", icon: "C" },
  { value: "video", label: "Vídeo", icon: "V" },
  { value: "story", label: "Story", icon: "S" },
]

interface PostDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: PostFormData) => Promise<void>
  post?: CalendarPost
  isLoading?: boolean
}

export function PostDialog({
  open,
  onClose,
  onSave,
  post,
  isLoading = false,
}: PostDialogProps) {
  const isEditing = !!post

  // Form state
  const [title, setTitle] = useState(post?.title || "")
  const [content, setContent] = useState(post?.content || "")
  const [type, setType] = useState<PostType>(post?.type || "text")
  const [platforms, setPlatforms] = useState<Platform[]>(
    isEditing && post?.platform ? [post.platform] : []
  )
  const [scheduledFor, setScheduledFor] = useState<string>(
    post?.scheduledFor
      ? new Date(post.scheduledFor).toISOString().slice(0, 16)
      : ""
  )
  const [mediaUrls, setMediaUrls] = useState<string[]>(
    post?.mediaUrl ? [post.mediaUrl] : []
  )

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTitle(post?.title || "")
      setContent(post?.content || "")
      setType(post?.type || "text")
      setPlatforms(isEditing && post?.platform ? [post.platform] : [])
      setScheduledFor(
        post?.scheduledFor
          ? new Date(post.scheduledFor).toISOString().slice(0, 16)
          : ""
      )
      setMediaUrls(post?.mediaUrl ? [post.mediaUrl] : [])
    }
  }, [open, post, isEditing])

  // Handle save
  const handleSave = async () => {
    if (!content.trim()) return

    const data: PostFormData = {
      title: title.trim() || undefined,
      content: content.trim(),
      type,
      platforms,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      mediaUrl: mediaUrls.length ? mediaUrls : undefined,
    }

    await onSave(data)
    onClose()
  }

  // Toggle platform
  const togglePlatform = (platform: Platform) => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform]
    )
  }

  // Add media URL
  const addMediaUrl = () => {
    setMediaUrls((current) => [...current, ""])
  }

  // Update media URL
  const updateMediaUrl = (index: number, value: string) => {
    setMediaUrls((current) =>
      current.map((url, i) => (i === index ? value : url))
    )
  }

  // Remove media URL
  const removeMediaUrl = (index: number) => {
    setMediaUrls((current) => current.filter((_, i) => i !== index))
  }

  // Check if form is valid
  const isValid = content.trim().length > 0 && platforms.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Post" : "Novo Post"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Content Type Selector */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Tipo de Conteúdo
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((contentType) => (
                <button
                  key={contentType.value}
                  onClick={() => setType(contentType.value)}
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold transition-all",
                    "border",
                    type === contentType.value
                      ? "bg-primary text-black border-primary"
                      : "bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20"
                  )}
                >
                  {contentType.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Selector */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Plataformas *
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_CONFIGS).map(([key, config]) => {
                const isSelected = platforms.includes(key as Platform)

                return (
                  <button
                    key={key}
                    onClick={() => togglePlatform(key as Platform)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "border",
                      isSelected
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-white/[0.02] border-white/10 text-white/70 hover:border-white/20"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", config.color)} />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do post (opcional)"
              className={cn(
                "w-full px-4 py-3 rounded-lg",
                "bg-white/[0.02] border border-white/10",
                "text-white placeholder:text-white/40",
                "focus:outline-none focus:border-primary/50",
                "transition-colors"
              )}
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">
              Conteúdo *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva seu conteúdo..."
              rows={6}
              className={cn(
                "w-full px-4 py-3 rounded-lg resize-none",
                "bg-white/[0.02] border border-white/10",
                "text-white placeholder:text-white/40",
                "focus:outline-none focus:border-primary/50",
                "transition-colors"
              )}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-white/40">
                {content.length} caracteres
              </span>
            </div>
          </div>

          {/* Media URLs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/70">
                Mídia (URLs)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addMediaUrl}
                className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {mediaUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateMediaUrl(index, e.target.value)}
                    placeholder="https://..."
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm",
                      "bg-white/[0.02] border border-white/10",
                      "text-white placeholder:text-white/40",
                      "focus:outline-none focus:border-primary/50",
                      "transition-colors"
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMediaUrl(index)}
                    className="h-9 w-9 text-white/40 hover:text-red-400 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Data e Hora
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-lg",
                    "bg-white/[0.02] border border-white/10",
                    "text-white",
                    "focus:outline-none focus:border-primary/50",
                    "transition-colors",
                    // Dark mode date input styling
                    "[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert",
                    "[&::-webkit-calendar-picker-indicator]:opacity-50",
                    "[&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  )}
                />
              </div>
            </div>

            {/* Quick Schedule Buttons */}
            <div className="flex items-end gap-2">
              <QuickScheduleButton
                label="Agora"
                onClick={() => {
                  const now = new Date()
                  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
                  setScheduledFor(now.toISOString().slice(0, 16))
                }}
              />
              <QuickScheduleButton
                label="+1h"
                onClick={() => {
                  const date = scheduledFor
                    ? new Date(scheduledFor)
                    : new Date()
                  date.setHours(date.getHours() + 1)
                  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
                  setScheduledFor(date.toISOString().slice(0, 16))
                }}
              />
              <QuickScheduleButton
                label="Amanhã"
                onClick={() => {
                  const date = new Date()
                  date.setDate(date.getDate() + 1)
                  date.setHours(9, 0, 0, 0)
                  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
                  setScheduledFor(date.toISOString().slice(0, 16))
                }}
              />
            </div>
          </div>

          {/* Character Count Warning */}
          {platforms.includes("twitter") && content.length > 280 && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4" />
              <span>Este texto excede o limite do Twitter ({content.length}/280 caracteres)</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isLoading}
            className="bg-primary text-black hover:bg-primary/90"
          >
            {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Agendar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quick schedule button
 */
interface QuickScheduleButtonProps {
  label: string
  onClick: () => void
}

function QuickScheduleButton({ label, onClick }: QuickScheduleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="flex-1 border-white/10 hover:bg-white/5 text-xs"
    >
      {label}
    </Button>
  )
}
