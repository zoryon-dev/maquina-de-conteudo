/**
 * Dev Worker Poller - Client Component
 *
 * Em desenvolvimento, mantém o worker rodando automaticamente
 * processando jobs da fila a cada 5 segundos.
 *
 * Em produção, o Vercel Cron cuida disso automaticamente.
 */

"use client";

import { useEffect, useState, useRef } from "react";

export function DevWorkerPoller() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const pollWorker = async () => {
      try {
        await fetch("/api/workers/dev-poller?auto=true", {
          method: "GET",
          cache: "no-store",
        });
      } catch (error) {
        // Silent fail - dev worker poll error
      }
    };

    // Start polling
    pollWorker(); // Initial call

    // Poll every 5 seconds
    intervalRef.current = setInterval(pollWorker, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Don't render anything visible - this is a background component
  return null;
}

/**
 * DevWorkerStatus - Mostra o status do worker em desenvolvimento
 *
 * Uso: <DevWorkerStatus /> em qualquer lugar para ver visualmente o status
 * Agora sem estilo fixo, adequado para ser usado dentro de cards/seções
 */
export function DevWorkerStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<{
    pending: number;
    processing: number;
    redisConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/workers?test=true", {
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          setStatus({
            pending: data.queue?.pending || 0,
            processing: data.queue?.processing || 0,
            redisConfigured: data.redis?.configured || false,
          });
        }
      } catch (error) {
        // Silent fail - dev worker status error
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className={`bg-white/[0.02] text-white text-xs px-3 py-2 rounded-lg border border-white/10 flex items-center gap-3 ${className || ""}`}>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${status?.pending === 0 ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
        <span className="text-white/70">Worker:</span>
        <span>{status?.pending ?? 0} pendente(s)</span>
      </div>
      <div className="text-white/30">|</div>
      <div className="flex items-center gap-1.5">
        <span className="text-white/70">Redis:</span>
        <span className={status?.redisConfigured ? "text-green-400" : "text-red-400"}>
          {status?.redisConfigured ? "✓" : "✗"}
        </span>
      </div>
    </div>
  );
}
