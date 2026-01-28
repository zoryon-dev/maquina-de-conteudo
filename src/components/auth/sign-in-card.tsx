"use client"

import { SignIn } from "@clerk/nextjs"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { BetaModal } from "../beta-modal"

interface SignInCardProps {
  redirectUrl?: string
}

/**
 * SignInCard - Card de login estilizado completo
 *
 * Wrapper do Clerk SignIn com:
 * - Loading states visuais
 * - Error handling customizado
 * - Micro-interações
 * - Feedback de sucesso
 */
export function SignInCard({ redirectUrl = "/dashboard" }: SignInCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header com animação */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white animate-in fade-in slide-in-from-bottom-2 duration-500">
          Bem-vindo de volta
        </h2>
        <p className="text-white/60 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          Entre na sua conta para continuar criando conteúdo
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-200 font-medium">Erro ao fazer login</p>
              <p className="text-xs text-red-300/70 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-primary font-medium">Login realizado!</p>
              <p className="text-xs text-primary/70 mt-1">Redirecionando...</p>
            </div>
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && !success && (
        <div className="relative">
          <div className="absolute inset-0 -m-4 flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm rounded-2xl z-10 animate-in fade-in duration-200">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-white/60">Entrando...</p>
            </div>
          </div>
        </div>
      )}

      {/* Clerk SignIn - padrão */}
      <SignIn forceRedirectUrl={redirectUrl} />

      {/* Sign Up Link */}
      <p className="text-center text-sm text-white/60 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        Não tem uma conta?{" "}
        <button
          onClick={() => setIsBetaModalOpen(true)}
          className="text-primary hover:text-primary/80 hover:underline font-medium transition-all duration-200 inline-flex items-center gap-1 group"
        >
          Criar conta
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </p>

      {/* Forgot Password Link */}
      <p className="text-center">
        <a
          href="/sign-in/forgot-password"
          className="text-sm text-white/40 hover:text-primary/80 transition-colors duration-200"
        >
          Esqueceu sua senha?
        </a>
      </p>

      <BetaModal isOpen={isBetaModalOpen} onClose={() => setIsBetaModalOpen(false)} />
    </div>
  )
}
