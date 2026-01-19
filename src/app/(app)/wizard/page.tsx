/**
 * Wizard Page - Content Creation Wizard
 *
 * Full-page wizard experience for creating social media content.
 */

import { WizardPage } from "./components/wizard-page"

interface PageProps {
  searchParams: Promise<{ wizardId?: string }>
}

export default async function WizardPageRoute({ searchParams }: PageProps) {
  const params = await searchParams
  const wizardId = params.wizardId ? parseInt(params.wizardId) : undefined

  return <WizardPage wizardId={wizardId} />
}
