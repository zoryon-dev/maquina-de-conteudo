/**
 * Wizard Page - Content Creation Wizard
 *
 * Routes to the appropriate wizard based on content type:
 * - Video: Uses WizardVideoPage (separate flow for video content)
 * - Other: Uses WizardPage (general content wizard)
 */

import { WizardPage } from "./components/wizard-page"
import { WizardVideoPage } from "./components/wizard-video-page"

interface PageProps {
  searchParams: Promise<{
    wizardId?: string
    type?: string
  }>
}

export default async function WizardPageRoute({ searchParams }: PageProps) {
  const params = await searchParams
  const wizardId = params.wizardId ? parseInt(params.wizardId) : undefined
  const type = params.type

  // Check if this is a video wizard
  // 1. Explicit type parameter
  // 2. Existing wizard with video content type (would need API check, using URL param for now)
  const isVideoWizard = type === "video"

  if (isVideoWizard) {
    return <WizardVideoPage wizardId={wizardId} />
  }

  return <WizardPage wizardId={wizardId} />
}
