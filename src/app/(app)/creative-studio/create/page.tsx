"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCreativeStudioStore } from "@/stores/creative-studio-store";
import { StylePresets } from "@/components/creative-studio/style-presets";
import { TemplateSelector } from "@/components/creative-studio/template-selector";
import { ModelSelector } from "@/components/creative-studio/model-selector";
import { FormatSelector } from "@/components/creative-studio/format-selector";
import { TextOverlayEditor } from "@/components/creative-studio/text-overlay-editor";
import { TextOverlayPreview } from "@/components/creative-studio/text-overlay-preview";
import { OutputGrid } from "@/components/creative-studio/output-grid";
import { GenerationQueue } from "@/components/creative-studio/generation-queue";
import { GenerationHistory } from "../components/generation-history";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { POLLING_INTERVAL_MS, MAX_QUANTITY_PER_FORMAT } from "@/lib/creative-studio/constants";
import type { TextOverlayConfig } from "@/lib/creative-studio/types";
import { useSSE } from "@/hooks/use-sse";
import { Sparkles, Minus, Plus, ArrowLeft, History, Heart, PlusCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// SSE event shape from the job stream
interface JobSSEEvent {
  type: string;
  data?: {
    status?: string;
    result?: unknown;
    error?: string;
    jobId?: number;
    message?: string;
  };
}

const DEFAULT_TEXT_CONFIG: TextOverlayConfig = {
  content: "",
  fontFamily: "Inter",
  fontSize: 36,
  fontWeight: "bold",
  textColor: "#ffffff",
  textAlign: "center",
  position: "center",
  textTransform: "none",
};

export default function CreativeStudioCreatePage() {
  const store = useCreativeStudioStore();
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  const [sseUrl, setSseUrl] = useState<string | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Set up SSE URL when generation starts
  useEffect(() => {
    if (store.isGenerating && store.currentJobId) {
      setSseUrl(`/api/jobs/${store.currentJobId}/stream`);
    } else {
      setSseUrl(null);
    }
  }, [store.isGenerating, store.currentJobId]);

  // ====================================================================
  // HELPER: Fetch full generation status (outputs, etc.)
  // ====================================================================
  const fetchGenerationStatus = useCallback(async () => {
    if (!store.currentJobId) return;

    try {
      const resp = await fetch(`/api/creative-studio/generate/${store.currentJobId}`);
      const data = await resp.json();

      if (!isMountedRef.current) return;

      if (data.status === "completed" || data.status === "failed") {
        store.setGenerating(false);
        setSseUrl(null);
        if (data.outputs) {
          store.setOutputs(data.outputs);
        }
        if (data.status === "failed") {
          setError(data.error || "Geracao falhou");
        }
      } else if (data.outputs && data.outputs.length > store.outputs.length) {
        store.setOutputs(data.outputs);
      }
    } catch {
      // Silent fail — SSE/polling will retry
    }
  }, [store]);

  // ====================================================================
  // SSE MESSAGE HANDLER
  // ====================================================================
  const handleSSEMessage = useCallback(
    async (event: JobSSEEvent) => {
      if (!isMountedRef.current) return;

      if (event.type === "completed") {
        // Job completed — fetch outputs
        await fetchGenerationStatus();
        return;
      }

      if (event.type === "failed") {
        store.setGenerating(false);
        setSseUrl(null);
        setError(event.data?.error || "Geracao falhou");
        return;
      }

      if (event.type === "status") {
        // Intermediate status — fetch to check for partial outputs
        await fetchGenerationStatus();
      }
    },
    [store, fetchGenerationStatus]
  );

  // ====================================================================
  // POLLING FALLBACK — used when SSE fails
  // ====================================================================
  const fallbackPoll = useCallback(async (): Promise<JobSSEEvent | null> => {
    if (!store.currentJobId) return null;

    try {
      const resp = await fetch(`/api/creative-studio/generate/${store.currentJobId}`);
      const data = await resp.json();

      if (!isMountedRef.current) return null;

      if (data.status === "completed") {
        if (data.outputs) {
          store.setOutputs(data.outputs);
        }
        store.setGenerating(false);
        return { type: "completed", data: { status: "completed" } };
      }

      if (data.status === "failed") {
        store.setGenerating(false);
        setError(data.error || "Geracao falhou");
        return { type: "failed", data: { status: "failed", error: data.error } };
      }

      // Partial outputs
      if (data.outputs && data.outputs.length > store.outputs.length) {
        store.setOutputs(data.outputs);
      }

      return { type: "status", data: { status: data.status } };
    } catch {
      return null;
    }
  }, [store]);

  // ====================================================================
  // SSE HOOK — real-time job status with polling fallback
  // ====================================================================
  useSSE<JobSSEEvent>({
    url: sseUrl,
    onMessage: handleSSEMessage,
    onError: (err) => {
      console.warn("[CreativeStudio] SSE error:", err.message);
      // The useSSE hook handles fallback to polling automatically
    },
    fallbackPollingMs: POLLING_INTERVAL_MS,
    fallbackPollFn: fallbackPoll,
  });

  const handleGenerate = async () => {
    if (!store.prompt.trim() && !templateSlug) {
      toast.error("Descreva a imagem ou selecione um template");
      return;
    }

    setError(null);
    store.setGenerating(true);
    store.setOutputs([]);

    try {
      const resp = await fetch("/api/creative-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          prompt: store.prompt,
          model: store.selectedModel,
          formats: store.selectedFormats,
          quantity: store.quantityPerFormat,
          textMode: store.textMode,
          textConfig: store.textConfig,
          presetId: store.selectedPreset,
          templateSlug,
          templateVars,
        }),
      });

      const data = await resp.json();

      if (!data.success) {
        throw new Error(data.error || "Falha ao iniciar geracao");
      }

      store.setGenerating(true, data.jobId, data.projectId);
    } catch (err) {
      store.setGenerating(false);
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleReusePrompt = (prompt: string, model: string, formats: string[]) => {
    store.setPrompt(prompt);
    if (model) store.setModel(model);
    if (formats.length > 0) store.setFormats(formats);
    setActiveTab("create");
  };

  const totalImages = store.selectedFormats.length * store.quantityPerFormat;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/creative-studio"
          className="size-8 rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/20 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="size-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Criar Imagem</h1>
          <p className="text-xs text-white/40">
            Descreva a imagem que deseja gerar
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="create" className="gap-1.5">
            <PlusCircle className="size-3.5" />
            Nova Geracao
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="size-3.5" />
            Historico
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5">
            <Heart className="size-3.5" />
            Favoritos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Create */}
        <TabsContent value="create">
          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            {/* Left: Config */}
            <div className="space-y-5">
              {/* Style Presets */}
              <StylePresets
                selectedPreset={store.selectedPreset}
                onSelect={store.setPreset}
              />

              {/* Template Selector */}
              <TemplateSelector
                selectedSlug={templateSlug}
                onSelect={(slug, vars) => {
                  setTemplateSlug(slug);
                  setTemplateVars(vars);
                }}
              />

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Prompt
                </label>
                <textarea
                  value={store.prompt}
                  onChange={(e) => store.setPrompt(e.target.value)}
                  placeholder="Descreva a imagem que deseja criar..."
                  rows={4}
                  className="w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2.5 text-sm outline-none resize-none"
                />
              </div>

              {/* Model */}
              <ModelSelector
                selectedModel={store.selectedModel}
                onChange={store.setModel}
              />

              {/* Format */}
              <FormatSelector
                selectedFormats={store.selectedFormats}
                onChange={store.setFormats}
              />

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Quantidade por formato
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      store.setQuantity(Math.max(1, store.quantityPerFormat - 1))
                    }
                    disabled={store.quantityPerFormat <= 1}
                    className="size-8 rounded-lg border border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 flex items-center justify-center disabled:opacity-30"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="text-sm font-medium text-white w-8 text-center">
                    {store.quantityPerFormat}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      store.setQuantity(
                        Math.min(MAX_QUANTITY_PER_FORMAT, store.quantityPerFormat + 1)
                      )
                    }
                    disabled={store.quantityPerFormat >= MAX_QUANTITY_PER_FORMAT}
                    className="size-8 rounded-lg border border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 flex items-center justify-center disabled:opacity-30"
                  >
                    <Plus className="size-3.5" />
                  </button>
                  <span className="text-xs text-white/30">
                    = {totalImages} imagem{totalImages !== 1 ? "ns" : ""}
                  </span>
                </div>
              </div>

              {/* Text Mode */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Texto na imagem
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: null, label: "Sem texto" },
                      { value: "ai_embedded" as const, label: "IA integra" },
                      { value: "canvas_overlay" as const, label: "Sobrepor" },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        store.setTextMode(value);
                        if (value === "canvas_overlay" && !store.textConfig) {
                          store.setTextConfig(DEFAULT_TEXT_CONFIG);
                        }
                      }}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors border ${
                        store.textMode === value
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {store.textMode === "canvas_overlay" && store.textConfig && (
                  <div className="space-y-4">
                    <TextOverlayEditor
                      config={store.textConfig}
                      onChange={store.setTextConfig}
                    />
                    <TextOverlayPreview
                      config={store.textConfig}
                      aspectRatio={
                        store.selectedFormats.includes("9:16")
                          ? "9 / 16"
                          : store.selectedFormats.includes("3:4")
                            ? "3 / 4"
                            : "1 / 1"
                      }
                    />
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={store.isGenerating}
                className="w-full h-11 text-sm font-semibold"
                size="lg"
              >
                <Sparkles className="size-4 mr-2" />
                {store.isGenerating
                  ? "Gerando..."
                  : `Gerar ${totalImages} imagem${totalImages !== 1 ? "ns" : ""}`}
              </Button>
            </div>

            {/* Right: Output */}
            <div className="space-y-4">
              <OutputGrid
                outputs={store.outputs}
                isLoading={store.isGenerating}
                expectedCount={totalImages}
              />
            </div>
          </div>

          {/* Generation Queue */}
          <GenerationQueue
            isGenerating={store.isGenerating}
            progress={
              store.isGenerating || store.outputs.length > 0
                ? {
                    current: store.outputs.length,
                    total: totalImages,
                    model: store.selectedModel,
                  }
                : undefined
            }
            error={error}
            onDismiss={() => setError(null)}
          />
        </TabsContent>

        {/* Tab: History */}
        <TabsContent value="history">
          <GenerationHistory onReusePrompt={handleReusePrompt} />
        </TabsContent>

        {/* Tab: Favorites */}
        <TabsContent value="favorites">
          <GenerationHistory
            favoritesOnly
            onReusePrompt={handleReusePrompt}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
