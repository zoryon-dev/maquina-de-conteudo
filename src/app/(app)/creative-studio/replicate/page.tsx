"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCreativeStudioStore } from "@/stores/creative-studio-store";
import { ImageUploader } from "@/components/creative-studio/image-uploader";
import { FormatSelector } from "@/components/creative-studio/format-selector";
import { ModelSelector } from "@/components/creative-studio/model-selector";
import { SideBySidePreview } from "@/components/creative-studio/side-by-side-preview";
import { OutputGrid } from "@/components/creative-studio/output-grid";
import { GenerationQueue } from "@/components/creative-studio/generation-queue";
import { Button } from "@/components/ui/button";
import { POLLING_INTERVAL_MS } from "@/lib/creative-studio/constants";
import type { ImageAnalysis } from "@/lib/creative-studio/types";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  Palette,
  Type,
  Layout,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "upload" | "analyze" | "edit" | "result";

export default function CreativeStudioReplicatePage() {
  const store = useCreativeStudioStore();
  const [step, setStep] = useState<Step>("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(false);
  const pollErrorCount = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    store.setMode("replicate");
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
        if (data.status === "failed") setError(data.error || "Replicação falhou");
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } else if (data.outputs?.length > store.outputs.length) {
        store.setOutputs(data.outputs);
      }
      pollErrorCount.current = 0;
    } catch (err) {
      pollErrorCount.current++;
      if (pollErrorCount.current >= 10) {
        console.error("[CreativeStudio:Polling] Too many consecutive errors, stopping", err);
        store.setGenerating(false);
        setError("Erro de conexão ao verificar status. Tente recarregar a página.");
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }
  }, [store]);

  useEffect(() => {
    if (store.isGenerating && store.currentJobId) {
      pollingRef.current = setInterval(pollStatus, POLLING_INTERVAL_MS);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [store.isGenerating, store.currentJobId, pollStatus]);

  const handleAnalyze = async () => {
    if (!store.referenceImageUrl) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const resp = await fetch("/api/creative-studio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: store.referenceImageUrl }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      store.setAnalysis(data.analysis);
      setStep("edit");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro na análise";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!store.referenceImageUrl || !store.analysis) {
      toast.error("Análise de referência é necessária");
      return;
    }

    setError(null);
    store.setOutputs([]);
    store.setGenerating(true);

    try {
      const resp = await fetch("/api/creative-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "replicate",
          prompt: store.prompt || "Replicate the visual style of the reference image.",
          model: store.selectedModel,
          formats: store.selectedFormats,
          quantity: 1,
          sourceImage: store.referenceImageUrl,
          analysisData: store.analysis,
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
          <h1 className="text-lg font-bold text-white">Replicar Estilo</h1>
          <p className="text-xs text-white/40">
            Analise uma referência e gere variações no mesmo estilo
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(["upload", "analyze", "edit", "result"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "size-7 rounded-full flex items-center justify-center text-xs font-medium",
                step === s
                  ? "bg-primary text-black"
                  : "bg-white/10 text-white/40"
              )}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-6 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="max-w-md mx-auto space-y-4">
          <ImageUploader
            currentUrl={store.referenceImageUrl}
            onUpload={(url, key) => store.setReferenceImage(url, key)}
          />
          <Button
            onClick={() => {
              setStep("analyze");
              handleAnalyze();
            }}
            disabled={!store.referenceImageUrl}
            className="w-full"
          >
            Analisar referência <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step: Analyzing */}
      {step === "analyze" && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          {isAnalyzing ? (
            <>
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-sm text-white/60">
                Analisando referência com Gemini Vision...
              </p>
              <p className="text-xs text-white/30">
                Extraindo layout, cores, tipografia e estilo
              </p>
            </>
          ) : error ? (
            <>
              <p className="text-sm text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                className="border-white/10"
              >
                Tentar novamente
              </Button>
            </>
          ) : null}
        </div>
      )}

      {/* Step: Edit analysis */}
      {step === "edit" && store.analysis && (
        <div className="space-y-6">
          {/* Reference preview */}
          {store.referenceImageUrl && (
            <div className="flex justify-center">
              <img
                src={store.referenceImageUrl}
                alt="Reference"
                className="max-h-40 rounded-lg border border-white/10"
              />
            </div>
          )}

          {/* Analysis summary */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Análise Extraída
            </p>
            <div className="grid grid-cols-3 gap-3">
              <AnalysisCard
                icon={Layout}
                label="Layout"
                value={store.analysis.layout.type}
              />
              <AnalysisCard
                icon={Palette}
                label="Cores"
                value={store.analysis.colors.style}
                colors={store.analysis.colors.palette}
              />
              <AnalysisCard
                icon={Type}
                label="Estilo"
                value={store.analysis.style.mood}
              />
            </div>
            {store.analysis.style.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {store.analysis.style.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prompt override */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Ajustes (opcional)
            </label>
            <textarea
              value={store.prompt}
              onChange={(e) => store.setPrompt(e.target.value)}
              placeholder="Descreva mudanças ou mantenha vazio para replicar fielmente..."
              rows={3}
              className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2.5 text-sm outline-none resize-none"
            />
          </div>

          <ModelSelector
            selectedModel={store.selectedModel}
            onChange={store.setModel}
            filterCapability="img2img"
          />

          <FormatSelector
            selectedFormats={store.selectedFormats}
            onChange={store.setFormats}
          />

          <Button
            onClick={handleGenerate}
            disabled={store.isGenerating}
            className="w-full h-11"
            size="lg"
          >
            <Sparkles className="size-4 mr-2" />
            Replicar estilo
          </Button>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <div className="space-y-4">
          {store.referenceImageUrl && store.outputs[0] && (
            <SideBySidePreview
              referenceUrl={store.referenceImageUrl}
              replicaUrl={store.outputs[0].imageUrl}
            />
          )}
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
            Nova replicação
          </Button>
        </div>
      )}

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

function AnalysisCard({
  icon: Icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  colors?: string[];
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <Icon className="size-4 text-white/40 mb-1.5" />
      <p className="text-[10px] text-white/40">{label}</p>
      <p className="text-xs font-medium text-white/70 capitalize">{value}</p>
      {colors && (
        <div className="flex gap-1 mt-1.5">
          {colors.slice(0, 5).map((color) => (
            <div
              key={color}
              className="size-3.5 rounded-sm border border-white/10"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
