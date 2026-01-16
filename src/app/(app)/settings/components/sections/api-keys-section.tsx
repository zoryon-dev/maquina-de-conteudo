/**
 * API Keys Section
 *
 * Configure and validate API keys for external services.
 * Keys are automatically saved when validation succeeds.
 */

"use client"

import * as React from "react"
import { Key, Eye, EyeOff, Check, AlertCircle, Loader2, ShieldCheck, ShieldX } from "lucide-react"
import { cn } from "@/lib/utils"
import { validateApiKeyAction } from "../../actions"
import { getApiKeysStatusAction, type ApiKeyStatus } from "../../actions"
import { toast } from "sonner"

/**
 * API provider configuration
 */
interface ApiProvider {
  id: string
  name: string
  description: string
  required: boolean
  placeholder: string
  validationUrl?: string
}

const API_PROVIDERS: ApiProvider[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "API para modelos de linguagem (GPT, Claude, etc.)",
    required: true,
    placeholder: "sk-or-...",
    validationUrl: "https://openrouter.ai/keys",
  },
  {
    id: "voyage",
    name: "Voyage AI",
    description: "API para embeddings e busca semântica (RAG)",
    required: true,
    placeholder: "voyage-...",
    validationUrl: "https://dash.voyageai.com/api-keys",
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    description: "API para web scraping",
    required: false,
    placeholder: "fc-...",
    validationUrl: "https://www.firecrawl.dev/account",
  },
  {
    id: "tavily",
    name: "Tavily",
    description: "API para busca web em tempo real",
    required: false,
    placeholder: "tvly-...",
    validationUrl: "https://tavily.com/account",
  },
  {
    id: "screenshotone",
    name: "ScreenshotOne",
    description: "API para capturas de tela",
    required: false,
    placeholder: "your-access-key",
    validationUrl: "https://screenshotone.com/",
  },
  {
    id: "apify",
    name: "APIfy",
    description: "API para web scraping alternativo",
    required: false,
    placeholder: "apify_...",
    validationUrl: "https://console.apify.com/",
  },
]

/**
 * Validation state for a single API key
 */
interface ValidationState {
  status: "idle" | "validating" | "valid" | "invalid" | "error"
  message?: string
  saved?: boolean
}

/**
 * API Keys Section Props
 */
export interface ApiKeysSectionProps {
  onChange?: () => void
  className?: string
}

/**
 * API Key Card Component
 */
interface ApiKeyCardProps {
  provider: ApiProvider
  visible: boolean
  validation: ValidationState
  savedStatus: ApiKeyStatus | null
  onValueChange: (value: string) => void
  onVisibilityToggle: () => void
  onValidate: () => Promise<void>
  onClear: () => Promise<void>
}

