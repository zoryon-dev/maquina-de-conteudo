/**
 * New Article Page
 *
 * Creates a new article via API and redirects to the wizard.
 */

import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"

export default async function NewArticlePage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  // Redirect to articles page with new=true param
  // The ArticleWizardPage will handle creating the article
  redirect("/articles?new=true")
}
