"use client"

import * as React from "react"
import { Loader2, ImageOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  updateBrandSectionAction,
  type BrandForEdit,
} from "@/app/(app)/settings/actions/brand"
import type { BrandVisual } from "@/lib/brands/schema"

type Props = {
  brand: BrandForEdit
  onSaved: (updatedAt: string) => void
}

function LogoPreview({ url }: { url: string }) {
  const [errored, setErrored] = React.useState(false)

  React.useEffect(() => {
    setErrored(false)
  }, [url])

  if (!url) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-white/10 bg-white/[0.02] text-white/40">
        <ImageOff className="h-4 w-4" />
      </div>
    )
  }

  if (errored) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-300">
        <ImageOff className="h-4 w-4" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Preview"
      className="h-16 w-16 shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] object-contain"
      onError={() => setErrored(true)}
    />
  )
}

export function BrandVisualForm({ brand, onSaved }: Props) {
  const [state, setState] = React.useState<BrandVisual>(brand.config.visual)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setState(brand.config.visual)
  }, [brand.config.visual])

  const handleSave = async () => {
    setIsSaving(true)
    // Preserve tokens (read-only) — only logoUrl / logoAltUrl mudam pela UI.
    const payload: BrandVisual = {
      tokens: state.tokens,
      logoUrl: state.logoUrl,
      logoAltUrl: state.logoAltUrl,
    }
    const result = await updateBrandSectionAction(brand.id, "visual", payload)
    setIsSaving(false)
    if (result.success) {
      onSaved(result.data.updatedAt)
    } else {
      toast.error(result.error)
    }
  }

  const colorEntries = Object.entries(state.tokens.colors)
  const fontEntries = Object.entries(state.tokens.fonts)
  const spacingEntries = Object.entries(state.tokens.spacing)
  const shadowEntries = Object.entries(state.tokens.shadows)

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Logos</h3>
          <p className="text-xs text-white/70">
            URLs das logos usadas em exports e templates.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="logoUrl" className="text-white">
              Logo principal (URL)
            </Label>
            <div className="flex items-center gap-3">
              <LogoPreview url={state.logoUrl} />
              <Input
                id="logoUrl"
                value={state.logoUrl}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, logoUrl: e.target.value }))
                }
                placeholder="https://…/logo.png"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="logoAltUrl" className="text-white">
              Logo alternativa (URL)
            </Label>
            <div className="flex items-center gap-3">
              <LogoPreview url={state.logoAltUrl} />
              <Input
                id="logoAltUrl"
                value={state.logoAltUrl}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, logoAltUrl: e.target.value }))
                }
                placeholder="https://…/logo-alt.png"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Cores</h3>
            <p className="text-xs text-white/70">
              Paleta oficial (somente leitura — gerenciado via tokens).
            </p>
          </div>
          <span className="text-xs text-white/40">
            {colorEntries.length} tokens
          </span>
        </div>
        {colorEntries.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma cor definida.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {colorEntries.map(([name, hex]) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-md border border-white/[0.05] bg-white/[0.02] p-2"
              >
                <div
                  className="h-8 w-8 shrink-0 rounded border border-white/10"
                  style={{ background: hex }}
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-white">
                    {name}
                  </div>
                  <div className="truncate font-mono text-[10px] text-white/70">
                    {hex}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Tipografia</h3>
            <p className="text-xs text-white/70">Famílias/pesos (read-only).</p>
          </div>
          <span className="text-xs text-white/40">
            {fontEntries.length} tokens
          </span>
        </div>
        {fontEntries.length === 0 ? (
          <p className="text-xs text-white/40">Nenhuma fonte definida.</p>
        ) : (
          <ul className="space-y-1.5">
            {fontEntries.map(([name, value]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-white">{name}</span>
                <span
                  className="truncate text-xs text-white/70"
                  style={{ fontFamily: value }}
                >
                  {value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Spacing / Shadows</h3>
          <p className="text-xs text-white/70">Read-only.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/70">Spacing</span>
              <span className="text-xs text-white/40">
                {spacingEntries.length}
              </span>
            </div>
            {spacingEntries.length === 0 ? (
              <p className="text-xs text-white/40">—</p>
            ) : (
              <ul className="space-y-1">
                {spacingEntries.map(([name, value]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between rounded border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-xs"
                  >
                    <span className="text-white">{name}</span>
                    <span className="font-mono text-white/70">{value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/70">Shadows</span>
              <span className="text-xs text-white/40">
                {shadowEntries.length}
              </span>
            </div>
            {shadowEntries.length === 0 ? (
              <p className="text-xs text-white/40">—</p>
            ) : (
              <ul className="space-y-1">
                {shadowEntries.map(([name, value]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2 rounded border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-xs"
                  >
                    <span className="shrink-0 text-white">{name}</span>
                    <span className="truncate font-mono text-white/70">
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
        <p className="text-xs text-white/70">
          Tokens visuais são read-only · edição apenas de logos
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
