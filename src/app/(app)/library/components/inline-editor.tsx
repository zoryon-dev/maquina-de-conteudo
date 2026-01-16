/**
 * Inline Editor Component
 *
 * Componente reutilizável para edição inline de campos de texto.
 * Usa padrão de optimistic update com rollback em caso de erro.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineEditorProps {
  value: string
  onSave: (newValue: string) => Promise<boolean>
  onCancel?: () => void
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  className?: string
  autoFocus?: boolean
}

export function InlineEditor({
  value,
  onSave,
  onCancel,
  placeholder = "Digite...",
  multiline = false,
  maxLength = 200,
  className,
  autoFocus = true,
}: InlineEditorProps) {
  const [editingValue, setEditingValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [autoFocus])

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  // Handle save
  const handleSave = async () => {
    const trimmed = editingValue.trim()

    // Don't save if empty or unchanged
    if (trimmed === "" || trimmed === value) {
      handleCancel()
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const success = await onSave(trimmed)
      if (success) {
        // Parent will handle closing the editor
      } else {
        setError("Erro ao salvar")
      }
    } catch {
      setError("Erro ao salvar")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setEditingValue(value)
    setError(null)
    onCancel?.()
  }

  const InputComponent = multiline ? "textarea" : "input"

  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-[#0a0a0f] border border-primary rounded-lg p-2 shadow-lg",
        className
      )}
    >
      <InputComponent
        ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={multiline ? 3 : 1}
        disabled={isSaving}
        className={cn(
          "flex-1 bg-transparent border-0 outline-none text-white text-sm",
          "placeholder:text-white/30 disabled:opacity-50",
          multiline && "resize-none min-h-[60px]"
        )}
      />

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-400 whitespace-nowrap">{error}</span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          disabled={isSaving || editingValue.trim() === "" || editingValue.trim() === value}
          className={cn(
            "w-7 h-7 rounded flex items-center justify-center transition-all",
            isSaving || editingValue.trim() === "" || editingValue.trim() === value
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
          )}
          title="Salvar (Enter)"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={handleCancel}
          disabled={isSaving}
          className={cn(
            "w-7 h-7 rounded flex items-center justify-center transition-all",
            isSaving
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          )}
          title="Cancelar (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Character count */}
      {maxLength && (
        <span className="text-xs text-white/30">
          {editingValue.length}/{maxLength}
        </span>
      )}
    </div>
  )
}

/**
 * Hook para gerenciar estado de edição inline
 */
export function useInlineEdit(
  initialValue: string,
  onSave: (value: string) => Promise<boolean>
) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)

  const startEdit = () => setIsEditing(true)
  const cancelEdit = () => setIsEditing(false)

  const saveEdit = async (newValue: string) => {
    const success = await onSave(newValue)
    if (success) {
      setValue(newValue)
      setIsEditing(false)
    }
    return success
  }

  // Update value when initialValue changes from outside
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return {
    isEditing,
    value,
    startEdit,
    cancelEdit,
    saveEdit,
  }
}
