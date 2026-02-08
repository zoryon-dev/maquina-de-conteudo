"use client";

import { cn } from "@/lib/utils";

interface SideBySidePreviewProps {
  referenceUrl: string;
  replicaUrl?: string;
  referenceLabel?: string;
  replicaLabel?: string;
}

export function SideBySidePreview({
  referenceUrl,
  replicaUrl,
  referenceLabel = "Referência",
  replicaLabel = "Réplica",
}: SideBySidePreviewProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider text-center">
          {referenceLabel}
        </p>
        <div className="rounded-lg border border-white/10 overflow-hidden bg-black/20 aspect-square">
          <img
            src={referenceUrl}
            alt={referenceLabel}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider text-center">
          {replicaLabel}
        </p>
        <div className="rounded-lg border border-white/10 overflow-hidden bg-black/20 aspect-square">
          {replicaUrl ? (
            <img
              src={replicaUrl}
              alt={replicaLabel}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs text-white/20">Gerando...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
