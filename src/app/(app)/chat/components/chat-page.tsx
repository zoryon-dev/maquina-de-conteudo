/**
 * Chat Page Component
 *
 * Client component managing the chat interface with sidebars.
 * Coordinates collections sidebar, conversations list, and chat area.
 * Includes conversation management: rename, move, delete, drag-drop.
 */

"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MessageSquare,
  Plus,
  FolderPlus,
  MoreVertical,
  Edit2,
  Trash2,
  FolderInput,
  GripVertical,
} from "lucide-react"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { cn } from "@/lib/utils"
import { AiChatSdk } from "@/components/chat/ai-chat-sdk"
import {
  type ChatWithPreview,
} from "../types/chat-types"
import {
  type ConversationCollectionWithCount,
} from "../types/collection-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

interface ChatPageProps {
  initialConversations: ChatWithPreview[]
  initialCollections: ConversationCollectionWithCount[]
}

export function ChatPage({
  initialConversations,
  initialCollections,
}: ChatPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<ChatWithPreview[]>(initialConversations)
  const [collections, setCollections] = useState<ConversationCollectionWithCount[]>(initialCollections)
  const [isNewChat, setIsNewChat] = useState(searchParams.get("new") === "true")

  // Dialog states
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameConversationId, setRenameConversationId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveConversationId, setMoveConversationId] = useState<number | null>(null)
  const [targetCollectionId, setTargetCollectionId] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConversationId, setDeleteConversationId] = useState<number | null>(null)
  const [conversationMenuOpen, setConversationMenuOpen] = useState<number | null>(null)

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const result = await response.json()
      if (result.success && result.chatId) {
        setSelectedConversationId(result.chatId)
        setIsNewChat(false)
        // Clear URL params
        router.replace("/chat")
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }
  }, [router])

  // Handle conversation selection
  const handleSelectConversation = useCallback((chatId: number) => {
    setSelectedConversationId(chatId)
    setIsNewChat(false)
  }, [])

  // Handle collection selection
  const handleSelectCollection = useCallback((collectionId: number | null) => {
    setSelectedCollectionId(collectionId)
    setSelectedConversationId(null)
    // TODO: Fetch conversations for this collection
  }, [])

  // Create new collection
  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) return

    try {
      const response = await fetch("/api/chat/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          icon: "folder",
          color: "#a3e635",
        }),
      })
      const result = await response.json()
      if (result.success) {
        setNewCollectionName("")
        setShowNewCollection(false)
        // Refresh collections
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to create collection:", error)
    }
  }, [newCollectionName])

  // Rename conversation
  const openRenameDialog = useCallback((conversation: ChatWithPreview) => {
    setRenameConversationId(conversation.id)
    setRenameValue(conversation.title)
    setShowRenameDialog(true)
    setConversationMenuOpen(null)
  }, [])

  const handleRenameConversation = useCallback(async () => {
    if (!renameConversationId || !renameValue.trim()) return

    try {
      const response = await fetch(`/api/chat/conversations/${renameConversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue.trim() }),
      })
      const result = await response.json()
      if (result.success) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === renameConversationId
              ? { ...c, title: renameValue.trim() }
              : c
          )
        )
        setShowRenameDialog(false)
        setRenameValue("")
        setRenameConversationId(null)
      }
    } catch (error) {
      console.error("Failed to rename conversation:", error)
    }
  }, [renameConversationId, renameValue])

  // Move conversation to collection
  const openMoveDialog = useCallback((conversationId: number) => {
    setMoveConversationId(conversationId)
    setShowMoveDialog(true)
    setConversationMenuOpen(null)
  }, [])

  const handleMoveConversation = useCallback(async () => {
    if (!moveConversationId) return

    try {
      const response = await fetch(`/api/chat/conversations/${moveConversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: targetCollectionId }),
      })
      const result = await response.json()
      if (result.success) {
        // Remove from list if moved to a collection
        if (targetCollectionId !== null) {
          setConversations((prev) => prev.filter((c) => c.id !== moveConversationId))
        }
        setShowMoveDialog(false)
        setMoveConversationId(null)
        setTargetCollectionId(null)
      }
    } catch (error) {
      console.error("Failed to move conversation:", error)
    }
  }, [moveConversationId, targetCollectionId])

  // Delete conversation
  const openDeleteDialog = useCallback((conversationId: number) => {
    setDeleteConversationId(conversationId)
    setShowDeleteDialog(true)
    setConversationMenuOpen(null)
  }, [])

  const handleDeleteConversation = useCallback(async () => {
    if (!deleteConversationId) return

    try {
      const response = await fetch(`/api/chat/conversations/${deleteConversationId}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (result.success) {
        setConversations((prev) => prev.filter((c) => c.id !== deleteConversationId))
        if (selectedConversationId === deleteConversationId) {
          setSelectedConversationId(null)
          setIsNewChat(true)
        }
        setShowDeleteDialog(false)
        setDeleteConversationId(null)
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }, [deleteConversationId, selectedConversationId])

  // Handle reorder
  const handleReorder = useCallback((newOrder: ChatWithPreview[]) => {
    setConversations(newOrder)
    // TODO: Persist new order to server
  }, [])

  // Format relative time
  const formatRelativeTime = useCallback((date: Date | undefined) => {
    if (!date) return ""
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "agora"
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }, [])

  const currentConversation = conversations.find((c) => c.id === selectedConversationId)

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar - Collections & Conversations */}
      <div className="w-72 bg-white/[0.01] border-r border-white/[0.05] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/90">Conversas</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/40 hover:text-white/60"
                onClick={() => setShowNewCollection(true)}
                title="Nova pasta"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/40 hover:text-white/60"
                onClick={handleNewConversation}
                title="Nova conversa"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Collections */}
        <div className="flex-1 overflow-y-auto">
          {/* "All" / Uncategorized */}
          <button
            onClick={() => handleSelectCollection(null)}
            className={cn(
              "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors",
              selectedCollectionId === null
                ? "bg-primary/10 text-primary"
                : "text-white/60 hover:text-white/80 hover:bg-white/[0.02]"
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">Todas</span>
            <span className="text-xs text-white/30">
              {conversations.length}
            </span>
          </button>

          {/* Collections */}
          <AnimatePresence>
            {collections.map((collection) => (
              <motion.button
                key={collection.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => handleSelectCollection(collection.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                  selectedCollectionId === collection.id
                    ? "bg-primary/10 text-primary"
                    : "text-white/60 hover:text-white/80 hover:bg-white/[0.02]"
                )}
              >
                <FolderPlus className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{collection.name}</span>
                <span className="text-xs text-white/30">
                  {collection.itemCount}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Conversations List */}
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <div className="px-4 mb-2">
              <span className="text-xs text-white/30 uppercase tracking-wider">
                {selectedCollectionId === null ? "Todas as conversas" : "Conversas"}
              </span>
            </div>

            <Reorder.Group
              axis="y"
              values={conversations}
              onReorder={handleReorder}
              className="space-y-0.5"
            >
              <AnimatePresence mode="popLayout">
                {conversations.map((conversation) => (
                  <Reorder.Item
                    key={conversation.id}
                    value={conversation}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative group"
                    dragListener={selectedCollectionId === null}
                  >
                    <div
                      className={cn(
                        "flex items-start gap-2 px-4 py-2 text-sm transition-colors text-left relative",
                        selectedConversationId === conversation.id
                          ? "bg-white/[0.03] text-white/90"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.02]"
                      )}
                    >
                      {/* Drag handle - always present but only interactive when no collection selected */}
                      <div
                        className={cn(
                          "shrink-0 cursor-grab active:cursor-grabbing transition-opacity mt-0.5",
                          selectedCollectionId === null ? "opacity-40 hover:opacity-70 group-hover:opacity-70" : "opacity-0 pointer-events-none"
                        )}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleSelectConversation(conversation.id)}
                      >
                        <p className="truncate font-medium pr-16">{conversation.title}</p>
                        <p className="truncate text-xs text-white/30 mt-0.5">
                          {conversation.lastMessage || "Sem mensagens"}
                        </p>
                      </div>

                      <span className="text-xs text-white/20 shrink-0 mt-0.5">
                        {formatRelativeTime(conversation.lastMessageTime || conversation.updatedAt)}
                      </span>

                      {/* Context menu */}
                      <DropdownMenu
                        open={conversationMenuOpen === conversation.id}
                        onOpenChange={(open) => setConversationMenuOpen(open ? conversation.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1a1a2e] border-white/10 w-40"
                        >
                          <DropdownMenuItem
                            onClick={() => openRenameDialog(conversation)}
                            className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openMoveDialog(conversation.id)}
                            className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                          >
                            <FolderInput className="w-4 h-4 mr-2" />
                            Mover
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(conversation.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {conversations.length === 0 && (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">
                  Nenhuma conversa ainda
                </p>
                <p className="text-xs text-white/20 mt-1">
                  Clique em + para criar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0a0a0f]">
        {isNewChat || !selectedConversationId ? (
          /* New Chat / Welcome State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">
                  {isNewChat ? "Nova conversa" : "Bem-vindo ao chat"}
                </h2>
                <p className="text-sm text-white/50">
                  Converse com Zory para criar conteúdo, tirar dúvidas e mais.
                </p>
              </div>
              <Button
                onClick={handleNewConversation}
                className="bg-primary text-[#0A0A0B] hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova conversa
              </Button>
            </div>
          </div>
        ) : (
          /* Active Chat */
          <AiChatSdk
            header={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-white/90">
                    {currentConversation?.title || "Zory"}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/30 hover:text-white/60"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-[#1a1a2e] border-white/10 w-40"
                  >
                    <DropdownMenuItem
                      onClick={() => selectedConversationId && openRenameDialog(currentConversation!)}
                      className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => selectedConversationId && openMoveDialog(selectedConversationId)}
                      className="text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                    >
                      <FolderInput className="w-4 h-4 mr-2" />
                      Mover
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => selectedConversationId && openDeleteDialog(selectedConversationId)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
            placeholder="Converse com Zory..."
            showRagSelector={true}
            useDocumentRagSelector={true}
            showModelSelector={true}
            initialAgent="zory"
            zepThreadId={currentConversation?.zepThreadId ?? null}
          />
        )}
      </div>

      {/* New Collection Dialog */}
      <Dialog open={showNewCollection} onOpenChange={setShowNewCollection}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Nova pasta</DialogTitle>
          </DialogHeader>
          <Input
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Nome da pasta..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateCollection()
              }
            }}
          />
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowNewCollection(false)}
              className="text-white/60 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim()}
              className="bg-primary text-[#0A0A0B] hover:bg-primary/90"
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Renomear conversa</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nome da conversa..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameConversation()
              }
            }}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowRenameDialog(false)
                setRenameValue("")
                setRenameConversationId(null)
              }}
              className="text-white/60 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRenameConversation}
              disabled={!renameValue.trim()}
              className="bg-primary text-[#0A0A0B] hover:bg-primary/90"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Collection Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Mover conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <button
              onClick={() => setTargetCollectionId(null)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                targetCollectionId === null
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Todas as conversas</span>
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => setTargetCollectionId(collection.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                  targetCollectionId === collection.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
                )}
              >
                <FolderPlus className="h-4 w-4" />
                <span>{collection.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowMoveDialog(false)
                setMoveConversationId(null)
                setTargetCollectionId(null)
              }}
              className="text-white/60 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMoveConversation}
              className="bg-primary text-[#0A0A0B] hover:bg-primary/90"
            >
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Excluir conversa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">
            Esta ação não pode ser desfeita. Todas as mensagens desta conversa serão perdidas.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConversationId(null)
              }}
              className="text-white/60 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteConversation}
              variant="destructive"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
