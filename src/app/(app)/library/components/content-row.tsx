/**
 * Content Row Component
 *
 * Linha individual para visualização em lista da biblioteca.
 * Clicar no título abre a página de detalhes.
 */

"use client"

import Link from "next/link"
import { Check, Type, Image, Layers, Video, Camera, MoreVertical, Edit2, Copy, Trash2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LibraryItemWithRelations } from "@/types/library"
import { CONTENT_TYPE_CONFIGS, STATUS_CONFIGS } from "@/types/calendar"
import { formatDate } from "@/lib/format"

interface ContentRowProps {
  item: LibraryItemWithRelations
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

const TYPE_ICONS: Record<string, typeof Type> = {
  text: Type,
  image: Image,
  carousel: Layers,
  video: Video,
  story: Camera,
}

export function ContentRow({
  item,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: ContentRowProps) {
  const [isHovered, setIsHovered] = useState(false)

  const typeConfig = CONTENT_TYPE_CONFIGS[item.type]
  const statusConfig = STATUS_CONFIGS[item.status]
  const TypeIcon = TYPE_ICONS[item.type] || Type

  return (
    <tr
      className={cn(
        "group transition-colors",
        selected
          ? "bg-primary/10"
          : "hover:bg-white/[0.03]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <button
          onClick={onSelect}
          className={cn(
            "w-5 h-5 rounded border flex items-center justify-center transition-all",
            selected
              ? "bg-primary border-primary text-black"
              : "border-white/20 hover:border-white/40",
            isHovered || selected ? "opacity-100" : "opacity-60"
          )}
        >
          {selected && <Check className="w-3.5 h-3.5" />}
        </button>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Type icon */}
          <div
            className={cn(
              "w-8 h-8 rounded flex items-center justify-center",
              typeConfig.color.replace("text-", "bg-").replace("-400", "/20")
            )}
          >
            <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
          </div>

          {/* Title and content preview - clickable */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/library/${item.id}`}
              className="block"
            >
              <p className="text-sm font-medium text-white truncate max-w-md hover:text-primary transition-colors">
                {item.title || "Sem título"}
              </p>
            </Link>
            {item.content && (
              <p className="text-xs text-white/40 truncate max-w-md">
                {item.content}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn("text-xs px-1.5 py-0 border-0", typeConfig.color)}
        >
          {typeConfig.label}
        </Badge>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge className={cn("text-xs px-1.5 py-0", statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        {item.category ? (
          <Badge
            variant="outline"
            className="text-xs px-1.5 py-0 bg-white/5 border-white/10 text-white/70"
          >
            {item.category.name}
          </Badge>
        ) : (
          <span className="text-sm text-white/30">—</span>
        )}
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded"
              >
                #{tag.name}
              </span>
            ))}
            {item.tags.length > 2 && (
              <span className="text-xs text-white/40">
                +{item.tags.length - 2}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-white/30">—</span>
        )}
      </td>

      {/* Created At */}
      <td className="px-4 py-3">
        <span className="text-sm text-white/60">{formatDate(item.createdAt)}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div
          className={cn(
            "transition-opacity",
            isHovered || selected ? "opacity-100" : "opacity-0"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/5"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-[#1a1a2e] border-white/10"
            >
              <DropdownMenuItem
                onClick={onEdit}
                className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white/80 hover:text-white hover:bg-white/5 focus:text-white focus:bg-white/5 cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  )
}