function ApiKeyCard({
  provider,
  visible,
  validation,
  savedStatus,
  onValueChange,
  onVisibilityToggle,
  onValidate,
  onClear,
}: ApiKeyCardProps) {
  const [localValue, setLocalValue] = React.useState("")
  const [debouncedValue, setDebouncedValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isEditing = React.useRef(false)

  // Initialize with masked value if key is saved
  React.useEffect(() => {
    if (savedStatus?.hasKey && !isEditing.current) {
      setLocalValue("") // Empty for saved keys, shows placeholder
    }
  }, [savedStatus])

  // Debounce value changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(localValue)
    }, 800)

    return () => clearTimeout(timer)
  }, [localValue])

  // Validate when debounced value changes and is not empty
  React.useEffect(() => {
    if (debouncedValue && debouncedValue.trim().length > 5) {
      onValidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
    onValueChange(e.target.value)
  }

  const handleFocus = () => {
    // Mark as editing when user focuses
    isEditing.current = true
    // Clear the placeholder if showing masked value
    if (savedStatus?.hasKey && !localValue) {
      setLocalValue("")
    }
  }

  const handleBlur = () => {
    // Mark as not editing when user leaves
    isEditing.current = false
    // If empty and key is saved, keep empty (will show placeholder)
    if (savedStatus?.hasKey && !localValue) {
      setLocalValue("")
    }
  }

  const getStatusDisplay = () => {
    if (savedStatus?.hasKey && validation.status === "valid") {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium text-green-500">Salva e válida</span>
        </div>
      )
    }

    switch (validation.status) {
      case "validating":
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-xs font-medium text-primary">Validando...</span>
          </div>
        )
      case "valid":
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
            <Check className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium text-green-500">Válida</span>
          </div>
        )
      case "invalid":
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-medium text-red-500">Inválida</span>
          </div>
        )
      case "error":
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
            <ShieldX className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-medium text-orange-500">Erro de conexão</span>
          </div>
        )
      default:
        return savedStatus?.hasKey ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
            <ShieldCheck className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs font-medium text-white/40">Salva</span>
          </div>
        ) : null
    }
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-white/[0.02] transition-all duration-200",
        "hover:border-white/10",
        validation.status === "valid" && "border-green-500/20 bg-green-500/5",
        validation.status === "invalid" && "border-red-500/20 bg-red-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-white">
              {provider.name}
            </h3>
            {provider.required && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded">
                Obrigatório
              </span>
            )}
            {getStatusDisplay()}
          </div>
          <p className="text-xs text-white/60">{provider.description}</p>
          {validation.message && validation.status !== "valid" && (
            <p
              className={cn(
                "text-xs",
                validation.status === "invalid"
                  ? "text-red-500"
                  : validation.status === "error"
                    ? "text-orange-500"
                    : "text-white/60"
              )}
            >
              {validation.message}
            </p>
          )}
        </div>

        {/* Clear button (only show if saved) */}
        {savedStatus?.hasKey && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-white/40 hover:text-red-400 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Input */}
      <div className="mt-4 relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <input
              ref={inputRef}
              type={visible ? "text" : "password"}
              value={localValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={
                savedStatus?.hasKey && !localValue
                  ? "•••••••••••••••• (salva)"
                  : provider.placeholder
              }
              className={cn(
                "w-full pl-10 pr-10 py-2 rounded-lg",
                "bg-[#0a0a0f] border border-white/10",
                "text-sm text-white placeholder:text-white/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "transition-all duration-200"
              )}
            />
            <button
              type="button"
              onClick={onVisibilityToggle}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {provider.validationUrl && (
            <a
              href={provider.validationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-xs text-white/60 hover:text-white transition-colors whitespace-nowrap"
            >
              Obter key
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * API Keys Section Component
 */
export function ApiKeysSection({ onChange, className }: ApiKeysSectionProps) {
  // Store API keys and visibility state
  const [apiKeys, setApiKeys] = React.useState<Record<string, string>>({})
  const [visibility, setVisibility] = React.useState<Record<string, boolean>>({})
  const [validations, setValidations] = React.useState<Record<string, ValidationState>>({})
  const [savedStatuses, setSavedStatuses] = React.useState<Record<string, ApiKeyStatus>>({})
  const [isLoading, setIsLoading] = React.useState(true)

  // Load saved API keys status on mount
  React.useEffect(() => {
    const loadStatuses = async () => {
      try {
        const statuses = await getApiKeysStatusAction()
        setSavedStatuses(statuses)

        // Set validation state for saved keys
        const initialValidations: Record<string, ValidationState> = {}
        for (const [provider, status] of Object.entries(statuses)) {
          if (status.hasKey) {
            initialValidations[provider] = {
              status: status.isValid ? "valid" : "idle",
              saved: true,
            }
          }
        }
        setValidations((prev) => ({ ...prev, ...initialValidations }))
      } catch (error) {
        console.error("Failed to load API keys status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStatuses()
  }, [])

  const handleValueChange = (providerId: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [providerId]: value }))
    // Clear validation when value changes
    if (value !== (apiKeys[providerId] || "")) {
      setValidations((prev) => ({
        ...prev,
        [providerId]: { status: "idle" },
      }))
    }
    onChange?.()
  }

  const handleVisibilityToggle = (providerId: string) => {
    setVisibility((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  const handleValidate = async (provider: ApiProvider) => {
    const keyValue = apiKeys[provider.id]

    if (!keyValue) {
      setValidations((prev) => ({
        ...prev,
        [provider.id]: { status: "idle" },
      }))
      return
    }

    // Start validating
    setValidations((prev) => ({
      ...prev,
      [provider.id]: { status: "validating" },
    }))

    try {
      const result = await validateApiKeyAction(provider.id, keyValue)

      if (result.valid) {
        setValidations((prev) => ({
          ...prev,
          [provider.id]: { status: "valid", message: "Salva com sucesso", saved: true },
        }))
        // Update saved status
        setSavedStatuses((prev) => ({
          ...prev,
          [provider.id]: {
            provider: provider.id,
            hasKey: true,
            isValid: true,
            lastValidatedAt: new Date(),
          },
        }))
        toast.success(`${provider.name}: API key salva com sucesso`)
      } else {
        setValidations((prev) => ({
          ...prev,
          [provider.id]: {
            status: "invalid",
            message: result.error || "Inválida",
          },
        }))
        toast.error(`${provider.name}: ${result.error || "API key inválida"}`)
      }
    } catch (error) {
      setValidations((prev) => ({
        ...prev,
        [provider.id]: { status: "error", message: "Erro de conexão" },
      }))
      toast.error(`${provider.name}: Erro ao validar API key`)
    }
  }

  const handleClear = async (providerId: string) => {
    try {
      const { deleteApiKeyAction } = await import("../../actions")
      const result = await deleteApiKeyAction(providerId)

      if (result.success) {
        // Clear local state
        setApiKeys((prev) => ({ ...prev, [providerId]: "" }))
        setValidations((prev) => ({
          ...prev,
          [providerId]: { status: "idle" },
        }))
        setSavedStatuses((prev) => {
          const newStatuses = { ...prev }
          delete newStatuses[providerId]
          return newStatuses
        })
        toast.success("API key removida")
        onChange?.()
      } else {
        toast.error(result.error || "Falha ao remover API key")
      }
    } catch (error) {
      toast.error("Erro ao remover API key")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-white">Chaves de API</h2>
          <p className="text-sm text-white/60">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-white">Chaves de API</h2>
        <p className="text-sm text-white/60">
          Configure as chaves de API para os serviços externos. As chaves são
          encriptadas e salvas automaticamente quando validadas.
        </p>
      </div>

      {/* Required Providers Notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-white/90">
            <span className="font-medium">Obrigatórias:</span> OpenRouter e
            Voyage AI são necessários para o funcionamento básico do sistema.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      <div className="space-y-3">
        {API_PROVIDERS.map((provider) => (
          <ApiKeyCard
            key={provider.id}
            provider={provider}
            visible={visibility[provider.id] || false}
            validation={validations[provider.id] || { status: "idle" }}
            savedStatus={savedStatuses[provider.id] || null}
            onValueChange={(value) => handleValueChange(provider.id, value)}
            onVisibilityToggle={() => handleVisibilityToggle(provider.id)}
            onValidate={() => handleValidate(provider)}
            onClear={() => handleClear(provider.id)}
          />
        ))}
      </div>
    </div>
  )
}
