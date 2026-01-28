import { SignUpCard } from "@/components/auth/sign-up-card"
import { AuthLayout } from "@/components/auth/auth-layout"
import * as React from "react"

/**
 * Sign Up Page
 *
 * Página de cadastro com Clerk, usando design system personalizado.
 */
export default function SignUpPage({
  params,
}: {
  params: Promise<{ signUp?: string[] }>
}) {
  // Unwrap params in Next.js 15+
  React.use(params)

  return (
    <AuthLayout showFooter={false}>
      <SignUpCard redirectUrl="/dashboard" />
    </AuthLayout>
  )
}
