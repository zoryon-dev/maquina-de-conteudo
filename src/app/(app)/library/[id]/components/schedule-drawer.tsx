/**
 * Schedule Drawer
 *
 * Drawer para agendar publicação em redes sociais.
 * Permite selecionar plataforma, data/hora e confirmar agendamento.
 */

"use client"

import { useState } from "react"
import { X, Calendar as CalendarIcon, Clock, Instagram, Facebook, Linkedin, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduleDrawerProps {
  open: boolean
  onClose: () => void
  libraryItemId: number
  itemTitle?: string | null
  itemType?: string
  caption?: string | null
}

interface Platform {
  id: string
  name: string
  icon: typeof Instagram
  color: string
}

// ============================================================================
// PLATFORMS
// ============================================================================

const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-500" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "text-blue-600" },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleDrawer({
  open,
  onClose,
  libraryItemId,
  itemTitle,
  itemType,
  caption,
}: ScheduleDrawerProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [customMessage, setCustomMessage] = useState(caption || "")
  const [isScheduling, setIsScheduling] = useState(false)

  // Set default date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split("T")[0]

  // Reset form when drawer opens
  if (open && !scheduledDate) {
    setScheduledDate(defaultDate)
    setScheduledTime("10:00")
    setCustomMessage(caption || "")
  }

  const selectedPlatformData = PLATFORMS.find((p) => p.id === selectedPlatform)
  const PlatformIcon = selectedPlatformData?.icon || Instagram

  async function handleSchedule() {
    if (!scheduledDate || !scheduledTime) {
      toast.error("Preencha a data e hora para agendar")
      return
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)

    if (scheduledFor < new Date()) {
      toast.error("A data de agendamento deve ser futura")
      return
    }

    setIsScheduling(true)

    try {
      const response = await fetch(`/api/library/${libraryItemId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          scheduledFor: scheduledFor.toISOString(),
          message: customMessage,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Publicação agendada com sucesso!")
        onClose()
        // Reset form
        setScheduledDate(defaultDate)
        setScheduledTime("10:00")
        setCustomMessage(caption || "")
      } else {
        toast.error(result.error || "Erro ao agendar publicação")
      }
    } catch (error) {
      toast.error("Erro ao agendar publicação")
    } finally {
      setIsScheduling(false)
    }
  }

  if (!open) return null

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex transition-all duration-300",
      open ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0f] border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium text-white">Agendar Publicação</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label className="text-white/70 text-sm">Plataforma</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                      selectedPlatform === platform.id
                        ? "bg-primary/20 border-primary"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", platform.color)} />
                    <span className="text-xs text-white/70">{platform.name}</span>
                    {selectedPlatform === platform.id && (
                      <Check className="w-3 h-3 text-primary absolute top-1 right-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <Label className="text-white/70 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Data e Hora
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={defaultDate}
                  className="bg-white/[0.02] border-white/10 text-white"
                />
              </div>
              <div>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-white/[0.02] border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <PlatformIcon className={cn("w-4 h-4", selectedPlatformData?.color)} />
              <span>
                {itemType === "carousel" ? "Carrossel" : itemType === "image" ? "Imagem" : "Post"} → {selectedPlatformData?.name}
              </span>
            </div>
            {itemTitle && (
              <div className="text-xs text-white/40 truncate">
                "{itemTitle}"
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">
              Mensagem Personalizada <span className="text-white/30">(opcional)</span>
            </Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Adicione uma mensagem personalizada para esta publicação..."
              rows={4}
              className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 resize-none"
            />
            <p className="text-xs text-white/30">
              {customMessage.length} caracteres
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={isScheduling}
              className="flex-1 bg-primary text-black hover:bg-primary/90"
            >
              {isScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Agendar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
