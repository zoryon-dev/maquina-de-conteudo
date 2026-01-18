/**
 * Chat Page
 *
 * Main page for chat/conversations with sidebar for collections and history.
 * User can create new conversations, organize them into folders, and continue existing chats.
 */

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ChatPage } from "./components/chat-page"
import { getUncategorizedConversationsAction } from "./actions/chat-actions"
import { getRootCollectionsAction } from "./actions/collection-actions"

export default async function ChatPageRoute() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Fetch initial data server-side
  const [conversations, collections] = await Promise.all([
    getUncategorizedConversationsAction(),
    getRootCollectionsAction(),
  ])

  return (
    <ChatPage
      initialConversations={conversations}
      initialCollections={collections}
    />
  )
}
