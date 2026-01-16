import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PagePlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
  className?: string
}

/**
 * PagePlaceholder - Template para páginas em desenvolvimento
 *
 * Usado para páginas que ainda não têm funcionalidade implementada.
 */
export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  className,
}: PagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center text-center",
        className
      )}
    >
      {/* Icon container with glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <Icon className="h-10 w-10 text-primary" strokeWidth={2} />
        </div>
      </div>

      {/* Text content */}
      <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-white/60 max-w-md">{description}</p>

      {/* Coming soon badge */}
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm text-primary">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        Em desenvolvimento
      </div>
    </div>
  )
}
