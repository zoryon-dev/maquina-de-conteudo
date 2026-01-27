/**
 * Server Actions for Chat/Conversations
 *
 * Handles CRUD operations for chat conversations
 */

"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { chats, messages, conversationCollectionItems, type NewChat, type NewMessage } from "@/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"

/**
 * Result of a chat operation
 */
export interface ChatResult {
  success: boolean
  error?: string
  chatId?: number
}

/**
 * Chat with last message preview
 */
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

/**
 * Message with role and content
 */
export interface MessageWithRole {
  id: number
  chatId: number
  role: "user" | "assistant" | "system"
  content: string
  createdAt: Date
}

/**
 * Fetches all conversations for the current user
 * Optionally filtered by collection
 */
export async function getConversationsAction(
  collectionId?: number | null
): Promise<ChatWithPreview[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // If collection is specified, get chat IDs from collection
    if (collectionId !== null && collectionId !== undefined) {
      const items = await db
        .select({ conversationId: conversationCollectionItems.conversationId })
        .from(conversationCollectionItems)
        .where(eq(conversationCollectionItems.collectionId, collectionId))

      const chatIds = items.map((item) => item.conversationId)

      if (chatIds.length === 0) {
        return [] // Collection is empty
      }

      // Query with collection filter using IN clause
      const allChats = await db
        .select({
          id: chats.id,
          title: chats.title,
          model: chats.model,
          zepThreadId: chats.zepThreadId,
          currentAgent: chats.currentAgent,
          createdAt: chats.createdAt,
          updatedAt: chats.updatedAt,
        })
        .from(chats)
        .where(
          and(
            eq(chats.userId, userId),
            sql`${chats.id} = ANY(${chatIds})`
          ) as any
        )
        .orderBy(desc(chats.updatedAt))

      // Get message counts and last messages for each chat
      const result: ChatWithPreview[] = []
      for (const chat of allChats) {
        const [messageData] = await db
          .select({
            count: sql<number>`count(*)::int`.as("count"),
            lastMessage: messages.content,
            lastMessageTime: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.chatId, chat.id))
          .orderBy(desc(messages.createdAt))
          .limit(1)

        result.push({
          ...chat,
          messageCount: messageData?.count || 0,
          lastMessage: messageData?.lastMessage || undefined,
          lastMessageTime: messageData?.lastMessageTime || undefined,
        })
      }

      return result
    }

    // Query without collection filter
    const allChats = await db
      .select({
        id: chats.id,
        title: chats.title,
        model: chats.model,
        zepThreadId: chats.zepThreadId,
        currentAgent: chats.currentAgent,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
      })
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt))

    // Get message counts and last messages for each chat
    const result: ChatWithPreview[] = []
    for (const chat of allChats) {
      const [messageData] = await db
        .select({
          count: sql<number>`count(*)::int`.as("count"),
          lastMessage: messages.content,
          lastMessageTime: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.chatId, chat.id))
        .orderBy(desc(messages.createdAt))
        .limit(1)

      result.push({
        ...chat,
        messageCount: messageData?.count || 0,
        lastMessage: messageData?.lastMessage || undefined,
        lastMessageTime: messageData?.lastMessageTime || undefined,
      })
    }

    return result
  } catch (error) {
    console.error("Get conversations error:", error)
    return []
  }
}

/**
 * Fetches conversations NOT in a specific collection
 */
export async function getUncategorizedConversationsAction(): Promise<ChatWithPreview[]> {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  try {
    // Get all chat IDs that ARE in collections
    const collectedIds = await db
      .select({ conversationId: conversationCollectionItems.conversationId })
      .from(conversationCollectionItems)

    const collectedIdSet = new Set(collectedIds.map((item) => item.conversationId))

    // Get all user's chats
    const allChats = await db
      .select({
        id: chats.id,
        title: chats.title,
        model: chats.model,
        zepThreadId: chats.zepThreadId,
        currentAgent: chats.currentAgent,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
      })
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt))

    // Filter out chats that are in collections
    const uncategorizedChats = allChats.filter((chat) => !collectedIdSet.has(chat.id))

    // Get message counts and last messages
    const result: ChatWithPreview[] = []
    for (const chat of uncategorizedChats) {
      // Get total message count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int`.as("count") })
        .from(messages)
        .where(eq(messages.chatId, chat.id))

      // Get last message
      const [lastMessageData] = await db
        .select({
          lastMessage: messages.content,
          lastMessageTime: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.chatId, chat.id))
        .orderBy(desc(messages.createdAt))
        .limit(1)

      result.push({
        ...chat,
        messageCount: count || 0,
        lastMessage: lastMessageData?.lastMessage || undefined,
        lastMessageTime: lastMessageData?.lastMessageTime || undefined,
      })
    }

    return result
  } catch (error) {
    console.error("Get uncategorized conversations error:", error)
    return []
  }
}

/**
 * Fetches a single conversation by ID with all messages
 */
