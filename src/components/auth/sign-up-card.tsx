"use client"

import { SignUp } from "@clerk/nextjs"
import { OAuthButtons } from "./oauth-buttons"
import { DevHelp } from "./dev-help"
import { useSignUp } from "@clerk/nextjs"
import { CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react"
import { useState, useEffect } from "react"

interface SignUpCardProps {
  redirectUrl?: string
}

/**
 * SignUpCard - Card de cadastro estilizado completo
 *
 * Wrapper do Clerk SignUp com:
 * - Loading states visuais
 * - Error handling customizado
 * - Micro-interações
 * - Feedback de sucesso
 * - Indicadores de força de senha
 */
export function SignUpCard({ redirectUrl = "/dashboard" }: SignUpCardProps) {
  const signUp = useSignUp()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  // Detectar mudanças no estado do Clerk
  useEffect(() => {
    if (!signUp.isLoaded) return

    // Verificar se há erros
    if (signUp.activeClause && signUp.activeClause.error) {
      const clerkError = signUp.activeClause.error as { message?: string; longMessage?: string }
      setError(clerkError.message || clerkError.longMessage || "Erro ao criar conta")
    } else {
      setError(null)
    }

    // Verificar se está carregando
    setIsLoading(signUp.status === "loading")

    // Detectar quando email de verificação foi enviado
    if (signUp.verification) {
      setVerificationSent(true)
    }
  }, [signUp])

  // Detectar cadastro bem-sucedido
  useEffect(() => {
    if (signUp.isLoaded && signUp.status === "complete") {
      setSuccess(true)
    }
  }, [signUp.isLoaded, signUp.status])

  return (
    <div className="space-y-6">
      {/* Header com animação */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white animate-in fade-in slide-in-from-bottom-2 duration-500">
          Crie sua conta
        </h2>
        <p className="text-white/60 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          Comece a criar conteúdo incrível com IA hoje mesmo
        </p>
      </div>

      {/* Info Banner */}
      {!verificationSent && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Info className="h-5 w-5 text-primary/70 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary/80">
              Cadastre-se gratuitamente. Sem cartão de crédito necessário.
            </p>
          </div>
        </div>
      )}

      {/* Verification Sent Message */}
      {verificationSent && !success && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-200 font-medium">Email enviado!</p>
              <p className="text-xs text-blue-300/70 mt-1">
                Verifique sua caixa de entrada para confirmar sua conta.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-200 font-medium">Erro ao criar conta</p>
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
              <p className="text-sm text-primary font-medium">Conta criada!</p>
              <p className="text-xs text-primary/70 mt-1">Redirecionando para o dashboard...</p>
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
              <p className="text-sm text-white/60">Criando sua conta...</p>
            </div>
          </div>
        </div>
      )}

      {/* Clerk SignUp Component com styling melhorado */}
      <SignUp
        appearance={{
          elements: {
            rootBox: "space-y-4",
            card: "shadow-none bg-transparent border-0 p-0",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            form: "space-y-4",
            formField: "space-y-2",
            formFieldLabel: "text-white/70 text-sm font-medium",
            formFieldInput: `
              bg-white/5 border-white/10 text-white placeholder:text-white/40
              rounded-lg h-11 px-4
              focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-all duration-200
              hover:bg-white/[0.07]
            `,
            formFieldInputShowPasswordButton:
              "text-white/50 hover:text-white transition-colors",
            formFieldError: "text-red-400 text-xs",
            formFieldSuccess: "text-primary/80 text-xs",
            formButtonPrimary: `
              w-full bg-primary text-[#0a0a0f]
              hover:bg-primary/90 active:bg-primary/80
              font-medium h-11 rounded-lg
              transition-all duration-200
              focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]
              shadow-lg shadow-primary/20
              hover:shadow-primary/30
            `,
            formButtonSecondary: `
              bg-white/5 border-white/10 text-white
              hover:bg-white/10
              transition-all duration-200
            `,
            identityPreview: "bg-white/5 border-white/10 rounded-lg",
            identityPreviewText: "text-white",
            dividerRow: "hidden",
            dividerText: "hidden",
            socialButtonsBlock: "hidden",
            socialButtonsBlockButton: "bg-white/5 border-white/10 hover:bg-white/10 text-white",
            socialButtonsBlockButtonText: "text-white",
            footerAction: "hidden",
            footerActionLink: "hidden",
            usernameInput: "hidden", // Hide username field
            // Password strength indicator
            navbar: "bg-white/5 border border-white/10 rounded-lg",
            navbarButton: "text-primary/70 hover:text-primary",
            // Links
            formResendCodeLink: "text-primary hover:text-primary/80 transition-colors",
            footerActionLink: "text-primary hover:text-primary/80 transition-colors",
          },
        }}
        signInUrl="/sign-in"
        forceRedirectUrl={redirectUrl}
      />

      {/* Custom OAuth Buttons com loading state */}
      {!verificationSent && <OAuthButtons isLoading={isLoading} />}

      {/* Terms Notice */}
      <p className="text-center text-xs text-white/40">
        Ao continuar, você concorda com nossos{" "}
        <a href="/termos-de-uso" className="text-primary/70 hover:text-primary/50 transition-colors">
          Termos de Uso
        </a>{" "}
        e{" "}
        <a href="/politica-privacidade" className="text-primary/70 hover:text-primary/50 transition-colors">
          Política de Privacidade
        </a>
        .
      </p>

      {/* Sign In Link */}
      {!verificationSent && (
        <p className="text-center text-sm text-white/60 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          Já tem uma conta?{" "}
          <a
            href="/sign-in"
            className="text-primary hover:text-primary/80 hover:underline font-medium transition-all duration-200 inline-flex items-center gap-1 group"
          >
            Entrar
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
        </p>
      )}

      {/* Dev Help */}
      <DevHelp />
    </div>
  )
}
