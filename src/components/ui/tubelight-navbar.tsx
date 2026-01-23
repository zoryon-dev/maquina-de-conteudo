"use client"

import React, { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon?: LucideIcon
  children?: Array<{ name: string; url: string; icon?: LucideIcon }>
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
 * Suporta dropdowns com o mesmo estilo visual.
 */
function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const itemRef = useRef<HTMLDivElement>(null)

  const hasChildren = item.children && item.children.length > 0

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (hasChildren) setIsOpen(true)
  }

  const handleMouseLeave = () => {
    if (hasChildren) {
      timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
    }
  }

  const handleClick = () => {
    onClick()
    if (!hasChildren) setIsOpen(false)
  }

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={item.url}
        onClick={handleClick}
        className={cn(
          "relative cursor-pointer text-sm font-medium px-4 py-2.5 rounded-full transition-all duration-200 flex items-center gap-1",
          "text-white/70 hover:text-white hover:bg-white/5",
          isActive && "bg-white/10 text-white",
        )}
      >
        <span className="hidden md:inline">{item.name}</span>
        {item.icon && (
          <span className="md:hidden">
            <item.icon size={18} strokeWidth={2.5} />
          </span>
        )}
        {hasChildren && (
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-200 hidden md:inline-block",
              isOpen && "rotate-180"
            )}
          />
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
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
              <div className="absolute w-10 h-4 bg-primary/30 rounded-full blur-md -top-1.5 -left-2" />
              <div className="absolute w-6 h-3 bg-primary/20 rounded-full blur-sm -top-0.5 -left-0" />
            </div>
          </motion.div>
        )}
      </Link>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50"
          >
            <div className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-xl py-1 min-w-[200px] shadow-xl">
              {item.children!.map((child) => {
                const ChildIcon = child.icon
                return (
                  <Link
                    key={child.url}
                    href={child.url}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {ChildIcon && <ChildIcon size={16} strokeWidth={2} />}
                    <span>{child.name}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function NavBar({ items, className, defaultActive }: NavBarProps) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(() => {
    // Check parent items
    const matchingParent = items.find((item) => item.url === pathname)
    if (matchingParent) return matchingParent.name

    // Check children items
    for (const item of items) {
      if (item.children) {
        const matchingChild = item.children.find((child) => child.url === pathname)
        if (matchingChild) return item.name
      }
    }

    // Check if pathname starts with any item url
    const matchingItem = items.find((item) => pathname.startsWith(item.url))
    return matchingItem?.name || defaultActive || items[0]?.name
  })

  // Update active tab when pathname changes
  useEffect(() => {
    // Check parent items
    const matchingParent = items.find((item) => item.url === pathname)
    if (matchingParent) {
      setActiveTab(matchingParent.name)
      return
    }

    // Check children items
    for (const item of items) {
      if (item.children) {
        const matchingChild = item.children.find((child) => child.url === pathname)
        if (matchingChild) {
          setActiveTab(item.name)
          return
        }
      }
    }

    // Check if pathname starts with any item url
    const matchingItem = items.find((item) => pathname.startsWith(item.url))
    if (matchingItem) {
      setActiveTab(matchingItem.name)
    }
  }, [pathname, items])

  return (
    <div className={cn("inline-flex", className)}>
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-lg py-2.5 px-2 rounded-full">
        {items.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={activeTab === item.name}
            onClick={() => setActiveTab(item.name)}
          />
        ))}
      </div>
    </div>
  )
}
