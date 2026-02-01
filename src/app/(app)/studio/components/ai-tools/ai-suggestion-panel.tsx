/**
 * AI Suggestion Panel Component
 *
 * Painel de sugestões IA para textos do slide.
 * Integra com a API /api/studio/ai-suggestions.
 */

"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SuggestionType = "headline" | "hook" | "context" | "conclusion" | "hashtags";

interface AiSuggestionPanelProps {
  type: SuggestionType;
  onSelect: (suggestion: string) => void;
  existingTexts?: {
    texto1?: string;
    texto2?: string;
    texto3?: string;
  };
}

const TYPE_LABELS: Record<SuggestionType, { label: string; placeholder: string }> = {
  headline: { label: "Headline", placeholder: "Ex: produtividade, marketing digital" },
  hook: { label: "Gancho", placeholder: "Ex: como aumentar vendas" },
  context: { label: "Contexto", placeholder: "Ex: estratégias de negócios" },
  conclusion: { label: "Conclusão", placeholder: "Ex: chamada para ação" },
  hashtags: { label: "Hashtags", placeholder: "Ex: empreendedorismo" },
};

export function AiSuggestionPanel({
  type,
  onSelect,
  existingTexts,
}: AiSuggestionPanelProps) {
  const [topic, setTopic] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const typeInfo = TYPE_LABELS[type];

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Digite um tópico para gerar sugestões");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/studio/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          context: {
            topic: topic.trim(),
            existingTexts,
          },
          count: 3,
        }),
      });

      // Verificar HTTP status ANTES de parsear JSON
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erro do servidor: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao gerar sugestões");
      }

      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("[AiSuggestion] Error:", error);
      // Detectar erro de rede
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Erro ao gerar sugestões");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setIsOpen(false);
    toast.success("Sugestão aplicada!");
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 text-xs text-primary/70 hover:text-primary hover:bg-primary/10"
      >
        <Sparkles className="w-3 h-3" />
        Sugerir com IA
      </Button>
    );
  }

  return (
    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">
            Sugerir {typeInfo.label}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/10 rounded"
        >
          <X className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Topic Input */}
      <div className="space-y-1.5">
        <Label className="text-xs text-white/60">Tópico</Label>
        <div className="flex gap-2">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={typeInfo.placeholder}
            className="flex-1 h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGenerate();
            }}
          />
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isLoading || !topic.trim()}
            className="gap-1.5 h-8 bg-primary text-black hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : suggestions.length > 0 ? (
              <RefreshCw className="w-3 h-3" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {isLoading ? "Gerando..." : suggestions.length > 0 ? "Recarregar" : "Gerar"}
          </Button>
        </div>
      </div>

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Sugestões</Label>
          <div className="space-y-1.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelect(suggestion)}
                className="w-full p-2 text-left text-sm text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-md transition-all flex items-start gap-2 group"
              >
                <span className="flex-1 line-clamp-2">{suggestion}</span>
                <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
