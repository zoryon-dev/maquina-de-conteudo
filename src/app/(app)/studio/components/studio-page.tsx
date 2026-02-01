/**
 * Studio Page Component
 *
 * Client Component principal que orquestra o Editor Visual.
 * Layout split view: Editor Panel (40%) | Canvas Panel (60%)
 */

"use client";

import { useEffect, useCallback } from "react";
import { useStudioStore, useActiveSlide } from "@/stores/studio-store";
import { StudioHeader } from "./studio-header";
import { EditorPanel } from "./editor/editor-panel";
import { CanvasPanel } from "./canvas/canvas-panel";
import { SlideNavigator } from "./canvas/slide-navigator";
import { useStudioKeyboard } from "../hooks/use-studio-keyboard";
import { toast } from "sonner";

export function StudioPage() {
  const activeSlide = useActiveSlide();
  const slides = useStudioStore((state) => state.slides);
  const activeSlideIndex = useStudioStore((state) => state.activeSlideIndex);
  const isDirty = useStudioStore((state) => state.isDirty);
  const setSaving = useStudioStore((state) => state.setSaving);
  const setDirty = useStudioStore((state) => state.setDirty);

  // Handler de salvamento para keyboard shortcut
  const handleSave = useCallback(async () => {
    if (!isDirty) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    try {
      setSaving(true);
      const state = useStudioStore.getState();

      const response = await fetch("/api/studio/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: {
            contentType: state.contentType,
            aspectRatio: state.aspectRatio,
            slides: state.slides,
            activeSlideIndex: state.activeSlideIndex,
            caption: state.caption,
            hashtags: state.hashtags,
            profile: state.profile,
            header: state.header,
            projectTitle: state.projectTitle,
          },
        }),
      });

      // Verificar HTTP status ANTES de parsear JSON
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erro do servidor: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao salvar");
      }

      setDirty(false);
      toast.success("Projeto salvo com sucesso!");
    } catch (error) {
      console.error("[StudioPage] Save error:", error);
      // Detectar erro de rede
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  }, [isDirty, setSaving, setDirty]);

  // Ativar keyboard shortcuts
  useStudioKeyboard({ onSave: handleSave });

  // Aviso antes de sair se houver alterações não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <StudioHeader />

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel - 40% */}
        <div className="w-[40%] min-w-[400px] max-w-[600px] border-r border-white/10 overflow-y-auto">
          <EditorPanel />
        </div>

        {/* Canvas Panel - 60% */}
        <div className="flex-1 flex flex-col bg-[#0a0a0f]">
          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <CanvasPanel />
          </div>

          {/* Slide Navigator */}
          <div className="border-t border-white/10 p-4">
            <SlideNavigator />
          </div>
        </div>
      </div>
    </div>
  );
}
