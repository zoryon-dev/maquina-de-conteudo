import { SignInCard } from "@/components/auth/sign-in-card"
import { AuthLayout } from "@/components/auth/auth-layout"
import * as React from "react"

/**
 * Sign In Page
 *
 * Página de login com Clerk, usando design system personalizado.
 */
export default function SignInPage({
  params,
}: {
  params: Promise<{ signIn?: string[] }>
}) {
  // Unwrap params in Next.js 15+
  React.use(params)

  return (
    <AuthLayout>
      <SignInCard redirectUrl="/dashboard" />
    </AuthLayout>
  )
}
