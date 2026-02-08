"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CREATIVE_TEMPLATES, fillTemplate } from "@/lib/creative-studio/templates";
import type { Template, TemplateVariable } from "@/lib/creative-studio/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Layout, X } from "lucide-react";

interface TemplateSelectorProps {
  selectedSlug: string | null;
  onSelect: (slug: string | null, vars: Record<string, string>) => void;
}

export function TemplateSelector({
  selectedSlug,
  onSelect,
}: TemplateSelectorProps) {
  const [configuring, setConfiguring] = useState<Template | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});

  const handleCardClick = (template: Template) => {
    if (selectedSlug === template.slug) {
      // Deselect
      onSelect(null, {});
      return;
    }
    // Open config dialog
    setVars({});
    setConfiguring(template);
  };

  const handleApply = () => {
    if (!configuring) return;
    onSelect(configuring.slug, vars);
    setConfiguring(null);
  };

  const hasRequiredFields = configuring
    ? configuring.variables
        .filter((v) => v.required)
        .every((v) => vars[v.key]?.trim())
    : false;

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Templates
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CREATIVE_TEMPLATES.map((template) => (
            <button
              key={template.slug}
              type="button"
              onClick={() => handleCardClick(template)}
              className={cn(
                "relative flex items-start gap-2.5 rounded-xl p-3 text-left transition-all border",
                selectedSlug === template.slug
                  ? "border-primary/50 bg-primary/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              )}
            >
              <Layout
                className={cn(
                  "size-4 shrink-0 mt-0.5",
                  selectedSlug === template.slug
                    ? "text-primary"
                    : "text-white/40"
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xs font-medium truncate",
                    selectedSlug === template.slug
                      ? "text-primary"
                      : "text-white/80"
                  )}
                >
                  {template.name}
                </p>
                <p className="text-[10px] text-white/40 truncate mt-0.5">
                  {template.description}
                </p>
              </div>
              {selectedSlug === template.slug && (
                <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="size-2.5 text-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Variable configuration dialog */}
      <Dialog
        open={!!configuring}
        onOpenChange={(open) => {
          if (!open) setConfiguring(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{configuring?.name}</DialogTitle>
            <DialogDescription>
              {configuring?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {configuring?.variables.map((v) => (
              <TemplateField
                key={v.key}
                variable={v}
                value={vars[v.key] ?? ""}
                onChange={(val) => setVars((prev) => ({ ...prev, [v.key]: val }))}
              />
            ))}
          </div>

          {/* Preview */}
          {configuring && Object.values(vars).some((v) => v.trim()) && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
                Preview do prompt
              </p>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-4">
                {fillTemplate(configuring.promptTemplate, vars)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfiguring(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!hasRequiredFields}
              onClick={handleApply}
            >
              Aplicar template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TemplateField({
  variable,
  value,
  onChange,
}: {
  variable: TemplateVariable;
  value: string;
  onChange: (val: string) => void;
}) {
  const inputClasses =
    "w-full rounded-lg !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50 px-3 py-2 text-sm outline-none transition-colors";

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-white/70">
        {variable.label}
        {variable.required && <span className="text-primary ml-0.5">*</span>}
      </label>

      {variable.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={variable.placeholder}
          rows={3}
          className={cn(inputClasses, "resize-none")}
        />
      ) : variable.type === "select" && variable.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">Selecione...</option>
          {variable.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={variable.placeholder}
          className={inputClasses}
        />
      )}
    </div>
  );
}
