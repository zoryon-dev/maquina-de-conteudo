/**
 * Settings Page - Client Component
 *
 * Main settings page with tabs for different configuration sections
 * Note: Variables are auto-saved, no manual save button needed
 */

"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { SettingsTabs, type TabValue } from "./settings-tabs"
import { SystemStatusSection } from "./sections/system-status-section"
import { ModelsSection } from "./sections/models-section"
import { PromptsSection } from "./sections/prompts-section"
import { VariablesSection } from "./sections/variables-section"
import { SocialSection } from "./sections/social-section"
import { ProjectsSection } from "./sections/projects-section"

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

  // Simulate loading settings from server
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab)
  }

  return (
    <div className="space-y-6">
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
              <SystemStatusSection />
            )}
            {activeTab === "models" && (
              <ModelsSection />
            )}
            {activeTab === "prompts" && (
              <PromptsSection />
            )}
            {activeTab === "variables" && (
              <VariablesSection />
            )}
            {activeTab === "social" && <SocialSection />}
            {activeTab === "projects" && <ProjectsSection />}
          </>
        )}
      </div>
    </div>
  )
}
