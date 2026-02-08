"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCreativeStudioStore } from "@/stores/creative-studio-store";
import { ImageUploader } from "@/components/creative-studio/image-uploader";
import { FormatSelector } from "@/components/creative-studio/format-selector";
import { ModelSelector } from "@/components/creative-studio/model-selector";
import { StylePresets } from "@/components/creative-studio/style-presets";
import { OutputGrid } from "@/components/creative-studio/output-grid";
import { GenerationQueue } from "@/components/creative-studio/generation-queue";
import { Button } from "@/components/ui/button";
import { POLLING_INTERVAL_MS } from "@/lib/creative-studio/constants";
import {
  ArrowLeft,
  ArrowRight,
  Crop,
  Wand2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "upload" | "config" | "result";

const VARIATION_TYPES = [
  {
    id: "resize" as const,
    label: "Redimensionar",
    description: "Smart crop ou fill para novos formatos",
    icon: Crop,
  },
  {
    id: "restyle" as const,
    label: "Reestilizar",
    description: "Mude o estilo mantendo a composição",
    icon: Wand2,
  },
];

export default function CreativeStudioVaryPage() {
  const store = useCreativeStudioStore();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<"crop" | "fill">("crop");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    store.setMode("vary");
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Polling
  const pollStatus = useCallback(async () => {
    if (!store.currentJobId) return;
    try {
      const resp = await fetch(`/api/creative-studio/generate/${store.currentJobId}`);
      const data = await resp.json();
      if (!isMountedRef.current) return;

      if (data.status === "completed" || data.status === "failed") {
        store.setGenerating(false);
        if (data.outputs) store.setOutputs(data.outputs);
        if (data.status === "failed") setError(data.error || "Variação falhou");
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } else if (data.outputs?.length > store.outputs.length) {
        store.setOutputs(data.outputs);
      }
    } catch {}
  }, [store]);

  useEffect(() => {
    if (store.isGenerating && store.currentJobId) {
      pollingRef.current = setInterval(pollStatus, POLLING_INTERVAL_MS);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [store.isGenerating, store.currentJobId, pollStatus]);

  const handleGenerate = async () => {
    if (!store.sourceImageUrl) {
      toast.error("Faça upload de uma imagem primeiro");
      return;
    }

    setError(null);
    store.setOutputs([]);

    if (store.variationType === "resize") {
      // Direct resize — no generation needed
      try {
        store.setGenerating(true);
        const resp = await fetch("/api/creative-studio/resize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: store.sourceImageUrl,
            targetFormats: store.selectedFormats,
            fitMode,
          }),
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);

        store.setOutputs(
          data.results.map((r: { format: string; url: string; width: number; height: number }, i: number) => ({
            id: Date.now() + i,
            imageUrl: r.url,
            format: r.format,
            width: r.width,
            height: r.height,
          }))
        );
        store.setGenerating(false);
        setStep("result");
      } catch (err) {
        store.setGenerating(false);
        const msg = err instanceof Error ? err.message : "Erro";
        setError(msg);
        toast.error(msg);
      }
    } else {
      // Restyle — uses generation pipeline
      try {
        store.setGenerating(true);
        const resp = await fetch("/api/creative-studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "vary",
            prompt: store.prompt || "Recreate this image with a different artistic style while preserving the composition and subject.",
            model: store.selectedModel,
            formats: store.selectedFormats,
            quantity: 1,
            sourceImage: store.sourceImageUrl,
            variationType: store.variationType,
            presetId: store.selectedPreset,
          }),
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);

        store.setGenerating(true, data.jobId, data.projectId);
        setStep("result");
      } catch (err) {
        store.setGenerating(false);
        const msg = err instanceof Error ? err.message : "Erro";
        setError(msg);
        toast.error(msg);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/creative-studio"
          className="size-8 rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/20 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="size-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Variar Imagem</h1>
          <p className="text-xs text-white/40">
            Redimensione ou reestilize uma imagem existente
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["upload", "config", "result"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s === "upload" || (s === "config" && store.sourceImageUrl)) setStep(s);
              }}
              className={cn(
                "size-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                step === s
                  ? "bg-primary text-black"
                  : s === "upload" || (s === "config" && store.sourceImageUrl)
                    ? "bg-white/10 text-white/60 hover:bg-white/20"
                    : "bg-white/5 text-white/20"
              )}
            >
              {i + 1}
            </button>
            {i < 2 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="max-w-md mx-auto space-y-4">
          <ImageUploader
            currentUrl={store.sourceImageUrl}
            onUpload={(url, key) => {
              store.setSourceImage(url, key);
            }}
          />
          <Button
            onClick={() => setStep("config")}
            disabled={!store.sourceImageUrl}
            className="w-full"
          >
            Continuar <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step: Config */}
      {step === "config" && (
        <div className="space-y-6">
          {/* Source preview */}
          {store.sourceImageUrl && (
            <div className="flex justify-center">
              <img
                src={store.sourceImageUrl}
                alt="Source"
                className="max-h-40 rounded-lg border border-white/10"
              />
            </div>
          )}

          {/* Variation type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Tipo de variação
            </label>
            <div className="grid grid-cols-2 gap-3">
              {VARIATION_TYPES.map((vt) => (
                <button
                  key={vt.id}
                  type="button"
                  onClick={() => store.setVariationType(vt.id)}
                  className={cn(
                    "rounded-xl p-4 text-left border transition-all",
                    store.variationType === vt.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  )}
                >
                  <vt.icon
                    className={cn(
                      "size-5 mb-2",
                      store.variationType === vt.id ? "text-primary" : "text-white/50"
                    )}
                  />
                  <p className={cn("text-sm font-medium", store.variationType === vt.id ? "text-primary" : "text-white/80")}>
                    {vt.label}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{vt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Resize-specific: fit mode */}
          {store.variationType === "resize" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Modo
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { value: "crop" as const, label: "Crop inteligente" },
                    { value: "fill" as const, label: "Fill (fundo blur)" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFitMode(value)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-xs font-medium border transition-colors",
                      fitMode === value
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Restyle-specific: preset + prompt + model */}
          {store.variationType === "restyle" && (
            <>
              <StylePresets
                selectedPreset={store.selectedPreset}
                onSelect={store.setPreset}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Instruções de estilo
                </label>
                <textarea
                  value={store.prompt}
                  onChange={(e) => store.setPrompt(e.target.value)}
                  placeholder="Ex: Transforme num estilo watercolor com tons pastel..."
                  rows={3}
                  className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2.5 text-sm outline-none resize-none"
                />
              </div>
              <ModelSelector
                selectedModel={store.selectedModel}
                onChange={store.setModel}
                filterCapability="img2img"
              />
            </>
          )}

          {/* Format */}
          <FormatSelector
            selectedFormats={store.selectedFormats}
            onChange={store.setFormats}
          />

          <Button
            onClick={handleGenerate}
            disabled={store.isGenerating || !store.variationType}
            className="w-full h-11"
            size="lg"
          >
            <Sparkles className="size-4 mr-2" />
            {store.variationType === "resize" ? "Redimensionar" : "Reestilizar"}
          </Button>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <div className="space-y-4">
          <OutputGrid
            outputs={store.outputs}
            isLoading={store.isGenerating}
            expectedCount={store.selectedFormats.length}
          />
          <Button
            variant="outline"
            onClick={() => {
              store.reset();
              setStep("upload");
            }}
            className="border-white/10 text-white/70"
          >
            Nova variação
          </Button>
        </div>
      )}

      {/* Generation Queue */}
      <GenerationQueue
        isGenerating={store.isGenerating}
        progress={
          store.isGenerating
            ? {
                current: store.outputs.length,
                total: store.selectedFormats.length,
                model: store.selectedModel,
              }
            : undefined
        }
        error={error}
        onDismiss={() => setError(null)}
      />
    </div>
  );
}
