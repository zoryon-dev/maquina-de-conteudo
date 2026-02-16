/**
 * Smart Suggestions Panel
 *
 * Painel colapsavel com sugestoes inteligentes para um item da biblioteca:
 * - Tags sugeridas por IA
 * - Hashtags populares do usuario
 * - Melhor horario para publicacao
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles,
  Tag,
  Hash,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  getPopularHashtagsAction,
  getBestPublishTimeAction,
  type BestTimeSlot,
} from "../../actions/analytics-actions"
import { updateItemTagsAction, createTagAction, getTagsAction } from "../../actions/library-actions"
import type { LibraryItemWithRelations, Tag as TagType } from "@/types/library"

// ============================================================================
// TYPES
// ============================================================================

interface SmartSuggestionsProps {
  item: LibraryItemWithRelations
  onTagsUpdated?: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SmartSuggestions({ item, onTagsUpdated }: SmartSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(true)

  // Suggested tags from AI
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [addedTags, setAddedTags] = useState<Set<string>>(new Set())

  // Popular hashtags
  const [popularHashtags, setPopularHashtags] = useState<Array<{ hashtag: string; count: number }>>([])
  const [isLoadingHashtags, setIsLoadingHashtags] = useState(false)

  // Best publish time
  const [bestTimes, setBestTimes] = useState<BestTimeSlot[]>([])
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)

  // Available user tags (for matching AI suggestions to existing tags)
  const [userTags, setUserTags] = useState<TagType[]>([])

  // Load popular hashtags and best times on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingHashtags(true)
      setIsLoadingTimes(true)

      try {
        const [hashtags, times, tags] = await Promise.all([
          getPopularHashtagsAction(undefined, 8),
          getBestPublishTimeAction(),
          getTagsAction(),
        ])
        setPopularHashtags(hashtags)
        setBestTimes(times)
        setUserTags(tags)
      } catch {
        // Silent fail — non-critical
      } finally {
        setIsLoadingHashtags(false)
        setIsLoadingTimes(false)
      }
    }

    void loadData()
  }, [])

  // Fetch AI tag suggestions
  const handleSuggestTags = useCallback(async () => {
    setIsLoadingTags(true)
    setSuggestedTags([])
    setAddedTags(new Set())

    try {
      const response = await fetch(`/api/library/${item.id}/suggest-tags`, {
        method: "POST",
      })

      const result = await response.json()

      if (result.success && result.tags) {
        setSuggestedTags(result.tags)
      } else {
        toast.error(result.error || "Erro ao sugerir tags")
      }
    } catch {
      toast.error("Erro ao sugerir tags")
    } finally {
      setIsLoadingTags(false)
    }
  }, [item.id])

  // Add a suggested tag to the item
  const handleAddTag = useCallback(
    async (tagName: string) => {
      try {
        // Check if the tag already exists for the user
        let tagId: number | undefined
        const existingTag = userTags.find(
          (t) => t.name.toLowerCase() === tagName.toLowerCase()
        )

        if (existingTag) {
          tagId = existingTag.id
        } else {
          // Create a new tag
          const result = await createTagAction(tagName)
          if (result.success && result.tagId) {
            tagId = result.tagId
            setUserTags((prev) => [
              ...prev,
              { id: tagId!, userId: "", name: tagName, color: null, createdAt: new Date() },
            ])
          } else {
            toast.error(result.error || "Erro ao criar tag")
            return
          }
        }

        // Add the tag to the current item's tags
        const currentTagIds = item.tags.map((t) => t.id)
        if (currentTagIds.includes(tagId!)) {
          toast.info("Tag ja adicionada")
          setAddedTags((prev) => new Set([...prev, tagName]))
          return
        }

        const result = await updateItemTagsAction(item.id, [...currentTagIds, tagId!])
        if (result.success) {
          setAddedTags((prev) => new Set([...prev, tagName]))
          toast.success(`Tag "${tagName}" adicionada`)
          onTagsUpdated?.()
        } else {
          toast.error(result.error || "Erro ao adicionar tag")
        }
      } catch {
        toast.error("Erro ao adicionar tag")
      }
    },
    [item.id, item.tags, userTags, onTagsUpdated]
  )

  const formatHour = (hour: number) => `${hour.toString().padStart(2, "0")}:00`

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
      {/* Header (clickable to toggle) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">Sugestoes da IA</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-5">
          {/* ── Suggested Tags ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Tag className="w-3.5 h-3.5" />
                <span>Tags sugeridas</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestTags}
                disabled={isLoadingTags}
                className="h-7 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
              >
                {isLoadingTags ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                {suggestedTags.length > 0 ? "Resugerir" : "Sugerir tags"}
              </Button>
            </div>

            {suggestedTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestedTags.map((tag) => {
                  const isAdded = addedTags.has(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => !isAdded && handleAddTag(tag)}
                      disabled={isAdded}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors",
                        isAdded
                          ? "bg-primary/20 text-primary/80 cursor-default"
                          : "bg-white/5 text-white/70 hover:bg-primary/10 hover:text-primary cursor-pointer"
                      )}
                    >
                      {isAdded ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      {tag}
                    </button>
                  )
                })}
              </div>
            ) : !isLoadingTags ? (
              <p className="text-xs text-white/30">
                Clique em &quot;Sugerir tags&quot; para receber sugestoes
              </p>
            ) : null}
          </div>

          {/* ── Popular Hashtags ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Hash className="w-3.5 h-3.5" />
              <span>Hashtags populares</span>
            </div>

            {isLoadingHashtags ? (
              <div className="flex items-center gap-2 text-xs text-white/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                Carregando...
              </div>
            ) : popularHashtags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {popularHashtags.map((item) => (
                  <button
                    key={item.hashtag}
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`#${item.hashtag}`)
                      toast.success(`#${item.hashtag} copiada!`)
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors cursor-pointer"
                  >
                    <span>#{item.hashtag}</span>
                    <Badge
                      variant="outline"
                      className="ml-0.5 h-4 text-[10px] px-1 border-white/10 text-white/40"
                    >
                      {item.count}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30">
                Nenhuma hashtag encontrada nos seus conteudos
              </p>
            )}
          </div>

          {/* ── Best Publish Time ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Clock className="w-3.5 h-3.5" />
              <span>Melhor horario</span>
            </div>

            {isLoadingTimes ? (
              <div className="flex items-center gap-2 text-xs text-white/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                Carregando...
              </div>
            ) : bestTimes.length > 0 ? (
              <div className="space-y-1.5">
                {bestTimes.map((slot, index) => (
                  <div
                    key={`${slot.day}-${slot.hour}`}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        index === 0
                          ? "bg-primary/20 text-primary"
                          : "bg-white/5 text-white/40"
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="text-white/70">
                      {slot.day} as {formatHour(slot.hour)}
                    </span>
                    {slot.score > 0 && (
                      <span className="text-white/30 text-[10px]">
                        ({slot.score} {slot.score === 1 ? "post" : "posts"})
                      </span>
                    )}
                  </div>
                ))}
                {bestTimes[0].score === 0 && (
                  <p className="text-[10px] text-white/25 mt-1">
                    Sugestoes padrao — publique mais para obter dados reais
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
