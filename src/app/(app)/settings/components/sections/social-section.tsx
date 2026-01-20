/**
 * Social Media Section
 *
 * Manage Instagram and Facebook connections for content publishing.
 *
 * Features:
 * - View active connections
 * - Connect/disconnect accounts
 * - Connection status indicators
 */

"use client"

import { useState, useEffect } from "react"
import {
  Instagram,
  Facebook,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Social connection data from API
 */
interface SocialConnection {
  id: number
  platform: "instagram" | "facebook"
  accountId: string
  accountName: string | null
  accountUsername: string | null
  accountProfilePic: string | null
  status: "active" | "expired" | "revoked" | "error"
  lastVerifiedAt: string | null
  createdAt: string
}

interface SocialConnectionsResponse {
  connections: SocialConnection[]
}

/**
 * Platform configuration
 */
const PLATFORMS = {
  instagram: {
    name: "Instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-400",
    bgGradient: "from-pink-500/10 to-purple-500/10",
    description: "Conecte sua conta do Instagram Business para publicar posts.",
  },
  facebook: {
    name: "Facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-400",
    bgGradient: "from-blue-500/10",
    description: "Conecte sua Página do Facebook para publicar posts.",
  },
} as const

type PlatformKey = keyof typeof PLATFORMS

/**
 * Social Section Component
 */
export function SocialSection() {
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connecting, setConnecting] = useState<PlatformKey | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/social/connections")
      const data: SocialConnectionsResponse = await response.json()
      setConnections(data.connections)
    } catch (error) {
      console.error("Failed to fetch connections:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = (platform: PlatformKey) => {
    setConnecting(platform)
    // Redirect to OAuth flow
    window.location.href = `/api/social/oauth?platform=${platform}`
  }

  const handleDisconnect = async (id: number) => {
    setDeleting(id)
    try {
      const response = await fetch("/api/social/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== id))
      } else {
        const data = await response.json()
        console.error("Failed to disconnect:", data.error)
      }
    } catch (error) {
      console.error("Failed to disconnect:", error)
    } finally {
      setDeleting(null)
    }
  }

  const getStatusBadge = (status: SocialConnection["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
            <Check className="h-3 w-3" />
            Conectado
          </span>
        )
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
            <AlertCircle className="h-3 w-3" />
            Expirado
          </span>
        )
      case "revoked":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
            <AlertCircle className="h-3 w-3" />
            Revogado
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
            <AlertCircle className="h-3 w-3" />
            Erro
          </span>
        )
    }
  }

  const getConnectionForPlatform = (platform: PlatformKey) => {
    return connections.find((c) => c.platform === platform)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Conexões de Redes Sociais</h3>
          <p className="text-sm text-white/60 mt-1">
            Conecte suas contas para publicar conteúdo diretamente da plataforma.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchConnections}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <p className="font-medium text-blue-100 mb-1">Como funciona</p>
          <p className="text-blue-200/80">
            Ao conectar uma conta, você autoriza a plataforma a publicar conteúdo em seu nome.
            As credenciais são armazenadas de forma segura e você pode revogar o acesso a qualquer momento.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(PLATFORMS) as PlatformKey[]).map((platform) => {
          const config = PLATFORMS[platform]
          const Icon = config.icon
          const connection = getConnectionForPlatform(platform)
          const isConnected = connection?.status === "active"
          const isConnecting = connecting === platform
          const isDeleting = deleting === connection?.id

          return (
            <div
              key={platform}
              className={cn(
                "p-5 rounded-lg border bg-white/[0.02]",
                isConnected
                  ? `bg-gradient-to-br ${config.bgGradient} border-white/10`
                  : "border-white/5"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-lg bg-white/5",
                    config.color
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{config.label}</h4>
                    <p className="text-xs text-white/50 mt-0.5">
                      {isConnected
                        ? `@${connection?.accountUsername || connection?.accountName || "Conta conectada"}`
                        : "Não conectado"
                      }
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                {connection && getStatusBadge(connection.status)}
              </div>

              {/* Description */}
              {!isConnected && (
                <p className="text-sm text-white/60 mb-4">
                  {config.description}
                </p>
              )}

              {/* Connection details */}
              {isConnected && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Conectado em</span>
                    <span className="text-white/80">
                      {new Date(connection.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {connection.lastVerifiedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Verificado em</span>
                      <span className="text-white/80">
                        {new Date(connection.lastVerifiedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action button */}
              {isConnected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleDisconnect(connection.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Desconectando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Desconectar
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full bg-white text-black hover:bg-white/90"
                  onClick={() => handleConnect(platform)}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Conectar {config.label}
                    </>
                  )}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Environment warning */}
      {!process.env.META_APP_ID && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium text-yellow-100 mb-1">
              Integração não configurada
            </p>
            <p className="text-yellow-200/80">
              Para usar recursos de redes sociais, configure as variáveis de ambiente:
              <code className="block mt-2 p-2 rounded bg-black/30 text-xs font-mono">
                META_APP_ID<br />
                META_APP_SECRET<br />
                META_REDIRECT_URI
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
