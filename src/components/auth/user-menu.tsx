"use client"

import { UserButton } from "@clerk/nextjs"
import { Settings, LogOut } from "lucide-react"

/**
 * UserMenu - Menu de usuário no navbar
 *
 * Integra com Clerk UserButton e adiciona
 * links personalizados para configurações.
 */
export function UserMenu() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-10 w-10 rounded-xl border-2 border-primary/20",
          card: "bg-[#1a1a2e] border border-white/10 shadow-2xl",
          preview: "bg-[#1a1a2e]",
          headerTitle: "text-white",
          headerSubtitle: "text-white/60",
          profileSection: "text-white",
          profileLine: "text-white/60 border-white/10",
          actions: "gap-1",
          actionButton:
            "text-white/80 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2 text-sm transition-colors",
        },
      }}
      userProfileMode="navigation"
      userProfileUrl="/settings"
    >
      {/* Additional menu items can be added via slot props if needed */}
    </UserButton>
  )
}
