/**
 * Article Wizard — Step 1: Inputs
 *
 * Form for article configuration: keyword, type, URLs, word count, model, instructions.
 */

"use client"

import { useState } from "react"
import {
  KeyRound,
  Link2,
  FileText,
  Settings2,
  Sparkles,
  MessageSquare,
  Target,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CollapsibleSection } from "@/components/ui/collapsible"
import type { ArticleFormData } from "../article-wizard-page"

const ARTICLE_TYPES = [
  { value: "guia", label: "Guia Completo", description: "Tutorial passo a passo" },
  { value: "how-to", label: "How-To", description: "Como fazer algo" },
  { value: "listicle", label: "Listicle", description: "Lista com itens" },
  { value: "comparativo", label: "Comparativo", description: "X vs Y" },
  { value: "opiniao", label: "Opinião", description: "Artigo de opinião" },
  { value: "case-study", label: "Case Study", description: "Estudo de caso" },
]

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

  const handleSecondaryChange = (val: string) => {
    setSecondaryInput(val)
    const keywords = val
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
    updateField("secondaryKeywords", keywords.length > 0 ? keywords : undefined)
  }

  const canSubmit = !!formData.primaryKeyword?.trim()

  return (
    <div className="space-y-6 max-w-2xl">
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

      {/* Section 3: References */}
      <CollapsibleSection
        title="3. Referências"
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

      {/* Section 4: Settings */}
      <CollapsibleSection
        title="4. Configurações"
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
        </div>
      </CollapsibleSection>

      {/* Section 5: Custom Instructions */}
      <CollapsibleSection
        title="5. Instruções Customizadas"
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
