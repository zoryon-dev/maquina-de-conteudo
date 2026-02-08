"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from "@/lib/creative-studio/constants";
import { Upload, X, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  label?: string;
  hint?: string;
  onUpload: (url: string, key: string) => void;
  currentUrl?: string | null;
  disabled?: boolean;
}

type UploadState = "idle" | "dragging" | "uploading" | "uploaded";

export function ImageUploader({
  label = "Imagem de referência",
  hint,
  onUpload,
  currentUrl,
  disabled,
}: ImageUploaderProps) {
  const [state, setState] = useState<UploadState>(currentUrl ? "uploaded" : "idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external currentUrl
  useEffect(() => {
    if (currentUrl) {
      setPreviewUrl(currentUrl);
      setState("uploaded");
    }
  }, [currentUrl]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Formato não suportado. Use JPG, PNG ou WebP.";
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return `Arquivo muito grande. Máximo: ${MAX_UPLOAD_SIZE_MB}MB`;
    }
    return null;
  };

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setState("uploading");
      setProgress(0);

      // Show local preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "creative-studio");

        // Simulated progress
        const progressInterval = setInterval(() => {
          setProgress((p) => Math.min(p + 15, 90));
        }, 200);

        const response = await fetch("/api/studio/upload-image", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setProgress(100);

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Erro ao fazer upload");
        }

        // Revoke local preview, use server URL
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(result.url);
        setState("uploaded");
        onUpload(result.url, result.key);
      } catch (err) {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        setState("idle");
        setError(err instanceof Error ? err.message : "Erro ao fazer upload");
      }
    },
    [onUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setState("dragging");
  };

  const handleDragLeave = () => {
    if (state === "dragging") setState("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setState("idle");
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFile(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) uploadFile(files[0]);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = () => {
    if (previewUrl && !currentUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setState("idle");
    setError(null);
    onUpload("", "");
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="size-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Uploaded state */}
      {state === "uploaded" && previewUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-h-64 object-contain bg-black/20"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <Upload className="size-4" />
                  Trocar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <X className="size-4" />
                  Remover
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 transition-all",
            state === "uploading"
              ? "border-primary/40 bg-primary/5 cursor-wait"
              : state === "dragging"
                ? "border-primary bg-primary/10 cursor-copy"
                : "border-white/20 bg-white/[0.02] hover:border-white/40 cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && state !== "uploading") fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className={cn(
                "size-12 rounded-full flex items-center justify-center transition-colors",
                state === "uploading"
                  ? "bg-primary/20"
                  : state === "dragging"
                    ? "bg-primary/20"
                    : "bg-white/5"
              )}
            >
              {state === "uploading" ? (
                <Loader2 className="size-6 text-primary animate-spin" />
              ) : (
                <ImageIcon
                  className={cn(
                    "size-6",
                    state === "dragging" ? "text-primary" : "text-white/40"
                  )}
                />
              )}
            </div>

            {state === "uploading" ? (
              <div className="w-full max-w-48 space-y-2">
                <p className="text-sm text-primary">Enviando...</p>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/80">
                  {state === "dragging"
                    ? "Solte a imagem aqui"
                    : "Arraste uma imagem ou clique para selecionar"}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {hint || `JPG, PNG ou WebP (máx. ${MAX_UPLOAD_SIZE_MB}MB)`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