export async function getConversationAction(
  chatId: number
): Promise<{ chat: ChatWithPreview | null; messages: MessageWithRole[] }> {
  const { userId } = await auth()

  if (!userId) {
    return { chat: null, messages: [] }
  }

  try {
    // Verify chat belongs to user
    const [chatData] = await db
      .select({
        id: chats.id,
        title: chats.title,
        model: chats.model,
        zepThreadId: chats.zepThreadId,
        currentAgent: chats.currentAgent,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
      })
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1)

    if (!chatData) {
      return { chat: null, messages: [] }
    }

    // Get all messages for this chat
    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt)

    // Get message count
    const [countData] = await db
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(messages)
      .where(eq(messages.chatId, chatId))

    const chat: ChatWithPreview = {
      ...chatData,
      messageCount: countData?.count || 0,
    }

    return {
      chat,
      messages: chatMessages as MessageWithRole[],
    }
  } catch (error) {
    console.error("Get conversation error:", error)
    return { chat: null, messages: [] }
  }
}

/**
 * Creates a new conversation
 */
export async function createConversationAction(
  title?: string,
  model: string = "openai/gpt-5.2"
): Promise<ChatResult & { zepThreadId?: string }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const newChat: NewChat = {
      userId,
      title: title || "Nova conversa",
      model,
      currentAgent: "zory",
    }

    const [inserted] = await db
      .insert(chats)
      .values(newChat)
      .returning()

    revalidatePath("/chat")
    return {
      success: true,
      chatId: inserted.id,
      zepThreadId: inserted.zepThreadId || undefined,
    }
  } catch (error) {
    console.error("Create conversation error:", error)
    return { success: false, error: "Failed to create conversation" }
  }
}

/**
 * Updates conversation title
 */
export async function updateConversationTitleAction(
  chatId: number,
  title: string
): Promise<ChatResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  if (!title.trim()) {
    return { success: false, error: "Title is required" }
  }

  try {
    // Verify chat belongs to user
    const [existing] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Conversation not found" }
    }

    await db
      .update(chats)
      .set({ title: title.trim(), updatedAt: new Date() })
      .where(eq(chats.id, chatId))

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Update conversation title error:", error)
    return { success: false, error: "Failed to update title" }
  }
}

/**
 * Deletes a conversation (soft delete via deletedAt)
 */
export async function deleteConversationAction(
  chatId: number
): Promise<ChatResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify chat belongs to user
    const [existing] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Conversation not found" }
    }

    // Soft delete
    await db
      .update(chats)
      .set({ deletedAt: new Date() })
      .where(eq(chats.id, chatId))

    // Remove from all collections
    await db
      .delete(conversationCollectionItems)
      .where(eq(conversationCollectionItems.conversationId, chatId))

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Delete conversation error:", error)
    return { success: false, error: "Failed to delete conversation" }
  }
}

/**
 * Adds a message to a conversation
 */
export async function addMessageAction(
  chatId: number,
  role: "user" | "assistant" | "system",
  content: string
): Promise<ChatResult & { messageId?: number }> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  if (!content.trim()) {
    return { success: false, error: "Message content is required" }
  }

  try {
    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
      .limit(1)

    if (!chat) {
      return { success: false, error: "Conversation not found" }
    }

    const newMessage: NewMessage = {
      chatId,
      role,
      content: content.trim(),
    }

    const [inserted] = await db
      .insert(messages)
      .values(newMessage)
      .returning()

    // Update chat's updatedAt
    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId))

    revalidatePath("/chat")
    return {
      success: true,
      messageId: inserted.id,
    }
  } catch (error) {
    console.error("Add message error:", error)
    return { success: false, error: "Failed to add message" }
  }
}

/**
 * Moves a conversation to a collection (or removes from collection)
 */
export async function moveConversationToCollectionAction(
  conversationId: number,
  collectionId: number | null
): Promise<ChatResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // Verify conversation belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, conversationId), eq(chats.userId, userId)))
      .limit(1)

    if (!chat) {
      return { success: false, error: "Conversation not found" }
    }

    // If collectionId is null, remove from all collections
    if (collectionId === null) {
      await db
        .delete(conversationCollectionItems)
        .where(eq(conversationCollectionItems.conversationId, conversationId))
    } else {
      // Verify collection belongs to user
      // (Note: we'd need to import conversationCollections here for full validation)
      // For now, just add to collection
      await db
        .insert(conversationCollectionItems)
        .values({
          conversationId,
          collectionId,
        })
        .onConflictDoNothing({
          target: [conversationCollectionItems.conversationId, conversationCollectionItems.collectionId],
        })
    }

    revalidatePath("/chat")
    return { success: true }
  } catch (error) {
    console.error("Move conversation error:", error)
    return { success: false, error: "Failed to move conversation" }
  }
}

/**
 * Updates the Zep thread ID for a conversation
 */
export async function updateZepThreadIdAction(
  chatId: number,
  zepThreadId: string
): Promise<ChatResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await db
      .update(chats)
      .set({ zepThreadId })
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))

    return { success: true }
  } catch (error) {
    console.error("Update Zep thread ID error:", error)
    return { success: false, error: "Failed to update Zep thread ID" }
  }
}
