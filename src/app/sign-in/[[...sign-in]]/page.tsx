import { SignInCard } from "@/components/auth/sign-in-card"
import { AuthLayout } from "@/components/auth/auth-layout"

/**
 * Sign In Page
 *
 * Página de login com Clerk, usando design system personalizado.
 */
export default function SignInPage() {
  return (
    <AuthLayout>
      <SignInCard redirectUrl="/dashboard" />
    </AuthLayout>
  )
}
