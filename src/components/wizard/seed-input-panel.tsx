"use client"

/**
 * SeedInputPanel — UI de entrada de seeds para o wizard BD.
 *
 * Fluxo: usuário escolhe tipo (tabs) → digita URL/texto → clica "Extrair".
 * Extração é ação EXPLÍCITA (zero auto-call). YouTube pode levar 10-60s;
 * isPending (useTransition) mantém a UI bloqueada enquanto aguarda.
 *
 * Seeds já extraídas renderizam numa lista com briefing editável inline
 * (textarea) — edição não re-extrai nem persiste automaticamente; o
 * consumidor do componente cuida via `onSeedsChange`.
 *
 * Props:
 *  - wizardId: id do content_wizard que recebe os seeds persistidos.
 *  - initialSeeds: seeds já persistidas (hidratação no server side).
 *  - onSeedsChange: callback opcional chamado após append/remove/edit local.
 */

import { useState, useTransition } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Trash2, Plus } from "lucide-react"
import {
  extractSeedAction,
  removeSeedAction,
} from "@/app/(app)/wizard/actions/extract-seed"
import type { SeedInput } from "@/lib/wizard-services/content-extractor.service"

type Seed = {
  type: SeedInput["type"]
  value: string
  briefing?: string
  metadata?: Record<string, unknown>
  extractedAt?: string
}

const TAB_ORDER = ["link", "youtube", "keyword", "theme", "insight"] as const

function placeholderFor(t: SeedInput["type"]): string {
  switch (t) {
    case "link":
      return "https://..."
    case "youtube":
      return "https://youtube.com/watch?v=..."
    case "keyword":
      return "Palavra-chave"
    case "theme":
      return "Tema"
    case "insight":
      return "Insight ou frase pronta"
  }
}

export function SeedInputPanel({
  wizardId,
  initialSeeds = [],
  onSeedsChange,
}: {
  wizardId: number
  initialSeeds?: Seed[]
  onSeedsChange?: (seeds: Seed[]) => void
}) {
  const [seeds, setSeeds] = useState<Seed[]>(initialSeeds)
  const [tab, setTab] = useState<SeedInput["type"]>("link")
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleExtract = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setError(null)

    const seed: SeedInput =
      tab === "link"
        ? { type: "link", url: trimmed }
        : tab === "youtube"
          ? { type: "youtube", url: trimmed }
          : { type: tab, value: trimmed }

    startTransition(async () => {
      const r = await extractSeedAction(wizardId, seed)
      if (!r.success) {
        setError(r.error)
        return
      }
      const newSeed: Seed = {
        type: r.data.seed.type,
        value:
          "value" in r.data.seed ? r.data.seed.value : r.data.seed.url,
        briefing: r.data.briefing,
        metadata: r.data.metadata,
        extractedAt: new Date().toISOString(),
      }
      const next = [...seeds, newSeed]
      setSeeds(next)
      onSeedsChange?.(next)
      setValue("")
    })
  }

  const handleRemove = (idx: number) => {
    startTransition(async () => {
      const r = await removeSeedAction(wizardId, idx)
      if (!r.success) {
        setError(r.error)
        return
      }
      const next = seeds.filter((_, i) => i !== idx)
      setSeeds(next)
      onSeedsChange?.(next)
    })
  }

  const handleBriefingEdit = (idx: number, briefing: string) => {
    const next = seeds.map((s, i) => (i === idx ? { ...s, briefing } : s))
    setSeeds(next)
    onSeedsChange?.(next)
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SeedInput["type"])}
      >
        <TabsList>
          <TabsTrigger value="link">Link</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
          <TabsTrigger value="keyword">Keyword</TabsTrigger>
          <TabsTrigger value="theme">Tema</TabsTrigger>
          <TabsTrigger value="insight">Insight</TabsTrigger>
        </TabsList>
        {TAB_ORDER.map((t) => (
          <TabsContent key={t} value={t} className="mt-3">
            <div className="flex gap-2">
              <Input
                placeholder={placeholderFor(t)}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleExtract()
                  }
                }}
              />
              <Button
                onClick={handleExtract}
                disabled={!value.trim() || isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Extrair
              </Button>
            </div>
            {t === "youtube" && (
              <p className="mt-2 text-xs text-white/40">
                Transcrição pode levar 10–60s.
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {error && (
        <div
          className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {seeds.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/70">
            Seeds ({seeds.length})
          </h4>
          {seeds.map((s, i) => (
            <div
              key={`${s.type}-${i}-${s.extractedAt ?? ""}`}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-white/40 truncate">
                  {s.type} — {s.value.slice(0, 60)}
                  {s.value.length > 60 ? "…" : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(i)}
                  disabled={isPending}
                  aria-label={`Remover seed ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={s.briefing ?? ""}
                onChange={(e) => handleBriefingEdit(i, e.target.value)}
                rows={6}
                placeholder="Briefing extraído (editável)"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
