/**
 * Header Editor Component
 *
 * Editor de configurações do header:
 * - Categoria
 * - Marca/Brand
 * - Copyright
 */

"use client";

import { useStudioStore, useHeader } from "@/stores/studio-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function HeaderEditor() {
  const header = useHeader();
  const updateHeader = useStudioStore((state) => state.updateHeader);

  return (
    <div className="space-y-4">
      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="header-category" className="text-sm text-white/70">
          Categoria
        </Label>
        <Input
          id="header-category"
          value={header.category}
          onChange={(e) =>
            updateHeader({ category: e.target.value.toUpperCase() })
          }
          placeholder="ESTUDO DE CASO"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase"
        />
        <p className="text-xs text-white/40">
          Ex: ESTUDO DE CASO, DICA, TUTORIAL
        </p>
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label htmlFor="header-brand" className="text-sm text-white/70">
          Marca / Brand
        </Label>
        <Input
          id="header-brand"
          value={header.brand}
          onChange={(e) =>
            updateHeader({ brand: e.target.value.toUpperCase() })
          }
          placeholder="MINHA MARCA"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase"
        />
      </div>

      {/* Copyright */}
      <div className="space-y-2">
        <Label htmlFor="header-copyright" className="text-sm text-white/70">
          Copyright
        </Label>
        <Input
          id="header-copyright"
          value={header.copyright}
          onChange={(e) =>
            updateHeader({ copyright: e.target.value.toUpperCase() })
          }
          placeholder={`©COPYRIGHT ${new Date().getFullYear()}`}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 uppercase"
        />
      </div>

      {/* Presets */}
      <div className="pt-3 border-t border-white/10">
        <Label className="text-sm text-white/70 mb-2 block">Presets</Label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              updateHeader({
                category: "ESTUDO DE CASO",
                brand: header.brand,
                copyright: `©COPYRIGHT ${new Date().getFullYear()}`,
              })
            }
            className="px-3 py-1.5 text-xs text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
          >
            Estudo de Caso
          </button>
          <button
            onClick={() =>
              updateHeader({
                category: "DICA RÁPIDA",
                brand: header.brand,
                copyright: `©COPYRIGHT ${new Date().getFullYear()}`,
              })
            }
            className="px-3 py-1.5 text-xs text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
          >
            Dica Rápida
          </button>
          <button
            onClick={() =>
              updateHeader({
                category: "TUTORIAL",
                brand: header.brand,
                copyright: `©COPYRIGHT ${new Date().getFullYear()}`,
              })
            }
            className="px-3 py-1.5 text-xs text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
          >
            Tutorial
          </button>
          <button
            onClick={() =>
              updateHeader({
                category: "REFLEXÃO",
                brand: header.brand,
                copyright: `©COPYRIGHT ${new Date().getFullYear()}`,
              })
            }
            className="px-3 py-1.5 text-xs text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
          >
            Reflexão
          </button>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-white/40">
        O header aparece no topo de todos os slides.
      </p>
    </div>
  );
}
