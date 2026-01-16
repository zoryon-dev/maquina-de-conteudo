import { ReactNode } from "react"
import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
}

/**
 * AuthLayout - Layout container para páginas de autenticação
 *
 * Background animado com gradientes e partículas de limão.
 */
export function AuthLayout({
  children,
  title = "Máquina de Conteúdo",
  subtitle = "Seu estúdio de conteúdo alimentado por IA",
  className,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl [animation:pulse_4s_ease-in-out_infinite]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Content */}
      <div className={cn("relative z-10 w-full max-w-md", className)}>
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center justify-center gap-3 mb-8 group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all">
            <MessageSquare className="h-6 w-6 text-primary" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-white/60">{subtitle}</p>
          </div>
        </Link>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Ao continuar, você concorda com nossos{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Termos de Serviço
          </Link>{" "}
          e{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  )
}
