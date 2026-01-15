"use client"

import * as React from "react"
import { MessageSquare, Library, Calendar, Globe, Settings } from "lucide-react"
import { NavBar } from "@/components/ui/tubelight-navbar"
import { UserMenu } from "@/components/auth/user-menu"
import { cn } from "@/lib/utils"
import Link from "next/link"

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
      { name: "Chat", url: "/dashboard", icon: MessageSquare },
      { name: "Biblioteca", url: "/library", icon: Library },
      { name: "Calendário", url: "/calendar", icon: Calendar },
      { name: "Fontes", url: "/sources", icon: Globe },
      { name: "Configurações", url: "/settings", icon: Settings },
    ],
    []
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header redesenhado */}
      <header className="fixed top-0 left-0 right-0 z-40">
        {/* Container principal do header com glassmorphism */}
        <div className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl pt-5 pb-5">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-6 h-16 px-4">
              {/* Logo */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 group shrink-0"
              >
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
                    <MessageSquare className="h-5 w-5 text-primary" strokeWidth={2.5} />
                  </div>
                  {/* Glow effect no logo */}
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </div>
                <span className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                  Máquina de Conteúdo
                </span>
              </Link>

              {/* Menu central */}
              <div className="flex flex-1 justify-center">
                <NavBar items={navItems} defaultActive="Chat" />
              </div>

              {/* Ícone de perfil */}
              <div className="flex items-center justify-end shrink-0">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          "max-w-6xl mx-auto px-4 pt-24 pb-8",
          className
        )}
      >
        {children}
      </main>
    </div>
  )
}
