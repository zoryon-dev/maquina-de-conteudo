/**
 * Profile Editor Component
 *
 * Editor de configurações do perfil:
 * - Avatar
 * - Nome
 * - Handle (@usuario)
 * - Badge verificado
 */

"use client";

import { useRef, useState } from "react";
import { Upload, X, BadgeCheck, Loader2 } from "lucide-react";
import { useStudioStore, useProfile } from "@/stores/studio-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function ProfileEditor() {
  const profile = useProfile();
  const updateProfile = useStudioStore((state) => state.updateProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (max 2MB para avatar)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("O avatar deve ter no máximo 2MB");
      return;
    }

    try {
      setIsUploading(true);

      // Upload para storage via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "avatar");

      const response = await fetch("/api/studio/upload-image", {
        method: "POST",
        body: formData,
      });

      // Verificar HTTP status ANTES de parsear JSON
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erro do servidor: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao fazer upload");
      }

      updateProfile({ avatarUrl: result.url });
      toast.success("Avatar atualizado!");
    } catch (error) {
      console.error("[ProfileEditor] Upload error:", error);
      // Detectar erro de rede
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Erro de conexão. Verifique sua internet.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Erro ao carregar imagem");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    updateProfile({ avatarUrl: undefined });
  };

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <div className="space-y-2">
        <Label className="text-sm text-white/70">Avatar</Label>
        <div className="flex items-center gap-4">
          {/* Avatar Preview */}
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 border border-white/20">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/50 to-purple-500/50" />
              )}
            </div>
            {profile.avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? "Enviando..." : "Alterar"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="profile-name" className="text-sm text-white/70">
          Nome
        </Label>
        <Input
          id="profile-name"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="Seu Nome"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      {/* Handle */}
      <div className="space-y-2">
        <Label htmlFor="profile-handle" className="text-sm text-white/70">
          Handle
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            @
          </span>
          <Input
            id="profile-handle"
            value={profile.handle.replace("@", "")}
            onChange={(e) =>
              updateProfile({ handle: `@${e.target.value.replace("@", "")}` })
            }
            placeholder="seu.handle"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-8"
          />
        </div>
      </div>

      {/* Verified Badge */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-[#1DA1F2]" />
          <span className="text-sm text-white/70">Badge Verificado</span>
        </div>
        <Switch
          checked={profile.showVerifiedBadge}
          onCheckedChange={(checked) =>
            updateProfile({ showVerifiedBadge: checked })
          }
        />
      </div>

      {/* Info */}
      <p className="text-xs text-white/40">
        Essas informações aparecem em todos os slides do carrossel.
      </p>
    </div>
  );
}
