/**
 * Social Media Section
 *
 * Manage Instagram and Facebook connections for content publishing.
 *
 * Features:
 * - View active connections
 * - Connect/disconnect accounts
 * - Connection status indicators
 * - Page selection for Instagram/Facebook connections
 */

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  Instagram,
  Facebook,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Info,
  X,
  Users,
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

/**
 * Page selection data from OAuth callback
 */
interface PageOption {
  pageId: string
  pageName: string
  username?: string
  picture?: string
  category?: string
  // Instagram specific - from API
  instagramBusinessAccount?: {
    id: string
    username: string
    followersCount: number
    mediaCount: number
  }
  // For compatibility with data passed from URL
  [key: string]: any
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
  const searchParams = useSearchParams()
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connecting, setConnecting] = useState<PlatformKey | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Page selection state
  const [showPageSelector, setShowPageSelector] = useState(false)
  const [selectPagesFor, setSelectPagesFor] = useState<PlatformKey | null>(null)
  const [availablePages, setAvailablePages] = useState<PageOption[]>([])
  const [selectingPage, setSelectingPage] = useState(false)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [oauthSessionId, setOauthSessionId] = useState<string | null>(null)

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections()
  }, [])

  // Check for OAuth callback with page selection
  useEffect(() => {
    const action = searchParams.get("action")
    const sessionId = searchParams.get("session_id")

    if ((action === "select-instagram" || action === "select-facebook") && sessionId) {
      const platform = action === "select-instagram" ? "instagram" : "facebook"

      // Store session_id for later use in save-connection
      setOauthSessionId(sessionId)

      // Fetch pages from API using session_id
      const fetchPages = async () => {
        try {
          const response = await fetch(`/api/social/oauth-session?session_id=${sessionId}`)
          const data = await response.json()

          if (!response.ok) {
            setSelectionError(data.error || "Sessão expirada. Tente novamente.")
            return
          }

          setAvailablePages(data.pages || [])
          setSelectPagesFor(platform)
          setShowPageSelector(true)
        } catch (e) {
          setSelectionError("Erro ao carregar opções de conexão")
        }
      }

      fetchPages()

      // Clean up URL
      window.history.replaceState({}, "", "/settings?tab=social")
    }
  }, [searchParams])

  const fetchConnections = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/social/connections")
      const data: SocialConnectionsResponse = await response.json()
      setConnections(data.connections)
    } catch (error) {
      // Silent fail - connection fetch error
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
      }
    } catch (error) {
      // Silent fail - disconnect error
    } finally {
      setDeleting(null)
    }
  }

  const handleSelectPage = async (pageId: string) => {
    if (!selectPagesFor || !oauthSessionId) return

    setSelectingPage(true)
    setSelectionError(null)

    try {
      const requestBody = {
        platform: selectPagesFor,
        sessionId: oauthSessionId,
        pageId,
      }

      const response = await fetch("/api/social/save-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        // Success - refresh connections and close selector
        await fetchConnections()
        setShowPageSelector(false)
        setAvailablePages([])
        setSelectPagesFor(null)
        setOauthSessionId(null) // Clear session ID
      } else {
        setSelectionError(data.error || "Erro ao salvar conexão")
      }
    } catch (error) {
      setSelectionError("Erro ao salvar conexão")
    } finally {
      setSelectingPage(false)
    }
  }

  const handleCloseSelector = () => {
    setShowPageSelector(false)
    setAvailablePages([])
    setSelectPagesFor(null)
    setSelectionError(null)
    setOauthSessionId(null)
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

      {/* Expired connection warning */}
      {connections.some((c) => c.status === "expired") && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium text-yellow-100 mb-1">
              Conexão expirada detectada
            </p>
            <p className="text-yellow-200/80">
              Sua conexão com {connections.find((c) => c.status === "expired")?.platform === "instagram" ? "Instagram" : "Facebook"} expirou. Reconecte sua conta para continuar publicando.
            </p>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <p className="font-medium text-blue-100 mb-1">Como funciona</p>
          <p className="text-blue-200/80">
            Ao conectar uma conta, você autoriza a plataforma a publicar conteúdo em seu nome.
            As credenciais são armazenadas de forma segura e você pode revogar o acesso a qualquer momento.
            Para Instagram, você precisa ter uma conta Instagram Business vinculada a uma Página do Facebook.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(PLATFORMS) as PlatformKey[]).map((platform) => {
          const config = PLATFORMS[platform]
          const Icon = config.icon
          const connection = getConnectionForPlatform(platform)
          const hasConnection = connection && (connection.status === "active" || connection.status === "expired")
          const isConnecting = connecting === platform
          const isDeleting = deleting === connection?.id

          return (
            <div
              key={platform}
              className={cn(
                "p-5 rounded-lg border bg-white/[0.02]",
                hasConnection
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
                      {hasConnection
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
              {!hasConnection && (
                <p className="text-sm text-white/60 mb-4">
                  {config.description}
                </p>
              )}

              {/* Connection details */}
              {hasConnection && (
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
              {hasConnection ? (
                connection.status === "expired" ? (
                  <Button
                    className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
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
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reconectar {config.label}
                      </>
                    )}
                  </Button>
                ) : (
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
                )
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

      {/* Environment warning - only shown in development */}
      {process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_HAS_META && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium text-yellow-100 mb-1">
              Integração pode não estar configurada
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

      {/* Page Selection Modal */}
      {showPageSelector && selectPagesFor && (
        <PageSelectorModal
          platform={selectPagesFor}
          pages={availablePages}
          onSelect={handleSelectPage}
          onClose={handleCloseSelector}
          isLoading={selectingPage}
          error={selectionError}
        />
      )}
    </div>
  )
}

/**
 * Page Selector Modal
 */
interface PageSelectorModalProps {
  platform: PlatformKey
  pages: PageOption[]
  onSelect: (pageId: string) => void
  onClose: () => void
  isLoading: boolean
  error: string | null
}

function PageSelectorModal({
  platform,
  pages,
  onSelect,
  onClose,
  isLoading,
  error,
}: PageSelectorModalProps) {
  const config = PLATFORMS[platform]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-white/5", config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {platform === "instagram"
                  ? "Páginas com Instagram Business"
                  : `Selecione a página do ${config.label}`}
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                {platform === "instagram"
                  ? `${pages.length} ${pages.length === 1 ? "página do Facebook com Instagram vinculada" : "páginas do Facebook com Instagram vinculadas"}`
                  : `${pages.length} ${pages.length === 1 ? "opção encontrada" : "opções encontradas"}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Pages list */}
        <div className="p-5 max-h-[400px] overflow-y-auto space-y-3">
          {pages.map((page, index) => {
            const isInstagram = platform === "instagram"
            const igAccount = page.instagramBusinessAccount

            return (
              <button
                key={`${page.pageId}-${index}`}
                onClick={() => onSelect(page.pageId)}
                disabled={isLoading}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all",
                  "bg-white/[0.02] border-white/10 hover:border-white/20",
                  "hover:bg-white/[0.04]",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Page picture or placeholder */}
                  {page.picture ? (
                    <img
                      src={page.picture}
                      alt={page.pageName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      config.bgGradient
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                  )}

                  {/* Page info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {page.pageName}
                    </p>
                    {page.username && (
                      <p className="text-sm text-white/50">@{page.username}</p>
                    )}

                    {/* Instagram account info */}
                    {isInstagram && igAccount && (
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-white/60">
                          <Users className="h-3.5 w-3.5" />
                          {igAccount.followersCount.toLocaleString("pt-BR")} seguidores
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/60">
                          {igAccount.mediaCount} publicações
                        </span>
                      </div>
                    )}

                    {/* Category for Facebook */}
                    {!isInstagram && page.category && (
                      <p className="text-xs text-white/40 mt-1">{page.category}</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            {platform === "instagram"
              ? "Ao selecionar, a conta Instagram Business vinculada a esta página do Facebook será conectada."
              : "Ao selecionar, você autoriza a plataforma a publicar conteúdo em nome desta página."
            }
          </p>
        </div>
      </div>
    </div>
  )
}
