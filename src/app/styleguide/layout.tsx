"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { navigation } from "./navigation"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export default function StyleguideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialTheme = stored || (prefersDark ? "dark" : "light")
    setTheme(initialTheme)
    document.documentElement.classList.toggle("dark", initialTheme === "dark")
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    localStorage.setItem("theme", newTheme)
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Fixed */}
      <aside className="w-64 border-r bg-card p-6 flex flex-col gap-6 fixed top-0 left-0 h-screen overflow-y-auto">
        <div>
          <Link href="/styleguide" className="text-xl font-bold">
            Design System
          </Link>
          <p className="text-xs text-muted-foreground mt-1">
            Máquina de Conteúdo
          </p>
        </div>

        <nav className="flex flex-col gap-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {section.title}
              </h3>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block px-3 py-2 rounded-md text-sm transition-colors",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm transition-colors hover:bg-muted"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Dark Mode
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content - offset by sidebar width */}
      <main className="flex-1 ml-64 overflow-auto">
        {children}
      </main>
    </div>
  )
}
