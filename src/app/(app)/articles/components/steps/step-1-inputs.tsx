/**
 * Article Wizard — Step 1: Inputs
 *
 * Form for article configuration: keyword, type, URLs, word count, model, instructions.
 */

"use client"

import { useState, useEffect } from "react"
import {
  KeyRound,
  Link2,
  FileText,
  Settings2,
  Sparkles,
  MessageSquare,
  Target,
  User,
  Cpu,
  ChevronDown,
  FolderOpen,
  Loader2,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CollapsibleSection } from "@/components/ui/collapsible"
import type { ArticleFormData, ArticleModelConfig } from "../article-wizard-page"

const TEXT_MODELS = [
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { value: "openai/gpt-5.1", label: "GPT-5.1", provider: "OpenAI" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "OpenAI" },
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", provider: "Anthropic" },
  { value: "anthropic/claude-opus-4.5", label: "Claude Opus 4.5", provider: "Anthropic" },
  { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", provider: "Anthropic" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", provider: "Google" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro", provider: "Google" },
  { value: "x-ai/grok-4.1-fast", label: "Grok 4.1 Fast", provider: "xAI" },
  { value: "x-ai/grok-4", label: "Grok 4", provider: "xAI" },
]

const MODEL_STEPS: Array<{ key: keyof ArticleModelConfig; label: string }> = [
  { key: "research", label: "Pesquisa" },
  { key: "outline", label: "Outline" },
  { key: "production", label: "Produção" },
  { key: "optimization", label: "Otimização" },
]

const ARTICLE_TYPES = [
  { value: "guia", label: "Guia Completo", description: "Tutorial passo a passo" },
  { value: "how-to", label: "How-To", description: "Como fazer algo" },
  { value: "listicle", label: "Listicle", description: "Lista com itens" },
  { value: "comparativo", label: "Comparativo", description: "X vs Y" },
  { value: "opiniao", label: "Opinião", description: "Artigo de opinião" },
  { value: "case-study", label: "Case Study", description: "Estudo de caso" },
]

interface ArticleCategory {
  id: number
  name: string
  slug: string
  color: string | null
}

const inputClasses =
  "!border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"

interface Step1InputsProps {
  formData: ArticleFormData
  onChange: (data: ArticleFormData) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function Step1Inputs({
  formData,
  onChange,
  onSubmit,
  isSubmitting,
}: Step1InputsProps) {
  const updateField = <K extends keyof ArticleFormData>(
    key: K,
    value: ArticleFormData[K],
  ) => {
    onChange({ ...formData, [key]: value })
  }

  const [secondaryInput, setSecondaryInput] = useState(
    formData.secondaryKeywords?.join(", ") || "",
  )
  const [showAdvancedModels, setShowAdvancedModels] = useState(false)
  const [categories, setCategories] = useState<ArticleCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  useEffect(() => {
    fetch("/api/articles/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.categories) setCategories(data.categories)
      })
      .catch(() => {})
      .finally(() => setIsLoadingCategories(false))
  }, [])

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setIsCreatingCategory(true)
    try {
      const res = await fetch("/api/articles/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const cat: ArticleCategory = await res.json()
        setCategories((prev) => [...prev, cat])
        setNewCategoryName("")
        updateField("categoryId", cat.id)
      }
    } catch { /* silent */ }
    setIsCreatingCategory(false)
  }

  const handleSecondaryChange = (val: string) => {
    setSecondaryInput(val)
    const keywords = val
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
    updateField("secondaryKeywords", keywords.length > 0 ? keywords : undefined)
  }

  const updateModelConfig = (key: keyof ArticleModelConfig, value: string) => {
    const current = formData.modelConfig || {}
    const updated = { ...current, [key]: value || undefined }
    // Remove empty keys
    for (const k of Object.keys(updated) as Array<keyof ArticleModelConfig>) {
      if (!updated[k]) delete updated[k]
    }
    updateField("modelConfig", Object.keys(updated).length > 0 ? updated : undefined)
  }

  const canSubmit = !!formData.primaryKeyword?.trim()

  return (
    <div className="space-y-6">
      {/* Section 1: Keywords */}
      <CollapsibleSection
        title="1. Keywords"
        description="Palavra-chave principal e secundárias"
        icon={KeyRound}
        defaultOpen
      >
        <div className="space-y-4">
          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
              <Target size={14} />
              Keyword Principal *
            </Label>
            <Input
              placeholder="Ex: marketing digital para iniciantes"
              value={formData.primaryKeyword || ""}
              onChange={(e) => updateField("primaryKeyword", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
              <KeyRound size={14} />
              Keywords Secundárias
            </Label>
            <Input
              placeholder="Separadas por vírgula: SEO, tráfego orgânico, conteúdo"
              value={secondaryInput}
              onChange={(e) => handleSecondaryChange(e.target.value)}
              className={inputClasses}
            />
            <p className="text-white/30 text-xs mt-1">
              Separe por vírgula
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Section 2: Article Type */}
      <CollapsibleSection
        title="2. Tipo de Artigo"
        description="Formato e estrutura do conteúdo"
        icon={FileText}
        defaultOpen
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ARTICLE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => updateField("articleType", type.value)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                formData.articleType === type.value
                  ? "border-primary/50 bg-primary/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
              }`}
            >
              <span className="font-medium block">{type.label}</span>
              <span className="text-[11px] text-white/40 block mt-0.5">{type.description}</span>
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* Section 3: Category */}
      <CollapsibleSection
        title="3. Categoria"
        description="Organize seu artigo por tema"
        icon={FolderOpen}
        defaultOpen={categories.length > 0}
      >
        {isLoadingCategories ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 size={16} className="animate-spin text-white/30" />
            <span className="text-sm text-white/30">Carregando categorias...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      updateField("categoryId", formData.categoryId === cat.id ? undefined : cat.id)
                    }
                    className={`text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                      formData.categoryId === cat.id
                        ? "border-primary/50 bg-primary/10 text-white"
                        : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                    }`}
                  >
                    <span className="font-medium block">{cat.name}</span>
                    <span className="text-[11px] text-white/40 block mt-0.5">{cat.slug}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Inline category creation */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nova categoria..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleCreateCategory() }
                }}
                className={`flex-1 h-9 text-sm ${inputClasses}`}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || isCreatingCategory}
                className="h-9 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              >
                {isCreatingCategory ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
              </Button>
            </div>
            {categories.length === 0 && (
              <p className="text-white/30 text-xs">
                Crie categorias para organizar seus artigos por tema
              </p>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Section 4: References */}
      <CollapsibleSection
        title="4. Referências"
        description="URLs de artigos para análise"
        icon={Link2}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
              <Link2 size={14} />
              URL do Artigo de Referência
            </Label>
            <Input
              placeholder="https://exemplo.com/artigo-referencia"
              value={formData.referenceUrl || ""}
              onChange={(e) => updateField("referenceUrl", e.target.value)}
              className={inputClasses}
            />
            <p className="text-white/30 text-xs mt-1">
              Artigo concorrente para análise e superação
            </p>
          </div>
          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
              <Link2 size={14} />
              URL do Artigo Mãe (Pillar)
            </Label>
            <Input
              placeholder="https://seusite.com/artigo-pillar"
              value={formData.referenceMotherUrl || ""}
              onChange={(e) => updateField("referenceMotherUrl", e.target.value)}
              className={inputClasses}
            />
            <p className="text-white/30 text-xs mt-1">
              Seu artigo pillar para manter consistência
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Section 5: Settings */}
      <CollapsibleSection
        title="5. Configurações"
        description="Contagem de palavras, autor e modelo de IA"
        icon={Settings2}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70 text-sm mb-2 block">
                Palavras Alvo
              </Label>
              <Input
                type="number"
                placeholder="2000"
                value={formData.targetWordCount || ""}
                onChange={(e) =>
                  updateField(
                    "targetWordCount",
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                className={inputClasses}
              />
            </div>
            <div>
              <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
                <User size={14} />
                Nome do Autor
              </Label>
              <Input
                placeholder="Opcional"
                value={formData.authorName || ""}
                onChange={(e) => updateField("authorName", e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
              <Sparkles size={14} />
              Título (opcional)
            </Label>
            <Input
              placeholder="Deixe em branco para gerar automaticamente"
              value={formData.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              className={inputClasses}
            />
          </div>

          {/* Model Selection */}
          <div>
            <Label className="text-white/70 text-sm flex items-center gap-2 mb-2">
              <Cpu size={14} />
              Modelo de IA
            </Label>
            <select
              value={formData.modelConfig?.default || formData.model || ""}
              onChange={(e) => {
                if (e.target.value) {
                  updateModelConfig("default", e.target.value)
                } else {
                  // Clear model config default
                  const current = formData.modelConfig || {}
                  const { default: _, ...rest } = current
                  updateField("modelConfig", Object.keys(rest).length > 0 ? rest : undefined)
                }
              }}
              className={`w-full h-10 rounded-md px-3 text-sm ${inputClasses}`}
            >
              <option value="" className="bg-[#1a1a2e]">Padrão do sistema</option>
              {["OpenAI", "Anthropic", "Google", "xAI"].map((provider) => (
                <optgroup key={provider} label={provider} className="bg-[#1a1a2e]">
                  {TEXT_MODELS.filter((m) => m.provider === provider).map((m) => (
                    <option key={m.value} value={m.value} className="bg-[#1a1a2e]">
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-white/30 text-xs mt-1">
              Usado em todas as etapas do pipeline
            </p>
          </div>

          {/* Advanced: Per-step model */}
          <button
            type="button"
            onClick={() => setShowAdvancedModels(!showAdvancedModels)}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 text-xs transition-colors"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${showAdvancedModels ? "rotate-180" : ""}`}
            />
            Modelo por etapa (avançado)
          </button>

          {showAdvancedModels && (
            <div className="space-y-3 pl-3 border-l border-white/10">
              {MODEL_STEPS.map((step) => (
                <div key={step.key}>
                  <Label className="text-white/50 text-xs mb-1 block">
                    {step.label}
                  </Label>
                  <select
                    value={formData.modelConfig?.[step.key] || ""}
                    onChange={(e) => updateModelConfig(step.key, e.target.value)}
                    className={`w-full h-9 rounded-md px-3 text-xs ${inputClasses}`}
                  >
                    <option value="" className="bg-[#1a1a2e]">Usar modelo padrão</option>
                    {TEXT_MODELS.map((m) => (
                      <option key={m.value} value={m.value} className="bg-[#1a1a2e]">
                        {m.label} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Section 6: Custom Instructions */}
      <CollapsibleSection
        title="6. Instruções Customizadas"
        description="Diretrizes específicas para o artigo"
        icon={MessageSquare}
      >
        <Textarea
          placeholder="Ex: Foque em exemplos práticos, use tom conversacional, inclua dados recentes de 2026..."
          value={formData.customInstructions || ""}
          onChange={(e) => updateField("customInstructions", e.target.value)}
          rows={4}
          className={inputClasses}
        />
      </CollapsibleSection>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className="bg-primary text-black hover:bg-primary/90 font-medium px-8"
        >
          {isSubmitting ? (
            <>
              <Sparkles size={16} className="mr-2 animate-spin" />
              Iniciando Pesquisa...
            </>
          ) : (
            <>
              <Sparkles size={16} className="mr-2" />
              Iniciar Pipeline
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
