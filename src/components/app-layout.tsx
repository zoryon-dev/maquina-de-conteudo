"use client"

import * as React from "react"
import {
  Library,
  Calendar,
  Globe,
  Settings,
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  Wand2,
  Lightbulb,
  Search,
  Palette,
  FileText,
  ImagePlus,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { NavBar } from "@/components/ui/tubelight-navbar"
import { UserMenu } from "@/components/auth/user-menu"
import { Footer } from "@/components/footer"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

/**
 * AppLayout - Layout principal para rotas autenticadas
 *
 * Header redesenhado com visual mais atraente e profissional.
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  const navItems = React.useMemo(
    () => [
      {
        name: "Dash",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Descoberta",
        url: "/discover",
        icon: TrendingUp,
        children: [
          { name: "Discovery", url: "/discover", icon: Search },
          { name: "Temas", url: "/themes", icon: Lightbulb },
        ],
      },
      {
        name: "Criar",
        url: "/wizard",
        icon: Wand2,
        children: [
          { name: "Wizard", url: "/wizard", icon: Wand2 },
          { name: "Artigos", url: "/articles", icon: FileText },
          { name: "Studio", url: "/studio", icon: Palette },
          { name: "Creative", url: "/creative-studio", icon: ImagePlus },
          { name: "ZoryAI", url: "/chat", icon: Sparkles },
        ],
      },
      {
        name: "Gestão",
        url: "/library",
        icon: Library,
        children: [
          { name: "Biblioteca", url: "/library", icon: Library },
          { name: "Calendário", url: "/calendar", icon: Calendar },
          { name: "Fontes", url: "/sources", icon: Globe },
        ],
      },
      {
        name: "Configurações",
        url: "/settings",
        icon: Settings,
      },
    ],
    []
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header centralizado - navbar sempre no centro da viewport */}
      <header className="fixed top-0 left-0 right-0 z-40">
        {/* Container principal do header com glassmorphism */}
        <div className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl pt-4 pb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Grid com 3 colunas: logo (esq), navbar (centro), user (dir) */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16 gap-4">
              {/* Logo - alinhado à esquerda */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 group justify-start"
              >
                {/* Logo completo para desktop - responsivo */}
                <div className="relative w-auto hidden sm:block h-9 sm:h-9 md:h-10 lg:h-11 xl:h-12">
                  <Image
                    src="/img/logo_full_content.png"
                    alt="contentMachine powered by zoryon"
                    width={180}
                    height={36}
                    className="object-contain w-auto h-full transition-all duration-200"
                    priority
                  />
                  {/* Glow effect no logo */}
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </div>
                {/* Logo ícone para mobile */}
                <div className="relative h-9 w-9 sm:hidden">
                  <Image
                    src="/img/favi_contentmachine.jpg"
                    alt="contentMachine"
                    width={36}
                    height={36}
                    className="object-contain rounded-lg w-full h-full"
                    priority
                  />
                  {/* Glow effect no logo */}
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </div>
              </Link>

              {/* Menu central - sempre no centro */}
              <div className="flex justify-center">
                <NavBar items={navItems} defaultActive="Dash" />
              </div>

              {/* Espaçador vazio à direita para equilibrar o grid */}
              <div className="flex justify-end">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          "max-w-6xl mx-auto px-4 pt-32 pb-12",
          className
        )}
      >
        {children}
      </main>

      {/* Footer */}
      <Footer showNewsletter={false} />
    </div>
  )
}
