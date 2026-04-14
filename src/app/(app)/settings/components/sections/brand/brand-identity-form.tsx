"use client"

import * as React from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateBrandSectionAction } from "@/app/(app)/settings/actions/brand"
import type { BrandForEdit } from "@/app/(app)/settings/actions/brand-schemas"
import type { BrandIdentity } from "@/lib/brands/schema"

type Props = {
  brand: BrandForEdit
  onSaved: () => void
}

export function BrandIdentityForm({ brand, onSaved }: Props) {
  const [state, setState] = React.useState<BrandIdentity>(brand.config.identity)
  const [isSaving, setIsSaving] = React.useState(false)

  const updateField = <K extends keyof BrandIdentity>(
    key: K,
    value: BrandIdentity[K]
  ) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const addValue = () => {
    setState((prev) => ({
      ...prev,
      values: [...prev.values, { name: "", description: "" }],
    }))
  }

  const updateValue = (
    index: number,
    key: "name" | "description",
    value: string
  ) => {
    setState((prev) => ({
      ...prev,
      values: prev.values.map((v, i) =>
        i === index ? { ...v, [key]: value } : v
      ),
    }))
  }

  const removeValue = (index: number) => {
    setState((prev) => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index),
    }))
  }

  const addBelief = () => {
    setState((prev) => ({ ...prev, beliefs: [...prev.beliefs, ""] }))
  }

  const updateBelief = (index: number, value: string) => {
    setState((prev) => ({
      ...prev,
      beliefs: prev.beliefs.map((b, i) => (i === index ? value : b)),
    }))
  }

  const removeBelief = (index: number) => {
    setState((prev) => ({
      ...prev,
      beliefs: prev.beliefs.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateBrandSectionAction(brand.id, "identity", state)
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
      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mission" className="text-white">
            Missão
          </Label>
          <p className="text-xs text-white/70">
            Por que a marca existe — propósito maior.
          </p>
          <Textarea
            id="mission"
            rows={4}
            value={state.mission}
            onChange={(e) => updateField("mission", e.target.value)}
            placeholder="Ex: Democratizar o acesso à IA para pequenos negócios."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vision" className="text-white">
            Visão
          </Label>
          <p className="text-xs text-white/70">
            Onde a marca quer chegar no longo prazo.
          </p>
          <Textarea
            id="vision"
            rows={4}
            value={state.vision}
            onChange={(e) => updateField("vision", e.target.value)}
            placeholder="Ex: Ser referência em automação criativa até 2030."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="positioning" className="text-white">
            Posicionamento
          </Label>
          <p className="text-xs text-white/70">
            Como a marca se posiciona no mercado.
          </p>
          <Textarea
            id="positioning"
            rows={3}
            value={state.positioning}
            onChange={(e) => updateField("positioning", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="antiPositioning" className="text-white">
            Anti-posicionamento
          </Label>
          <p className="text-xs text-white/70">
            O que a marca <strong>não é</strong> — evita confusão.
          </p>
          <Textarea
            id="antiPositioning"
            rows={3}
            value={state.antiPositioning}
            onChange={(e) => updateField("antiPositioning", e.target.value)}
          />
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Valores</h3>
            <p className="text-xs text-white/70">
              Princípios que guiam a marca.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addValue}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar valor
          </Button>
        </div>

        {state.values.length === 0 ? (
          <p className="text-xs text-white/40">Nenhum valor adicionado.</p>
        ) : (
          <div className="space-y-3">
            {state.values.map((value, index) => (
              <div
                key={index}
                className="rounded-md border border-white/[0.05] bg-white/[0.02] p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Nome do valor"
                      value={value.name}
                      onChange={(e) =>
                        updateValue(index, "name", e.target.value)
                      }
                    />
                    <Textarea
                      rows={2}
                      placeholder="Descrição"
                      value={value.description}
                      onChange={(e) =>
                        updateValue(index, "description", e.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeValue(index)}
                    className="text-white/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Crenças</h3>
            <p className="text-xs text-white/70">
              Afirmações que a marca defende publicamente.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBelief}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar crença
          </Button>
        </div>

        {state.beliefs.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma crença adicionada.</p>
        ) : (
          <div className="space-y-2">
            {state.beliefs.map((belief, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Ex: Boa escrita vale mais que 10 ferramentas."
                  value={belief}
                  onChange={(e) => updateBelief(index, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBelief(index)}
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
          {state.values.length} valores · {state.beliefs.length} crenças
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
