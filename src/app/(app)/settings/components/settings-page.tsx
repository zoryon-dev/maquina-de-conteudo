/**
 * Settings Page - Client Component
 *
 * Main settings page with tabs for different configuration sections
 */

"use client"

import * as React from "react"
import { Loader2, Save, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SettingsTabs, type TabValue } from "./settings-tabs"
import { SystemStatusSection } from "./sections/system-status-section"
import { ModelsSection } from "./sections/models-section"
import { PromptsSection } from "./sections/prompts-section"
import { VariablesSection } from "./sections/variables-section"

/**
 * Loading skeleton for settings content
 */
function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-white/10 rounded" />
      <div className="space-y-4">
        <div className="h-24 bg-white/5 rounded" />
        <div className="h-24 bg-white/5 rounded" />
        <div className="h-24 bg-white/5 rounded" />
      </div>
    </div>
  )
}

/**
 * Settings Page Component
 */
export function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<TabValue>("system-status")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)

  // Simulate loading settings from server
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Simulate saving - in real implementation, call server actions
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success("Configurações salvas com sucesso!")
      setHasChanges(false)
    } catch (error) {
      toast.error("Erro ao salvar configurações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setHasChanges(false)
    toast.info("Alterações descartadas")
  }

  const handleTabChange = (tab: TabValue) => {
    // Warn if there are unsaved changes
    if (hasChanges) {
      const confirmed = window.confirm(
        "Você tem alterações não salvas. Deseja descartá-las?"
      )
      if (!confirmed) return
    }

    setActiveTab(tab)
    setHasChanges(false)
  }

  const markAsChanged = () => {
    setHasChanges(true)
  }

  return (
    <div className="space-y-6 mt-[25px] mb-[25px]">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">
          Configurações
        </h1>
        <p className="text-sm text-white/70">
          Configure suas APIs, prompts e variáveis do sistema
        </p>
      </div>

      {/* Tabs Navigation */}
      <SettingsTabs value={activeTab} onValueChange={handleTabChange} />

      {/* Content Area */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <SettingsSkeleton />
        ) : (
          <>
            {activeTab === "system-status" && (
              <SystemStatusSection onChange={markAsChanged} />
            )}
            {activeTab === "models" && (
              <ModelsSection onChange={markAsChanged} />
            )}
            {activeTab === "prompts" && (
              <PromptsSection onChange={markAsChanged} />
            )}
            {activeTab === "variables" && (
              <VariablesSection onChange={markAsChanged} />
            )}
          </>
        )}
      </div>

      {/* Action Bar */}
      <div
        className={cn(
          "flex items-center justify-end gap-3 pt-4 border-t border-white/10",
          "transition-opacity duration-200",
          !hasChanges && "opacity-50 pointer-events-none"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="text-white/70 hover:text-white hover:bg-white/5"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-[#0a0a0f] hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
