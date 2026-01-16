"use client"

import { SignUp } from "@clerk/nextjs"
import { OAuthButtons } from "./oauth-buttons"
import { DevHelp } from "./dev-help"

interface SignUpCardProps {
  redirectUrl?: string
}

/**
 * SignUpCard - Card de cadastro estilizado
 *
 * Wrapper do Clerk SignUp com design system aplicado.
 */
export function SignUpCard({ redirectUrl = "/dashboard" }: SignUpCardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Crie sua conta</h2>
        <p className="text-white/60">
          Comece a criar conteúdo incrível com IA hoje mesmo
        </p>
      </div>

      {/* Clerk SignUp Component */}
      <SignUp
        appearance={{
          elements: {
            rootBox: "space-y-4",
            card: "shadow-none bg-transparent border-0 p-0",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            form: "space-y-4",
            formField: "space-y-2",
            formButtonPrimary:
              "w-full bg-primary text-[#0a0a0f] hover:bg-primary/90 font-medium h-10 rounded-lg transition-colors",
            formFieldInput: "bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-lg h-10 px-3",
            identityPreview: "bg-white/5 border-white/10 rounded-lg",
            identityPreviewText: "text-white",
            dividerRow: "hidden", // Hide default divider
            dividerText: "hidden",
            socialButtonsBlock: "hidden", // Hide default social buttons
            socialButtonsBlockButton:
              "bg-white/5 border-white/10 hover:bg-white/10 text-white",
            socialButtonsBlockButtonText: "text-white",
            footerAction: "hidden", // Hide default footer
            footerActionLink: "hidden",
            usernameInput: "hidden", // Hide username field
          },
        }}
        signInUrl="/sign-in"
        forceRedirectUrl={redirectUrl}
      />

      {/* Custom OAuth Buttons */}
      <OAuthButtons />

      {/* Sign In Link */}
      <p className="text-center text-sm text-white/60">
        Já tem uma conta?{" "}
        <a
          href="/sign-in"
          className="text-primary hover:underline font-medium"
        >
          Entrar
        </a>
      </p>

      {/* Dev Help */}
      <DevHelp />
    </div>
  )
}
