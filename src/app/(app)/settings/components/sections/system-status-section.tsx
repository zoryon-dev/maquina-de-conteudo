/**
 * System Status Section
 *
 * Displays which services are configured via environment variables.
 * This replaces the API Keys section after migration to system-controlled keys.
 */

"use client"

import * as React from "react"
import {
  Check,
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Shield,
  Database,
  Key,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { DevWorkerStatus } from "@/components/dev-worker-poller"
import type {
  SystemStatusResult,
  ServiceStatus,
} from "../../types/settings-types"

/**
 * Source badge component
 */
function SourceBadge({ source }: { source: "env" | "database" | "none" }) {
  switch (source) {
    case "env":
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
          <Shield className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium text-green-500">Sistema</span>
        </div>
      )
    case "database":
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
          <Database className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium text-blue-500">Database</span>
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
          <X className="h-3.5 w-3.5 text-white/40" />
          <span className="text-xs font-medium text-white/40">Não configurado</span>
        </div>
      )
  }
}

/**
 * Service Card Component
 */
interface ServiceCardProps {
  id: string
  status: ServiceStatus
}

function ServiceCard({ status }: ServiceCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-white/[0.02] transition-all duration-200",
        status.configured
          ? "border-green-500/10 hover:border-green-500/20"
          : "border-white/5 hover:border-white/10"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-white">{status.name}</h3>
            {status.required && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded">
                Obrigatório
              </span>
            )}
            <SourceBadge source={status.source} />
          </div>
          <p className="text-xs text-white/60">{status.description}</p>
        </div>

        {/* Documentation link */}
        {status.documentationUrl && (
          <a
            href={status.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-primary transition-colors flex items-center gap-1"
          >
            Docs <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Overall Status Banner
 */
interface OverallBannerProps {
  configured: boolean
}

function OverallBanner({ configured }: OverallBannerProps) {
  if (configured) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-white/90 font-medium">
            Sistema configurado corretamente
          </p>
          <p className="text-white/60 mt-1">
            Todos os serviços obrigatórios estão configurados via variáveis de
            ambiente. O sistema está pronto para uso.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
      <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="text-white/90 font-medium">
          Serviços obrigatórios não configurados
        </p>
        <p className="text-white/60 mt-1">
          Configure as seguintes variáveis de ambiente no servidor:
        </p>
        <ul className="mt-2 space-y-1 text-white/70">
          <li className="flex items-center gap-2">
            <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs">
              OPENROUTER_API_KEY
            </code>
          </li>
          <li className="flex items-center gap-2">
            <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs">
              VOYAGE_API_KEY
            </code>
          </li>
        </ul>
      </div>
    </div>
  )
}

/**
 * System Status Section Props
 */
export interface SystemStatusSectionProps {
  onChange?: () => void
  className?: string
}

/**
 * System Status Section Component
 */
export function SystemStatusSection({
  className,
}: SystemStatusSectionProps) {
  const [systemStatus, setSystemStatus] = React.useState<SystemStatusResult | null>(
    null
  )
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/settings/system-status")
      if (response.ok) {
        const status: SystemStatusResult = await response.json()
        setSystemStatus(status)
      }
    } catch (error) {
      toast.error("Erro ao carregar status do sistema")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  React.useEffect(() => {
    loadStatus()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadStatus()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-white">Status do Sistema</h2>
          <p className="text-sm text-white/60">Carregando...</p>
        </div>
        <div className="space-y-3 animate-pulse">
          <div className="h-20 bg-white/5 rounded-xl" />
          <div className="h-20 bg-white/5 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!systemStatus) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-white">Status do Sistema</h2>
          <p className="text-sm text-white/60">
            Não foi possível carregar o status do sistema
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-white">Status do Sistema</h2>
          <p className="text-sm text-white/60">
            Serviços configurados via variáveis de ambiente
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white disabled:opacity-50"
          title="Atualizar status"
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
        </button>
      </div>

      {/* Overall Status Banner */}
      <OverallBanner configured={systemStatus.overallConfigured} />

      {/* Info Banner about System-Controlled Keys */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Key className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-white/90">
            <span className="font-medium">API Keys controladas pelo sistema:</span>{" "}
            As chaves de API agora são configuradas via variáveis de ambiente no
            servidor. Entre em contato com o administrador do sistema para
            configurar novos serviços.
          </p>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/80">Serviços</h3>
        {Object.entries(systemStatus.services).map(([id, status]) => (
          <ServiceCard key={id} id={id} status={status} />
        ))}
      </div>

      {/* Database Fallback Notice */}
      {systemStatus.services.voyage.source === "database" && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <Database className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-white/90">
              <span className="font-medium">Modo de compatibilidade:</span> O
              Voyage AI está usando uma chave de API armazenada no banco de
              dados. Considere migrar para variável de ambiente.
            </p>
          </div>
        </div>
      )}

      {/* Worker Status (Development Only) */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/80">Sistema de Filas</h3>
        <DevWorkerStatus />
      </div>
    </div>
  )
}
