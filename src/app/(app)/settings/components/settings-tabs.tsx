/**
 * Settings Tabs Navigation
 *
 * Tab navigation for different settings sections
 */

"use client"

import * as React from "react"
import { Server, Cpu, MessageSquare, Sliders, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Available tabs in the settings page
 */
export type TabValue =
  | "system-status"
  | "models"
  | "prompts"
  | "variables"
  | "social"

/**
 * Tab configuration
 */
interface TabConfig {
  value: TabValue
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const TABS: TabConfig[] = [
  {
    value: "system-status",
    label: "Status do Sistema",
    icon: Server,
    description: "Status dos serviços configurados",
  },
  {
    value: "models",
    label: "Modelos",
    icon: Cpu,
    description: "Modelos de IA padrão",
  },
  {
    value: "prompts",
    label: "Prompts",
    icon: MessageSquare,
    description: "Customize prompts dos agentes",
  },
  {
    value: "variables",
    label: "Variáveis",
    icon: Sliders,
    description: "Variáveis globais de personalização",
  },
  {
    value: "social",
    label: "Redes Sociais",
    icon: Share2,
    description: "Instagram e Facebook",
  },
]

/**
 * Tab Button Props
 */
interface TabButtonProps {
  tab: TabConfig
  isActive: boolean
  onClick: () => void
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  const Icon = tab.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
        "border border-transparent",
        isActive
          ? "bg-primary/20 text-white border-primary/30"
          : "text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{tab.label}</span>
    </button>
  )
}

/**
 * Settings Tabs Props
 */
export interface SettingsTabsProps {
  value: TabValue
  onValueChange: (value: TabValue) => void
  className?: string
}

/**
 * Settings Tabs Component
 *
 * Horizontal tab navigation for settings sections
 */
export function SettingsTabs({
  value,
  onValueChange,
  className
}: SettingsTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {TABS.map((tab) => (
        <TabButton
          key={tab.value}
          tab={tab}
          isActive={value === tab.value}
          onClick={() => onValueChange(tab.value)}
        />
      ))}
    </div>
  )
}
