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

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Trash2, Plus } from "lucide-react"
import {
  extractSeedAction,
  removeSeedAction,
  updateSeedBriefingAction,
} from "@/app/(app)/wizard/actions/extract-seed"
import type { SeedInput } from "@/lib/wizard-services/content-extractor.service"

/**
 * Debounce simples pra callbacks — coalesceia múltiplos edits consecutivos
 * numa única chamada ao server. Timer é limpo no unmount (cleanup no
 * useEffect) pra evitar setState em componente desmontado.
 */
function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fnRef = useRef(fn)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (...args: Args) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        fnRef.current(...args)
      }, delay)
    },
    [delay]
  )
}

/**
 * Shape local alinhado com `StoredSeed` do server. Inclui `id` (UUID gerado
 * server-side) pra endereçamento estável — remove/edit usam seedId em vez
 * de índice de array, evitando bugs off-by-one quando seeds são removidas
 * em paralelo. Fallback: UUID client-side se o server não retornar id.
 */
type Seed = {
  id: string
  type: SeedInput["type"]
  value: string
  briefing?: string
  metadata?: Record<string, unknown>
  extractedAt?: string
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `seed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
  // Set de seedIds com edit pendente de salvar (debounce enfileirado ou
  // request em flight) — alimenta o indicador "salvando…" por card.
  const [savingBriefings, setSavingBriefings] = useState<Set<string>>(
    () => new Set()
  )

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
      try {
        const r = await extractSeedAction(wizardId, seed)
        if (!r.success) {
          setError(r.error)
          return
        }
        // Server retorna `id` no payload estendido; fallback pra UUID client
        // se o server ainda não emitir a chave.
        const returnedId =
          "id" in r.data.seed && typeof r.data.seed.id === "string"
            ? r.data.seed.id
            : undefined
        const newSeed: Seed = {
          id: returnedId ?? genId(),
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
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Falha inesperada ao extrair. Tente novamente."
        setError(msg)
        console.error("[seed-panel] extract failed:", err)
      }
    })
  }

  const handleRemove = (seedId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        const r = await removeSeedAction(wizardId, seedId)
        if (!r.success) {
          setError(r.error)
          return
        }
        const next = seeds.filter((s) => s.id !== seedId)
        setSeeds(next)
        onSeedsChange?.(next)
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Falha ao remover seed. Tente novamente."
        setError(msg)
        console.error("[seed-panel] remove failed:", err)
      }
    })
  }

  // Persiste edit do briefing via debounce (1s) — evita hammer no server
  // enquanto o usuário digita. Falha não reverte o estado local, apenas
  // exibe erro; próxima edição tenta de novo.
  const saveBriefing = useCallback(
    (seedId: string, briefing: string) => {
      updateSeedBriefingAction(wizardId, seedId, briefing)
        .then((r) => {
          if (!r.success) {
            setError(`Falha ao salvar edição: ${r.error}`)
          }
        })
        .catch((err) => {
          console.error("[seed-panel] save briefing failed:", err)
          setError("Falha ao salvar edição.")
        })
        .finally(() => {
          setSavingBriefings((prev) => {
            if (!prev.has(seedId)) return prev
            const next = new Set(prev)
            next.delete(seedId)
            return next
          })
        })
    },
    [wizardId]
  )
  const debouncedSaveBriefing = useDebouncedCallback(saveBriefing, 1000)

  const handleBriefingEdit = (seedId: string, briefing: string) => {
    const next = seeds.map((s) => (s.id === seedId ? { ...s, briefing } : s))
    setSeeds(next)
    onSeedsChange?.(next)
    setSavingBriefings((prev) => {
      if (prev.has(seedId)) return prev
      const nextSet = new Set(prev)
      nextSet.add(seedId)
      return nextSet
    })
    debouncedSaveBriefing(seedId, briefing)
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as SeedInput["type"])
          // Limpa input + erro pra evitar vazamento de conteúdo entre
          // tipos diferentes de seed (um URL em "link" não faz sentido
          // como "keyword", por exemplo).
          setValue("")
          setError(null)
        }}
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
              key={s.id}
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
                  onClick={() => handleRemove(s.id)}
                  disabled={isPending}
                  aria-label={`Remover seed ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={s.briefing ?? ""}
                onChange={(e) => handleBriefingEdit(s.id, e.target.value)}
                rows={6}
                placeholder="Briefing extraído (editável)"
              />
              {savingBriefings.has(s.id) && (
                <p
                  className="text-xs text-white/40 flex items-center gap-1"
                  aria-live="polite"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  salvando…
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
