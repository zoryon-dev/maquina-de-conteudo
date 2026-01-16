import { SignUpCard } from "@/components/auth/sign-up-card"
import { AuthLayout } from "@/components/auth/auth-layout"

/**
 * Sign Up Page
 *
 * Página de cadastro com Clerk, usando design system personalizado.
 */
export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUpCard redirectUrl="/dashboard" />
    </AuthLayout>
  )
}
