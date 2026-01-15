"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon?: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  defaultActive?: string
}

/**
 * Tubelight Navbar - Navegação com efeito de luz
 *
 * O item ativo tem um efeito "tubelight" com brilho animado.
 * Items não ativos usam texto branco com 70% de opacidade.
 */
export function NavBar({ items, className, defaultActive }: NavBarProps) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(() => {
    // Determine initial active tab from pathname
    const matchingItem = items.find((item) => item.url === pathname)
    return matchingItem?.name || defaultActive || items[0]?.name
  })

  // Update active tab when pathname changes
  useEffect(() => {
    const matchingItem = items.find((item) => pathname.startsWith(item.url))
    if (matchingItem) {
      setActiveTab(matchingItem.name)
    }
  }, [pathname, items])

  return (
    <div className={cn("inline-flex", className)}>
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-lg py-2.5 px-2 rounded-full">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2.5 rounded-full transition-all duration-200",
                // Non-active state - white with opacity
                "text-white/70 hover:text-white hover:bg-white/5",
                // Active state
                isActive && "bg-white/10 text-white",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              {Icon && (
                <span className="md:hidden">
                  <Icon size={18} strokeWidth={2.5} />
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-primary/10 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  {/* Glow effect above active tab */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
                    <div className="absolute w-10 h-4 bg-primary/30 rounded-full blur-md -top-1.5 -left-2" />
                    <div className="absolute w-6 h-3 bg-primary/20 rounded-full blur-sm -top-0.5 -left-0" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
