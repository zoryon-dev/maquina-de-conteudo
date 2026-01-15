"use client"

import { SignIn } from "@clerk/nextjs"

/**
 * ForgotPasswordCard - Card de recuperação de senha
 *
 * Wrapper do Clerk forgot password com design system aplicado.
 */
export function ForgotPasswordCard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Esqueceu sua senha?</h2>
        <p className="text-white/60">
          Digite seu email e enviaremos instruções para recuperação
        </p>
      </div>

      {/* Clerk SignIn with forgot password flow */}
      <SignIn
        appearance={{
          elements: {
            rootBox: "space-y-4",
            card: "shadow-none bg-transparent border-0 p-0",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            form: "space-y-4",
            formField: "space-y-2",
            formButtonPrimary:
              "w-full bg-primary text-white hover:bg-primary/90 font-medium h-10 rounded-lg transition-colors",
            formFieldInput: "bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-lg h-10 px-3",
            identityPreview: "bg-white/5 border-white/10 rounded-lg",
            identityPreviewText: "text-white",
            footerAction: "hidden", // Hide default footer
            footerActionLink: "hidden",
          },
        }}
      />

      {/* Back to Sign In Link */}
      <p className="text-center text-sm text-white/60">
        <a href="/sign-in" className="text-primary hover:underline font-medium">
          ← Voltar para o login
        </a>
      </p>
    </div>
  )
}
