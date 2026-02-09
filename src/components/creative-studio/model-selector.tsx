"use client";

import { cn } from "@/lib/utils";
import {
  CREATIVE_MODELS,
  DEFAULT_CREATIVE_MODEL,
} from "@/lib/creative-studio/constants";
import type { ModelCapability } from "@/lib/creative-studio/types";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Cpu } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ModelSelectorProps {
  selectedModel: string;
  onChange: (model: string) => void;
  filterCapability?: ModelCapability;
  disabled?: boolean;
}

const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  text2img: "Criar",
  img2img: "Variar",
  inpaint: "Inpaint",
  vision: "Visão",
};

export function ModelSelector({
  selectedModel,
  onChange,
  filterCapability,
  disabled,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filteredModels = filterCapability
    ? CREATIVE_MODELS.filter((m) => m.capabilities.includes(filterCapability))
    : CREATIVE_MODELS;

  const current =
    filteredModels.find((m) => m.id === selectedModel) ||
    filteredModels.find((m) => m.id === DEFAULT_CREATIVE_MODEL) ||
    filteredModels[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-all",
          "border border-white/10 bg-white/[0.02]",
          "text-white hover:border-white/20 hover:bg-white/[0.04]",
          "focus-visible:outline-none focus-visible:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-primary/50"
        )}
      >
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-white/40" />
          <span>{current?.name ?? "Selecionar modelo"}</span>
          {current && (
            <span className="text-white/40 text-xs">{current.provider}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-white/40 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl shadow-black/50 overflow-hidden">
          {filteredModels.map((model) => {
            const isActive = model.id === (current?.id ?? selectedModel);
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-white/40">{model.provider}</span>
                </div>
                <div className="flex gap-1">
                  {model.capabilities.map((cap) => (
                    <Badge
                      key={cap}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-white/10 text-white/50"
                    >
                      {CAPABILITY_LABELS[cap]}
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
