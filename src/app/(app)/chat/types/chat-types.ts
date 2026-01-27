/**
 * Client-safe types for chat/conversations
 * Contains ONLY types - no server-side logic
 */

export interface ChatResult {
  success: boolean
  error?: string
  chatId?: number
}

export interface ChatWithPreview {
  id: number
  title: string
  model: string
  zepThreadId: string | null
  currentAgent: string | null
  createdAt: Date
  updatedAt: Date
  lastMessage?: string
  lastMessageTime?: Date
  messageCount: number
}

export interface MessageWithRole {
  id: number
  chatId: number
  role: "user" | "assistant" | "system"
  content: string
  createdAt: Date
}
