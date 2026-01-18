/**
 * Dashboard - Redirect to /chat
 *
 * The old dashboard has been moved to /chat.
 * This page now redirects to maintain backwards compatibility.
 */

import { redirect } from "next/navigation"

export default function DashboardPage() {
  redirect("/chat")
}
