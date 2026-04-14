"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  Package,
  GraduationCap,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateBrandSectionAction } from "@/app/(app)/settings/actions/brand"
import type { BrandForEdit } from "@/app/(app)/settings/actions/brand-schemas"
import type {
  BrandOffer,
  BrandSetor,
  BrandCourse,
} from "@/lib/brands/schema"
import { StringListEditor } from "./_shared/string-list-editor"

type Props = {
  brand: BrandForEdit
  onSaved: () => void
}

function shortId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID().slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

function emptySetor(): BrandSetor {
  return {
    id: `setor-${shortId()}`,
    nome: "",
    inclui: [],
    problemas: [],
    metricas: [],
    precoSetup: "",
    precoRecorrencia: "",
  }
}

function emptyCourse(): BrandCourse {
  return {
    id: `curso-${shortId()}`,
    nome: "",
    preco: "",
    modulos: [],
    prerequisitos: [],
    targetAvatar: "",
  }
}

export function BrandOfferForm({ brand, onSaved }: Props) {
  const [state, setState] = React.useState<BrandOffer>(() => ({
    setores: brand.config.offer.setores.map((s) => ({
      ...s,
      inclui: [...s.inclui],
      problemas: [...s.problemas],
      metricas: [...s.metricas],
    })),
    pricing: { ...brand.config.offer.pricing },
    courses: brand.config.offer.courses.map((c) => ({
      ...c,
      modulos: [...c.modulos],
      prerequisitos: [...c.prerequisitos],
    })),
  }))
  const [isSaving, setIsSaving] = React.useState(false)

  // Draft strings permitem input vazio/parcial sem zerar o state numérico.
  // Sincronizam com state.pricing em onBlur (parse com fallback para valor atual).
  const [pricingDraft, setPricingDraft] = React.useState({
    setupMin: String(brand.config.offer.pricing.setupMin),
    setupMax: String(brand.config.offer.pricing.setupMax),
    recMin: String(brand.config.offer.pricing.recMin),
    recMax: String(brand.config.offer.pricing.recMax),
  })

  const commitPricingField = (field: keyof BrandOffer["pricing"]) => {
    const raw = pricingDraft[field].trim()
    const parsed = raw === "" ? NaN : Number(raw)
    if (Number.isFinite(parsed)) {
      setState((prev) => ({
        ...prev,
        pricing: { ...prev.pricing, [field]: parsed },
      }))
    } else {
      // Inválido: reverte o draft para o valor corrente do state (não zera).
      setPricingDraft((prev) => ({ ...prev, [field]: String(state.pricing[field]) }))
    }
  }

  const updateSetor = (index: number, patch: Partial<BrandSetor>) => {
    setState((prev) => ({
      ...prev,
      // id é imutável após criação para preservar referências em conteúdo gerado
      setores: prev.setores.map((s, i) =>
        i === index ? { ...s, ...patch, id: s.id } : s
      ),
    }))
  }

  const addSetor = () => {
    setState((prev) => ({ ...prev, setores: [...prev.setores, emptySetor()] }))
  }

  const removeSetor = (index: number) => {
    setState((prev) => ({
      ...prev,
      setores: prev.setores.filter((_, i) => i !== index),
    }))
  }

  const updateCourse = (index: number, patch: Partial<BrandCourse>) => {
    setState((prev) => ({
      ...prev,
      // id é imutável após criação para preservar referências em conteúdo gerado
      courses: prev.courses.map((c, i) =>
        i === index ? { ...c, ...patch, id: c.id } : c
      ),
    }))
  }

  const addCourse = () => {
    setState((prev) => ({ ...prev, courses: [...prev.courses, emptyCourse()] }))
  }

  const removeCourse = (index: number) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateBrandSectionAction(brand.id, "offer", state)
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
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-white">Pricing</h3>
        </div>
        <div className="grid gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Setup mín (R$)</Label>
            <Input
              type="number"
              value={pricingDraft.setupMin}
              onChange={(e) =>
                setPricingDraft((prev) => ({ ...prev, setupMin: e.target.value }))
              }
              onBlur={() => commitPricingField("setupMin")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Setup máx (R$)</Label>
            <Input
              type="number"
              value={pricingDraft.setupMax}
              onChange={(e) =>
                setPricingDraft((prev) => ({ ...prev, setupMax: e.target.value }))
              }
              onBlur={() => commitPricingField("setupMax")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Recorrência mín</Label>
            <Input
              type="number"
              value={pricingDraft.recMin}
              onChange={(e) =>
                setPricingDraft((prev) => ({ ...prev, recMin: e.target.value }))
              }
              onBlur={() => commitPricingField("recMin")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Recorrência máx</Label>
            <Input
              type="number"
              value={pricingDraft.recMax}
              onChange={(e) =>
                setPricingDraft((prev) => ({ ...prev, recMax: e.target.value }))
              }
              onBlur={() => commitPricingField("recMax")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Setores</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSetor}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar setor
          </Button>
        </div>

        {state.setores.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            Nenhum setor cadastrado.
          </div>
        ) : (
          <div className="space-y-3">
            {state.setores.map((setor, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium text-white">
                    {setor.nome || `Setor ${idx + 1}`}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSetor(idx)}
                    className="h-7 gap-1.5 text-white/60 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Nome</Label>
                    <Input
                      value={setor.nome}
                      onChange={(e) =>
                        updateSetor(idx, { nome: e.target.value })
                      }
                      placeholder="Ex: Clínicas de estética"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">ID</Label>
                    <Input
                      value={setor.id}
                      readOnly
                      disabled
                      className="text-white/50"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">
                      Preço setup
                    </Label>
                    <Input
                      value={setor.precoSetup}
                      onChange={(e) =>
                        updateSetor(idx, { precoSetup: e.target.value })
                      }
                      placeholder="Ex: R$ 3.500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">
                      Preço recorrência
                    </Label>
                    <Input
                      value={setor.precoRecorrencia}
                      onChange={(e) =>
                        updateSetor(idx, { precoRecorrencia: e.target.value })
                      }
                      placeholder="Ex: R$ 890/mês"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <StringListEditor
                    label="Inclui"
                    values={setor.inclui}
                    placeholder="Item incluído"
                    onChange={(v) => updateSetor(idx, { inclui: v })}
                  />
                  <StringListEditor
                    label="Problemas"
                    values={setor.problemas}
                    placeholder="Problema resolvido"
                    onChange={(v) => updateSetor(idx, { problemas: v })}
                  />
                  <StringListEditor
                    label="Métricas"
                    values={setor.metricas}
                    placeholder="Métrica de sucesso"
                    onChange={(v) => updateSetor(idx, { metricas: v })}
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
            <GraduationCap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Cursos</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCourse}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar curso
          </Button>
        </div>

        {state.courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            Nenhum curso cadastrado.
          </div>
        ) : (
          <div className="space-y-3">
            {state.courses.map((course, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium text-white">
                    {course.nome || `Curso ${idx + 1}`}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCourse(idx)}
                    className="h-7 gap-1.5 text-white/60 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Nome</Label>
                    <Input
                      value={course.nome}
                      onChange={(e) =>
                        updateCourse(idx, { nome: e.target.value })
                      }
                      placeholder="Ex: Conteúdo Tribal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Preço</Label>
                    <Input
                      value={course.preco}
                      onChange={(e) =>
                        updateCourse(idx, { preco: e.target.value })
                      }
                      placeholder="Ex: R$ 2.497"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">
                      Target avatar
                    </Label>
                    <Input
                      value={course.targetAvatar}
                      onChange={(e) =>
                        updateCourse(idx, { targetAvatar: e.target.value })
                      }
                      placeholder="Ex: Ana Prestadora"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <StringListEditor
                    label="Módulos"
                    values={course.modulos}
                    placeholder="Nome do módulo"
                    onChange={(v) => updateCourse(idx, { modulos: v })}
                  />
                  <StringListEditor
                    label="Pré-requisitos"
                    values={course.prerequisitos}
                    placeholder="Pré-requisito"
                    onChange={(v) => updateCourse(idx, { prerequisitos: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="flex items-center justify-between border-t border-white/10 pt-4">
        <p className="text-xs text-white/50">
          {state.setores.length}{" "}
          {state.setores.length === 1 ? "setor" : "setores"} ·{" "}
          {state.courses.length}{" "}
          {state.courses.length === 1 ? "curso" : "cursos"}
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
