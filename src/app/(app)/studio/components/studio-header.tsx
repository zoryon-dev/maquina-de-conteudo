/**
 * Studio Header Component
 *
 * Header do editor com:
 * - Título do projeto (editável)
 * - Seletor de tipo (carrossel, post, story)
 * - Botões de ação (salvar, publicar)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Check,
  ChevronDown,
  Image,
  Images,
  Smartphone,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStudioStore } from "@/stores/studio-store";
import type { StudioContentType } from "@/lib/studio-templates/types";
import { toast } from "sonner";

const CONTENT_TYPE_OPTIONS: {
  value: StudioContentType;
  label: string;
  icon: typeof Images;
  description: string;
}[] = [
  {
    value: "carousel",
    label: "Carrossel",
    icon: Images,
    description: "Múltiplos slides (até 10)",
  },
  {
    value: "single",
    label: "Post Único",
    icon: Image,
    description: "Uma única imagem",
  },
  {
    value: "story",
    label: "Story",
    icon: Smartphone,
    description: "Formato vertical 9:16",
  },
];

export function StudioHeader() {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const projectTitle = useStudioStore((state) => state.projectTitle);
  const contentType = useStudioStore((state) => state.contentType);
  const isDirty = useStudioStore((state) => state.isDirty);
  const isSaving = useStudioStore((state) => state.isSaving);
  const isPublishing = useStudioStore((state) => state.isPublishing);
  const setProjectTitle = useStudioStore((state) => state.setProjectTitle);
  const setContentType = useStudioStore((state) => state.setContentType);
  const setAspectRatio = useStudioStore((state) => state.setAspectRatio);
  const setSaving = useStudioStore((state) => state.setSaving);
  const setPublishing = useStudioStore((state) => state.setPublishing);
  const setDirty = useStudioStore((state) => state.setDirty);

  const currentTypeOption = CONTENT_TYPE_OPTIONS.find(
    (opt) => opt.value === contentType
  );

  const handleContentTypeChange = (type: StudioContentType) => {
    setContentType(type);
    // Ajustar aspect ratio automaticamente
    if (type === "story") {
      setAspectRatio("9:16");
    } else {
      setAspectRatio("3:4");
    }
  };

  const handleSave = async () => {
    // Validar título antes de salvar
    const state = useStudioStore.getState();
    if (!state.projectTitle || state.projectTitle.trim() === "" || state.projectTitle === "Novo Projeto") {
      toast.error("Defina um título para o projeto antes de salvar");
      setIsEditingTitle(true);
      return;
    }

    try {
      setSaving(true);

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
      console.error("[StudioHeader] Save error:", error);
      // Detectar erro de rede
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    // Validar título antes de publicar
    const state = useStudioStore.getState();
    if (!state.projectTitle || state.projectTitle.trim() === "" || state.projectTitle === "Novo Projeto") {
      toast.error("Defina um título para o projeto antes de publicar");
      setIsEditingTitle(true);
      return;
    }

    // Validar que há slides
    if (state.slides.length === 0) {
      toast.error("Adicione pelo menos um slide antes de publicar");
      return;
    }

    // Validar que os slides têm conteúdo
    const hasEmptySlides = state.slides.some(
      (slide) => !slide.content.texto1.trim()
    );
    if (hasEmptySlides) {
      toast.error("Preencha o texto de todos os slides antes de publicar");
      return;
    }

    try {
      setPublishing(true);

      toast.info("Gerando imagens... Isso pode levar alguns segundos.");

      const response = await fetch("/api/studio/publish", {
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
        throw new Error(result.error || "Erro ao publicar");
      }

      toast.success("Conteúdo publicado na biblioteca!");
      setDirty(false);

      // Redirecionar para a página do item
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        router.push("/library");
      }
    } catch (error) {
      console.error("[StudioHeader] Publish error:", error);
      // Detectar erro de rede
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Erro ao publicar conteúdo");
    } finally {
      setPublishing(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      if (
        confirm(
          "Você tem alterações não salvas. Deseja sair mesmo assim?"
        )
      ) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#0a0a0f] px-4 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-white/60 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Project Title */}
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditingTitle(false);
              }}
              autoFocus
              className="bg-white/5 border border-white/20 rounded px-3 py-1.5 text-white text-lg font-medium focus:outline-none focus:border-primary"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-medium text-white hover:text-white/80 transition-colors"
            >
              {projectTitle}
            </button>
          )}

          {isDirty && (
            <span className="w-2 h-2 bg-amber-500 rounded-full" title="Alterações não salvas" />
          )}
        </div>

        {/* Content Type Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
            >
              {currentTypeOption && (
                <>
                  <currentTypeOption.icon className="w-4 h-4" />
                  {currentTypeOption.label}
                </>
              )}
              <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-[#1a1a2e] border-white/10"
          >
            {CONTENT_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleContentTypeChange(option.value)}
                className="flex items-center gap-3 text-white/80 hover:text-white focus:text-white focus:bg-white/5"
              >
                <option.icon className="w-4 h-4" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-white/50">
                    {option.description}
                  </div>
                </div>
                {contentType === option.value && (
                  <Check className="w-4 h-4 ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-3">
        {/* Keyboard Shortcuts Help */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/5"
            >
              <Keyboard className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-64 bg-[#1a1a2e] border-white/10 text-white"
          >
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-white/90">Atalhos de Teclado</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Salvar</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">⌘/Ctrl + S</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Duplicar slide</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">⌘/Ctrl + D</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Navegar slides</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">← →</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Ir para slide</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">1-9</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Remover slide</span>
                  <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs">Delete</kbd>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Save Button */}
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="gap-2 bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar
        </Button>

        {/* Publish Button */}
        <Button
          onClick={handlePublish}
          disabled={isPublishing}
          className="gap-2 bg-primary text-black hover:bg-primary/90"
        >
          {isPublishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Publicar
        </Button>
      </div>
    </header>
  );
}
