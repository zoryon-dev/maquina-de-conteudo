import { SignInCard } from "@/components/auth/sign-in-card"
import { AuthLayout } from "@/components/auth/auth-layout"
import * as React from "react"

/**
 * Forgot Password Page
 *
 * Página de recuperação de senha usando o fluxo do Clerk.
 */
export default function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ signIn?: string[] }>
}) {
  React.use(params)

  return (
    <AuthLayout
      title="Recuperar Senha"
      subtitle="Enviaremos instruções para redefinir sua senha"
    >
      <div className="space-y-6">
        {/* Info */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <svg
            className="h-5 w-5 text-primary flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-primary/80 font-medium">Como funciona</p>
            <p className="text-xs text-primary/60 mt-1">
              Digite seu email e enviaremos um link para você redefinir sua senha.
            </p>
          </div>
        </div>

        {/* O Clerk SignIn inclui o fluxo de forgot-password automaticamente */}
        <SignInCard redirectUrl="/dashboard" />

        {/* Back to Sign In */}
        <p className="text-center text-sm text-white/60">
          Lembrou sua senha?{" "}
          <a
            href="/sign-in"
            className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
          >
            Voltar ao login
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}
