import { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  showFooter?: boolean
}

/**
 * AuthLayout - Layout container para páginas de autenticação
 *
 * Background animado com gradientes e partículas de limão.
 * Otimizado para mobile com dark mode consistente.
 */
export function AuthLayout({
  children,
  title = "contentMachine",
  subtitle = "Seu estúdio de conteúdo alimentado por IA",
  className,
  showFooter = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0a0a0f]">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        {/* Gradient orbs - responsive sizes */}
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-primary/5 rounded-full blur-3xl [animation:pulse_4s_ease-in-out_infinite]" />

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
        {/* Logo - responsive */}
        <Link
          href="/"
          className="flex items-center justify-center gap-3 mb-6 sm:mb-8 group"
        >
          <div className="relative h-10 sm:h-12 w-auto">
            <Image
              src="/img/logo_full_content.png"
              alt="contentMachine powered by zoryon"
              width={48}
              height={48}
              className="object-contain w-auto h-full transition-transform duration-300 group-hover:scale-105"
              priority
            />
            {/* Glow effect no logo */}
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </div>
          <div className="text-left hidden sm:block">
            <h1 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary/90 transition-colors">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-white/60">{subtitle}</p>
          </div>
        </Link>

        {/* Card - mobile optimized */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8">
          {children}
        </div>

        {/* Footer - ocultável e responsivo */}
        {showFooter && (
          <p className="text-center text-white/40 text-xs sm:text-sm mt-4 sm:mt-6">
            Ao continuar, você concorda com nossos{" "}
            <Link href="/termos-de-uso" className="text-primary hover:text-primary/80 hover:underline transition-colors">
              Termos
            </Link>{" "}
            e{" "}
            <Link href="/politica-privacidade" className="text-primary hover:text-primary/80 hover:underline transition-colors">
              Privacidade
            </Link>
          </p>
        )}
      </div>

      {/* Mobile-only bottom branding */}
      <div className="absolute bottom-4 left-0 right-0 text-center sm:hidden">
        <p className="text-xs text-white/30">
          contentMachine ~ powered by zoryon
        </p>
      </div>
    </div>
  )
}
