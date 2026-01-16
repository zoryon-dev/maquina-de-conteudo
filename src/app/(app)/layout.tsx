import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AppLayout } from "@/components/app-layout"

/**
 * Layout para rotas autenticadas do app
 *
 * Verifica autenticação e aplica o AppLayout com navbar.
 */
export default async function AppProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return <AppLayout>{children}</AppLayout>
}
