"use client"

import * as React from "react"
import {
  Building2,
  Mic,
  Palette,
  Users,
  Package,
  Layers,
  History,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  getBrandForEditAction,
  type BrandForEdit,
  type BrandSection,
} from "@/app/(app)/settings/actions/brand"
import { BrandIdentityForm } from "./brand/brand-identity-form"
import { BrandVoiceForm } from "./brand/brand-voice-form"
import { BrandVisualForm } from "./brand/brand-visual-form"
import { BrandAudienceForm } from "./brand/brand-audience-form"
import { BrandOfferForm } from "./brand/brand-offer-form"
import { BrandContentForm } from "./brand/brand-content-form"
import { BrandVersionsDialog } from "./brand/brand-versions-dialog"

type BrandSubTab = Extract<
  BrandSection,
  "identity" | "voice" | "visual" | "audience" | "offer" | "content"
>

const SUB_TABS: Array<{
  value: BrandSubTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: "identity", label: "Identidade", icon: Building2 },
  { value: "voice", label: "Voz", icon: Mic },
  { value: "visual", label: "Visual", icon: Palette },
  { value: "audience", label: "Audiência", icon: Users },
  { value: "offer", label: "Oferta", icon: Package },
  { value: "content", label: "Conteúdo", icon: Layers },
]

export function BrandSection() {
  const [brand, setBrand] = React.useState<BrandForEdit | null>(null)
  const [activeTab, setActiveTab] = React.useState<BrandSubTab>("identity")
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [versionsOpen, setVersionsOpen] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await getBrandForEditAction()
    if (result.success) {
      setBrand(result.data)
    } else {
      setError(result.error)
      toast.error(result.error)
    }
    setIsLoading(false)
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const handleSectionSaved = React.useCallback(
    (updatedAt: string) => {
      if (brand) setBrand({ ...brand, updatedAt })
      toast.success("Salvo")
    },
    [brand]
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando marca…</span>
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4" />
          <span>Erro ao carregar marca</span>
        </div>
        <p className="mt-1 text-red-200/80">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={refresh}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">{brand.name}</h2>
          <p className="text-sm text-white/60">
            slug: <code className="text-white/80">{brand.slug}</code>
            {brand.isDefault && (
              <span className="ml-2 rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
                Default
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVersionsOpen(true)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Histórico
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-[300px]">
        {activeTab === "identity" && (
          <BrandIdentityForm brand={brand} onSaved={handleSectionSaved} />
        )}
        {activeTab === "voice" && (
          <BrandVoiceForm brand={brand} onSaved={handleSectionSaved} />
        )}
        {activeTab === "visual" && (
          <BrandVisualForm brand={brand} onSaved={handleSectionSaved} />
        )}
        {activeTab === "audience" && (
          <BrandAudienceForm brand={brand} onSaved={handleSectionSaved} />
        )}
        {activeTab === "offer" && (
          <BrandOfferForm brand={brand} onSaved={handleSectionSaved} />
        )}
        {activeTab === "content" && (
          <BrandContentForm brand={brand} onSaved={handleSectionSaved} />
        )}
      </div>

      <BrandVersionsDialog
        brandId={brand.id}
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        onRestored={refresh}
      />
    </div>
  )
}
