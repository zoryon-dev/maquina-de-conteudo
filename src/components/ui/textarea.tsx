/**
 * Textarea Component
 *
 * Based on shadcn/ui textarea component.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// ============================================================================
// COMPONENT
// ============================================================================

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[80px] w-full rounded-md border border-white/10",
          "bg-white/[0.02] px-3 py-2 text-sm",
          "text-white placeholder:text-white/40",
          // Focus styles
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
          "focus-visible:border-primary/50",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Remove default styles
          "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
