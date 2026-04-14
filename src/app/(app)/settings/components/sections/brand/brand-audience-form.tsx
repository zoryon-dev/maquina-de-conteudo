"use client"

import * as React from "react"
import { toast } from "sonner"
import { Plus, Trash2, UserRound, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateBrandSectionAction } from "@/app/(app)/settings/actions/brand"
import type { BrandForEdit } from "@/app/(app)/settings/actions/brand-schemas"
import type { BrandAudience, BrandAvatar } from "@/lib/brands/schema"

type Props = {
  brand: BrandForEdit
  onSaved: () => void
}

function emptyAvatar(): BrandAvatar {
  return {
    nome: "",
    faixaSalarial: "",
    estagio: "",
    dores: [],
    busca: "",
    onde: "",
    transformacao: "",
  }
}

export function BrandAudienceForm({ brand, onSaved }: Props) {
  const [state, setState] = React.useState<BrandAudience>(() => ({
    avatares: brand.config.audience.avatares.map((a) => ({
      ...a,
      dores: [...a.dores],
    })),
    antiAvatar: brand.config.audience.antiAvatar,
  }))
  const [isSaving, setIsSaving] = React.useState(false)

  const updateAvatar = (index: number, patch: Partial<BrandAvatar>) => {
    setState((prev) => ({
      ...prev,
      avatares: prev.avatares.map((a, i) =>
        i === index ? { ...a, ...patch } : a
      ),
    }))
  }

  const addAvatar = () => {
    setState((prev) => ({
      ...prev,
      avatares: [...prev.avatares, emptyAvatar()],
    }))
  }

  const removeAvatar = (index: number) => {
    setState((prev) => ({
      ...prev,
      avatares: prev.avatares.filter((_, i) => i !== index),
    }))
  }

  const updateDor = (avatarIdx: number, doreIdx: number, value: string) => {
    setState((prev) => ({
      ...prev,
      avatares: prev.avatares.map((a, i) =>
        i === avatarIdx
          ? {
              ...a,
              dores: a.dores.map((d, di) => (di === doreIdx ? value : d)),
            }
          : a
      ),
    }))
  }

  const addDor = (avatarIdx: number) => {
    setState((prev) => ({
      ...prev,
      avatares: prev.avatares.map((a, i) =>
        i === avatarIdx ? { ...a, dores: [...a.dores, ""] } : a
      ),
    }))
  }

  const removeDor = (avatarIdx: number, doreIdx: number) => {
    setState((prev) => ({
      ...prev,
      avatares: prev.avatares.map((a, i) =>
        i === avatarIdx
          ? { ...a, dores: a.dores.filter((_, di) => di !== doreIdx) }
          : a
      ),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateBrandSectionAction(brand.id, "audience", state)
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
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Avatares</h3>
            <p className="text-xs text-white/50">
              Personas-alvo da marca — foco em transformação e dor real.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAvatar}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar avatar
          </Button>
        </div>

        {state.avatares.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            Nenhum avatar cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {state.avatares.map((avatar, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium text-white">
                      {avatar.nome || `Avatar ${idx + 1}`}
                    </h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAvatar(idx)}
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
                      value={avatar.nome}
                      onChange={(e) =>
                        updateAvatar(idx, { nome: e.target.value })
                      }
                      placeholder="Ex: Ana Prestadora"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">
                      Faixa salarial
                    </Label>
                    <Input
                      value={avatar.faixaSalarial}
                      onChange={(e) =>
                        updateAvatar(idx, { faixaSalarial: e.target.value })
                      }
                      placeholder="Ex: R$ 8k-20k/mês"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Estágio</Label>
                    <Input
                      value={avatar.estagio}
                      onChange={(e) =>
                        updateAvatar(idx, { estagio: e.target.value })
                      }
                      placeholder="Ex: Solo em crescimento"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">
                      O que busca
                    </Label>
                    <Textarea
                      value={avatar.busca}
                      onChange={(e) =>
                        updateAvatar(idx, { busca: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Onde está</Label>
                    <Textarea
                      value={avatar.onde}
                      onChange={(e) =>
                        updateAvatar(idx, { onde: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">
                      Transformação
                    </Label>
                    <Textarea
                      value={avatar.transformacao}
                      onChange={(e) =>
                        updateAvatar(idx, { transformacao: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-white/70">Dores</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addDor(idx)}
                      className="h-7 gap-1.5 text-xs text-white/70"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar dor
                    </Button>
                  </div>
                  {avatar.dores.length === 0 ? (
                    <p className="text-xs text-white/40">
                      Nenhuma dor cadastrada.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {avatar.dores.map((dor, di) => (
                        <div key={di} className="flex items-center gap-2">
                          <Input
                            value={dor}
                            onChange={(e) =>
                              updateDor(idx, di, e.target.value)
                            }
                            placeholder="Descreva uma dor"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDor(idx, di)}
                            className="h-9 w-9 shrink-0 text-white/60 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-semibold text-white">Anti-avatar</Label>
        <p className="text-xs text-white/50">
          Quem a marca NÃO atende — define rejeição explícita.
        </p>
        <Textarea
          value={state.antiAvatar}
          onChange={(e) =>
            setState((prev) => ({ ...prev, antiAvatar: e.target.value }))
          }
          rows={4}
          placeholder="Ex: gente que quer receita pronta e barato…"
        />
      </section>

      <footer className="flex items-center justify-between border-t border-white/10 pt-4">
        <p className="text-xs text-white/50">
          {state.avatares.length} {state.avatares.length === 1 ? "avatar" : "avatares"}
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
