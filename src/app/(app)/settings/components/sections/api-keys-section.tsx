/**
 * API Keys Section
 *
 * Configure and validate API keys for external services
 */

"use client"

import * as React from "react"
import { Key, Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { validateApiKeyAction } from "../../actions"

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
  value: string
  visible: boolean
  validation: ValidationState
  onValueChange: (value: string) => void
  onVisibilityToggle: () => void
  onValidate: () => Promise<void>
}

function ApiKeyCard({
  provider,
  value,
  visible,
  validation,
  onValueChange,
  onVisibilityToggle,
  onValidate,
}: ApiKeyCardProps) {
  const [localValue, setLocalValue] = React.useState(value)
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  // Debounce value changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(localValue)
    }, 500)

    return () => clearTimeout(timer)
  }, [localValue])

  // Validate when debounced value changes
  React.useEffect(() => {
    if (debouncedValue && debouncedValue !== value) {
      onValidate()
    }
  }, [debouncedValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
    onValueChange(e.target.value)
  }

  const getStatusIcon = () => {
    switch (validation.status) {
      case "validating":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "valid":
        return <Check className="h-4 w-4 text-green-500" />
      case "invalid":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return null
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white">
              {provider.name}
            </h3>
            {provider.required && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded">
                Obrigatório
              </span>
            )}
          </div>
          <p className="text-xs text-white/60">{provider.description}</p>
          {validation.message && (
            <p
              className={cn(
                "text-xs",
                validation.status === "valid"
                  ? "text-green-500"
                  : validation.status === "invalid"
                    ? "text-red-500"
                    : "text-orange-500"
              )}
            >
              {validation.message}
            </p>
          )}
        </div>

        {/* Status Icon */}
        <div className="flex items-center gap-2">{getStatusIcon()}</div>
      </div>

      {/* Input */}
      <div className="mt-4 relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <input
              type={visible ? "text" : "password"}
              value={localValue}
              onChange={handleChange}
              placeholder={provider.placeholder}
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
              className="px-3 py-2 text-xs text-white/60 hover:text-white transition-colors"
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

  const handleValueChange = (providerId: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [providerId]: value }))
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
          [provider.id]: { status: "valid", message: "Válida" },
        }))
      } else {
        setValidations((prev) => ({
          ...prev,
          [provider.id]: {
            status: "invalid",
            message: result.error || "Inválida",
          },
        }))
      }
    } catch (error) {
      setValidations((prev) => ({
        ...prev,
        [provider.id]: { status: "error", message: "Erro de conexão" },
      }))
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-white">Chaves de API</h2>
        <p className="text-sm text-white/60">
          Configure as chaves de API para os serviços externos. As chaves são
          encriptadas antes de serem salvas.
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
            value={apiKeys[provider.id] || ""}
            visible={visibility[provider.id] || false}
            validation={validations[provider.id] || { status: "idle" }}
            onValueChange={(value) => handleValueChange(provider.id, value)}
            onVisibilityToggle={() => handleVisibilityToggle(provider.id)}
            onValidate={() => handleValidate(provider)}
          />
        ))}
      </div>
    </div>
  )
}
