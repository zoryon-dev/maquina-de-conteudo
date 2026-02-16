/**
 * Error Feedback Component
 *
 * Componente reutilizavel para exibir mensagens de erro com sugestoes e acoes.
 * Segue o design system dark mode com cores de destaque.
 */

"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorFeedbackProps {
  /** Mensagem de erro principal */
  message: string;
  /** Sugestao de acao para o usuario (opcional) */
  suggestion?: string;
  /** Callback ao clicar em "Tentar Novamente" (opcional) */
  onRetry?: () => void;
  /** Label customizado para o botao de retry */
  retryLabel?: string;
  /** Callback ao clicar em dismiss/fechar (opcional) */
  onDismiss?: () => void;
  /** Variante visual */
  variant?: "default" | "inline" | "compact";
  /** Classes adicionais */
  className?: string;
}

/**
 * Mapeia mensagens de erro genericas para mensagens mais especificas e uteis.
 */
export function getSpecificErrorMessage(error: string): {
  message: string;
  suggestion?: string;
} {
  const lowerError = error.toLowerCase();

  // Modelo indisponivel
  if (
    lowerError.includes("model") &&
    (lowerError.includes("unavailable") ||
      lowerError.includes("not found") ||
      lowerError.includes("not available"))
  ) {
    return {
      message: "Modelo indisponivel",
      suggestion: "Tente selecionar outro modelo de IA nas configuracoes.",
    };
  }

  // Rate limit
  if (
    lowerError.includes("rate limit") ||
    lowerError.includes("too many requests") ||
    lowerError.includes("429")
  ) {
    return {
      message: "Limite de requisicoes atingido",
      suggestion:
        "Aguarde alguns segundos e tente novamente. Se persistir, tente outro modelo.",
    };
  }

  // Timeout
  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return {
      message: "A operacao demorou demais",
      suggestion:
        "Tente novamente. Se persistir, tente simplificar o conteudo ou usar outro modelo.",
    };
  }

  // Network/Connection error
  if (
    lowerError.includes("network") ||
    lowerError.includes("connection") ||
    lowerError.includes("fetch") ||
    lowerError.includes("econnrefused")
  ) {
    return {
      message: "Erro de conexao",
      suggestion:
        "Verifique sua conexao com a internet e tente novamente.",
    };
  }

  // Auth error
  if (
    lowerError.includes("auth") ||
    lowerError.includes("unauthorized") ||
    lowerError.includes("401")
  ) {
    return {
      message: "Sessao expirada",
      suggestion: "Faca login novamente para continuar.",
    };
  }

  // Content too long
  if (
    lowerError.includes("too long") ||
    lowerError.includes("context length") ||
    lowerError.includes("token")
  ) {
    return {
      message: "Conteudo muito extenso para o modelo",
      suggestion:
        "Tente reduzir o tamanho do conteudo ou selecione um modelo com maior capacidade.",
    };
  }

  // Content filter / safety
  if (
    lowerError.includes("content filter") ||
    lowerError.includes("safety") ||
    lowerError.includes("blocked") ||
    lowerError.includes("flagged")
  ) {
    return {
      message: "Conteudo bloqueado pelo filtro de seguranca",
      suggestion:
        "Revise o conteudo e remova termos que possam acionar filtros de seguranca.",
    };
  }

  // Server error
  if (
    lowerError.includes("500") ||
    lowerError.includes("internal server") ||
    lowerError.includes("server error")
  ) {
    return {
      message: "Erro interno do servidor",
      suggestion: "Tente novamente em alguns instantes.",
    };
  }

  // Generic generation error
  if (
    lowerError.includes("gerar") ||
    lowerError.includes("generation") ||
    lowerError.includes("generate")
  ) {
    return {
      message: "Erro ao gerar conteudo",
      suggestion:
        "Tente novamente. Se persistir, mude o modelo ou ajuste as configuracoes.",
    };
  }

  // Fallback — return the original message
  return {
    message: error,
    suggestion: undefined,
  };
}

export function ErrorFeedback({
  message,
  suggestion,
  onRetry,
  retryLabel = "Tentar Novamente",
  onDismiss,
  variant = "default",
  className,
}: ErrorFeedbackProps) {
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-red-500/10 border border-red-500/30",
          className
        )}
      >
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-sm text-red-300 flex-1">{message}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-red-300 hover:text-red-100 hover:bg-red-500/20 h-7 px-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {retryLabel}
          </Button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-300/60 hover:text-red-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    );
  }

  if (variant === "inline") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn(
          "flex items-start gap-3 p-4 rounded-xl",
          "bg-red-500/10 border border-red-500/30",
          className
        )}
      >
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-300">{message}</p>
          {suggestion && (
            <p className="text-xs text-red-300/70 mt-1">{suggestion}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="text-red-300 hover:text-red-100 hover:bg-red-500/20 h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {retryLabel}
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-300/60 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant — full card
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "relative p-5 rounded-xl",
        "bg-red-500/10 border border-red-500/30",
        className
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-red-300/60 hover:text-red-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-red-300 mb-1">
            {message}
          </h4>
          {suggestion && (
            <p className="text-xs text-red-300/70 leading-relaxed">
              {suggestion}
            </p>
          )}

          {/* Retry button */}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 border-red-500/30 text-red-300 hover:text-red-100 hover:bg-red-500/20 hover:border-red-500/50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
