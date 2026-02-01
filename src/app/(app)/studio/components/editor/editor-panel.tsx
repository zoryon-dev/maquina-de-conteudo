/**
 * Editor Panel Component
 *
 * Painel lateral esquerdo com todas as opções de edição:
 * - Galeria de templates
 * - Editor de texto
 * - Color picker
 * - Image picker
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TemplateGallery } from "../templates/template-gallery";
import { TextEditor } from "./text-editor";
import { ColorPicker } from "./color-picker";
import { ImagePicker } from "./image-picker";
import { ProfileEditor } from "./profile-editor";
import { HeaderEditor } from "./header-editor";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-medium text-white/90">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/50" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/50" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function EditorPanel() {
  return (
    <div className="h-full bg-[#0f0f14]">
      {/* Template Selection */}
      <CollapsibleSection title="Template" defaultOpen={true}>
        <TemplateGallery />
      </CollapsibleSection>

      {/* Text Editor */}
      <CollapsibleSection title="Textos" defaultOpen={true}>
        <TextEditor />
      </CollapsibleSection>

      {/* Images */}
      <CollapsibleSection title="Imagens" defaultOpen={true}>
        <ImagePicker />
      </CollapsibleSection>

      {/* Colors */}
      <CollapsibleSection title="Cores" defaultOpen={false}>
        <ColorPicker />
      </CollapsibleSection>

      {/* Profile Settings */}
      <CollapsibleSection title="Perfil" defaultOpen={false}>
        <ProfileEditor />
      </CollapsibleSection>

      {/* Header Settings */}
      <CollapsibleSection title="Header" defaultOpen={false}>
        <HeaderEditor />
      </CollapsibleSection>
    </div>
  );
}
