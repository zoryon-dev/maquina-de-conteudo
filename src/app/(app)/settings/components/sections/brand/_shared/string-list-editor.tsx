"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type StringListEditorProps = {
  label: string
  values: string[]
  placeholder?: string
  onChange: (values: string[]) => void
}

export function StringListEditor({
  label,
  values,
  placeholder,
  onChange,
}: StringListEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-white/70">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...values, ""])}
          className="h-7 gap-1.5 text-xs text-white/70"
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      </div>
      {values.length === 0 ? (
        <p className="text-xs text-white/40">Vazio.</p>
      ) : (
        <div className="space-y-1.5">
          {values.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={v}
                onChange={(e) =>
                  onChange(
                    values.map((x, xi) => (xi === i ? e.target.value : x))
                  )
                }
                placeholder={placeholder}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(values.filter((_, xi) => xi !== i))}
                className="h-9 w-9 shrink-0 text-white/60 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
