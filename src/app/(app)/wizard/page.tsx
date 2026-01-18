/**
 * Wizard Page - Content Creation Wizard
 *
 * Full-page wizard experience for creating social media content.
 */

import { WizardPage } from "./components/wizard-page"

interface PageProps {
  searchParams: { wizardId?: string }
}

export default async function WizardPageRoute({ searchParams }: PageProps) {
  const wizardId = searchParams.wizardId ? parseInt(searchParams.wizardId) : undefined

  return <WizardPage wizardId={wizardId} />
}
