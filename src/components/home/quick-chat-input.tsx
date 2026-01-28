/**
 * Quick Chat Input Component
 *
 * Simple chat input on home page that redirects to /chat with the message.
 * Provides a quick entry point for users to start a conversation.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Send, MessageSquare, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface QuickChatInputProps {
  onAction?: () => void
}

export function QuickChatInput({ onAction }: QuickChatInputProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = input.trim()
    if (!message) return

    if (onAction) {
      onAction()
      return
    }

    // Redirect to /chat with the message
    router.push(`/chat?new=true&message=${encodeURIComponent(message)}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative transition-all duration-300",
          isFocused && "scale-[1.02]"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 p-2 pr-2",
            "bg-white/[0.02] border border-white/[0.05]",
            "rounded-2xl",
            "transition-all duration-300",
            isFocused
              ? "border-primary/30 shadow-lg shadow-primary/10 bg-white/[0.03]"
              : "hover:border-white/10"
          )}
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
            {isFocused ? (
              <Sparkles className="w-5 h-5 text-primary" />
            ) : (
              <MessageSquare className="w-5 h-5 text-primary" />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Converse com Zory..."
            className={cn(
              "flex-1 bg-transparent border-none outline-none",
              "text-white/90 placeholder:text-white/30",
              "text-sm md:text-base"
            )}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
              "shrink-0",
              input.trim()
                ? "bg-primary text-[#0A0A0B] hover:bg-primary/90"
                : "bg-white/5 text-white/30"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Helper text */}
        {!isFocused && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-white/30 mt-3"
          >
            Pressione Enter para começar uma nova conversa
          </motion.p>
        )}
      </form>
    </motion.div>
  )
}
