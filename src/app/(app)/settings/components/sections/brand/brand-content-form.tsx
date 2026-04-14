"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  Layers,
  Radio,
  Megaphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateBrandSectionAction } from "@/app/(app)/settings/actions/brand"
import type { BrandForEdit } from "@/app/(app)/settings/actions/brand-schemas"
import type {
  BrandContent,
  BrandContentPilar,
  BrandContentCanal,
} from "@/lib/brands/schema"
import { StringListEditor } from "./_shared/string-list-editor"

type Props = {
  brand: BrandForEdit
  onSaved: () => void
}

function emptyPilar(): BrandContentPilar {
  return {
    nome: "",
    objetivo: "",
    logica: "",
    exemplos: [],
    cta: "",
    papelFunil: "",
  }
}

function emptyCanal(): BrandContentCanal {
  return {
    nome: "",
    frequencia: "",
    tom: "",
    prioridade: 0,
  }
}

export function BrandContentForm({ brand, onSaved }: Props) {
  const [state, setState] = React.useState<BrandContent>(() => ({
    pilares: brand.config.content.pilares.map((p) => ({
      ...p,
      exemplos: [...p.exemplos],
    })),
    canais: brand.config.content.canais.map((c) => ({ ...c })),
    ctaInstructionTemplate: brand.config.content.ctaInstructionTemplate ?? "",
  }))
  const [isSaving, setIsSaving] = React.useState(false)

  const updatePilar = (index: number, patch: Partial<BrandContentPilar>) => {
    setState((prev) => ({
      ...prev,
      pilares: prev.pilares.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }))
  }

  const addPilar = () => {
    setState((prev) => ({ ...prev, pilares: [...prev.pilares, emptyPilar()] }))
  }

  const removePilar = (index: number) => {
    setState((prev) => ({
      ...prev,
      pilares: prev.pilares.filter((_, i) => i !== index),
    }))
  }

  const updateCanal = (index: number, patch: Partial<BrandContentCanal>) => {
    setState((prev) => ({
      ...prev,
      canais: prev.canais.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }))
  }

  const addCanal = () => {
    setState((prev) => ({ ...prev, canais: [...prev.canais, emptyCanal()] }))
  }

  const removeCanal = (index: number) => {
    setState((prev) => ({
      ...prev,
      canais: prev.canais.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateBrandSectionAction(brand.id, "content", state)
      if (result.success) {
        onSaved()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Erro: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Pilares</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPilar}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar pilar
          </Button>
        </div>

        {state.pilares.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            Nenhum pilar cadastrado.
          </div>
        ) : (
          <div className="space-y-3">
            {state.pilares.map((pilar, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium text-white">
                    {pilar.nome || `Pilar ${idx + 1}`}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePilar(idx)}
                    className="h-7 gap-1.5 text-white/60 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Nome</Label>
                    <Input
                      value={pilar.nome}
                      onChange={(e) =>
                        updatePilar(idx, { nome: e.target.value })
                      }
                      placeholder="Ex: Educação tribal"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-white/70">Objetivo</Label>
                      <Textarea
                        value={pilar.objetivo}
                        onChange={(e) =>
                          updatePilar(idx, { objetivo: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-white/70">Lógica</Label>
                      <Textarea
                        value={pilar.logica}
                        onChange={(e) =>
                          updatePilar(idx, { logica: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-white/70">CTA</Label>
                      <Input
                        value={pilar.cta}
                        onChange={(e) =>
                          updatePilar(idx, { cta: e.target.value })
                        }
                        placeholder="Ex: Comenta TRIBO"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-white/70">
                        Papel no funil
                      </Label>
                      <Input
                        value={pilar.papelFunil}
                        onChange={(e) =>
                          updatePilar(idx, { papelFunil: e.target.value })
                        }
                        placeholder="Ex: Topo / Meio / Fundo"
                      />
                    </div>
                  </div>

                  <StringListEditor
                    label="Exemplos"
                    values={pilar.exemplos}
                    placeholder="Exemplo concreto"
                    onChange={(v) => updatePilar(idx, { exemplos: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Canais</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCanal}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar canal
          </Button>
        </div>

        {state.canais.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            Nenhum canal cadastrado.
          </div>
        ) : (
          <div className="space-y-2">
            {state.canais.map((canal, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3"
              >
                <div className="grid items-end gap-3 md:grid-cols-[1.2fr_1fr_1fr_0.7fr_auto]">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Nome</Label>
                    <Input
                      value={canal.nome}
                      onChange={(e) =>
                        updateCanal(idx, { nome: e.target.value })
                      }
                      placeholder="Ex: Instagram"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Frequência</Label>
                    <Input
                      value={canal.frequencia}
                      onChange={(e) =>
                        updateCanal(idx, { frequencia: e.target.value })
                      }
                      placeholder="Ex: 5x/semana"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Tom</Label>
                    <Input
                      value={canal.tom}
                      onChange={(e) =>
                        updateCanal(idx, { tom: e.target.value })
                      }
                      placeholder="Ex: Direto"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Prioridade</Label>
                    <Input
                      type="number"
                      value={canal.prioridade}
                      onChange={(e) =>
                        updateCanal(idx, {
                          prioridade: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCanal(idx)}
                    className="h-9 w-9 shrink-0 text-white/60 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-white">CTA BrandsDecoded</h3>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cta-instruction-template" className="text-xs text-white/70">
            Instrução do CTA (slide BD_CTA)
          </Label>
          <Input
            id="cta-instruction-template"
            value={state.ctaInstructionTemplate ?? ""}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                ctaInstructionTemplate: e.target.value || undefined,
              }))
            }
            placeholder='Ex: "Comenta uma palavra-chave relacionada ao tema"'
          />
          <p className="text-xs text-white/40">
            Texto exibido acima da palavra-chave no slide CTA. Deixe vazio para
            usar o padrão: &quot;Comenta a palavra abaixo:&quot;
          </p>
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-white/10 pt-4">
        <p className="text-xs text-white/50">
          {state.pilares.length}{" "}
          {state.pilares.length === 1 ? "pilar" : "pilares"} ·{" "}
          {state.canais.length}{" "}
          {state.canais.length === 1 ? "canal" : "canais"}
        </p>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </Button>
      </footer>
    </div>
  )
}
