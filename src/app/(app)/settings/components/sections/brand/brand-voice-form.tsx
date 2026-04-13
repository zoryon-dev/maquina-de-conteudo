"use client"

import * as React from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  updateBrandSectionAction,
  type BrandForEdit,
} from "@/app/(app)/settings/actions/brand"
import type { BrandVoice } from "@/lib/brands/schema"

type Props = {
  brand: BrandForEdit
  onSaved: (updatedAt: string) => void
}

type AtributoKey = keyof BrandVoice["atributos"]

const ATRIBUTOS: Array<{ key: AtributoKey; label: string; hint: string }> = [
  { key: "direto", label: "Direto", hint: "vai ao ponto, sem rodeios" },
  { key: "acessivel", label: "Acessível", hint: "fácil de entender" },
  { key: "firme", label: "Firme", hint: "tem opinião, não se dobra" },
  { key: "humano", label: "Humano", hint: "emoção, empatia, voz real" },
  { key: "tecnico", label: "Técnico", hint: "profundidade técnica" },
]

export function BrandVoiceForm({ brand, onSaved }: Props) {
  const [state, setState] = React.useState<BrandVoice>(brand.config.voice)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setState(brand.config.voice)
  }, [brand.config.voice])

  const updateAtributo = (key: AtributoKey, value: number) => {
    setState((prev) => ({
      ...prev,
      atributos: { ...prev.atributos, [key]: value },
    }))
  }

  const updateVocab = (
    field: "use" | "avoid",
    index: number,
    value: string
  ) => {
    setState((prev) => ({
      ...prev,
      vocabulario: {
        ...prev.vocabulario,
        [field]: prev.vocabulario[field].map((v, i) =>
          i === index ? value : v
        ),
      },
    }))
  }

  const addVocab = (field: "use" | "avoid") => {
    setState((prev) => ({
      ...prev,
      vocabulario: {
        ...prev.vocabulario,
        [field]: [...prev.vocabulario[field], ""],
      },
    }))
  }

  const removeVocab = (field: "use" | "avoid", index: number) => {
    setState((prev) => ({
      ...prev,
      vocabulario: {
        ...prev.vocabulario,
        [field]: prev.vocabulario[field].filter((_, i) => i !== index),
      },
    }))
  }

  const updateStringList = (
    field: "crencasCombatidas" | "antiPatterns",
    index: number,
    value: string
  ) => {
    setState((prev) => ({
      ...prev,
      [field]: prev[field].map((v, i) => (i === index ? value : v)),
    }))
  }

  const addStringItem = (field: "crencasCombatidas" | "antiPatterns") => {
    setState((prev) => ({ ...prev, [field]: [...prev[field], ""] }))
  }

  const removeStringItem = (
    field: "crencasCombatidas" | "antiPatterns",
    index: number
  ) => {
    setState((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateBrandSectionAction(brand.id, "voice", state)
    setIsSaving(false)
    if (result.success) {
      onSaved(result.data.updatedAt)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Atributos</h3>
          <p className="text-xs text-white/70">
            Intensidade de cada dimensão da voz (0–100).
          </p>
        </div>
        <div className="space-y-4">
          {ATRIBUTOS.map((attr) => {
            const value = state.atributos[attr.key]
            return (
              <div key={attr.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor={`attr-${attr.key}`}
                    className="text-sm text-white"
                  >
                    {attr.label}{" "}
                    <span className="text-xs text-white/40">— {attr.hint}</span>
                  </Label>
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-white">
                    {value}
                  </span>
                </div>
                <input
                  id={`attr-${attr.key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value}
                  onChange={(e) =>
                    updateAtributo(attr.key, Number(e.target.value))
                  }
                  className="w-full accent-primary"
                />
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-2">
        <Label htmlFor="tom" className="text-white">
          Tom
        </Label>
        <p className="text-xs text-white/70">
          Descreve em prosa o tom geral da marca.
        </p>
        <Textarea
          id="tom"
          rows={3}
          value={state.tom}
          onChange={(e) => setState((prev) => ({ ...prev, tom: e.target.value }))}
        />
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Vocabulário</h3>
          <p className="text-xs text-white/70">
            Termos preferidos vs. termos proibidos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-white">Use</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addVocab("use")}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            </div>
            {state.vocabulario.use.length === 0 ? (
              <p className="text-xs text-white/40">Nenhum termo.</p>
            ) : (
              <div className="space-y-1.5">
                {state.vocabulario.use.map((term, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Input
                      placeholder="Termo"
                      value={term}
                      onChange={(e) =>
                        updateVocab("use", index, e.target.value)
                      }
                      className="h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVocab("use", index)}
                      className="h-8 w-8 text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-white">Avoid</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addVocab("avoid")}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            </div>
            {state.vocabulario.avoid.length === 0 ? (
              <p className="text-xs text-white/40">Nenhum termo proibido.</p>
            ) : (
              <div className="space-y-1.5">
                {state.vocabulario.avoid.map((term, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Input
                      placeholder="Termo proibido"
                      value={term}
                      onChange={(e) =>
                        updateVocab("avoid", index, e.target.value)
                      }
                      className="h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVocab("avoid", index)}
                      className="h-8 w-8 text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Crenças combatidas
            </h3>
            <p className="text-xs text-white/70">
              Ideias contra as quais a marca se posiciona.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStringItem("crencasCombatidas")}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
        {state.crencasCombatidas.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma crença combatida.</p>
        ) : (
          <div className="space-y-2">
            {state.crencasCombatidas.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Ex: Conteúdo raso funciona a longo prazo."
                  value={item}
                  onChange={(e) =>
                    updateStringList(
                      "crencasCombatidas",
                      index,
                      e.target.value
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStringItem("crencasCombatidas", index)}
                  className="text-white/40 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Anti-padrões</h3>
            <p className="text-xs text-white/70">
              Construções de linguagem a evitar.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStringItem("antiPatterns")}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
        {state.antiPatterns.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum anti-padrão.</p>
        ) : (
          <div className="space-y-2">
            {state.antiPatterns.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Ex: Usar chavões de guru."
                  value={item}
                  onChange={(e) =>
                    updateStringList("antiPatterns", index, e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStringItem("antiPatterns", index)}
                  className="text-white/40 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
        <p className="text-xs text-white/70">
          {state.vocabulario.use.length} termos ·{" "}
          {state.vocabulario.avoid.length} proibidos ·{" "}
          {state.antiPatterns.length} anti-padrões
        </p>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isSaving ? "Salvando…" : "Salvar"}
        </Button>
      </footer>
    </div>
  )
}
