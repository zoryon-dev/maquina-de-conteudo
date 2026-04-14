/**
 * Factory: createWizardFromTheme
 *
 * Cria um wizard a partir de um tema descoberto, suportando os dois motores:
 *  - tribal_v4        → /wizard/[id]
 *  - brandsdecoded_v4 → /wizard/brandsdecoded/[id]
 *
 * Para BD, constrói um seed baseado na URL/source do tema:
 *  - source=youtube ou URL de youtube → {type: "youtube"}
 *  - URL não-youtube → {type: "link"}
 *  - Sem URL → {type: "theme", value: title}
 */

import { db } from "@/db"
import { themes, contentWizards } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { NotFoundError } from "@/lib/errors"

// ============================================================================
// TYPES
// ============================================================================

export type Motor = "tribal_v4" | "brandsdecoded_v4"

type Seed = {
  id: string
  type: "link" | "youtube" | "keyword" | "theme" | "insight"
  value: string
  briefing?: string
  extractedAt: string
}

const YOUTUBE_REGEX = /youtube\.com|youtu\.be/i

// ============================================================================
// FACTORY
// ============================================================================

export async function createWizardFromTheme(
  themeId: number,
  motor: Motor,
  userId: string
): Promise<{ wizardId: number; redirectPath: string }> {
  // Fetch theme (userId filter prevents IDOR)
  const [theme] = await db
    .select()
    .from(themes)
    .where(and(eq(themes.id, themeId), eq(themes.userId, userId)))
    .limit(1)

  if (!theme) {
    throw new NotFoundError(`theme ${themeId} not found`)
  }

  const title = theme.title
  const referenceUrl = theme.sourceUrl ?? undefined

  if (motor === "tribal_v4") {
    const [row] = await db
      .insert(contentWizards)
      .values({
        userId,
        motor: "tribal_v4",
        currentStep: "input",
        theme: title,
        context: theme.context ?? undefined,
        referenceUrl,
        themeId,
      })
      .returning({ id: contentWizards.id })

    if (!row?.id) throw new Error("Falha ao criar wizard — insert não retornou ID")

    return { wizardId: row.id, redirectPath: `/wizard/${row.id}` }
  }

  // brandsdecoded_v4 — build seed
  const isYoutube =
    theme.sourceType === "youtube" ||
    (!!referenceUrl && YOUTUBE_REGEX.test(referenceUrl))

  let seed: Seed
  if (referenceUrl && isYoutube) {
    seed = {
      id: crypto.randomUUID(),
      type: "youtube",
      value: referenceUrl,
      extractedAt: new Date().toISOString(),
    }
  } else if (referenceUrl) {
    seed = {
      id: crypto.randomUUID(),
      type: "link",
      value: referenceUrl,
      extractedAt: new Date().toISOString(),
    }
  } else {
    seed = {
      id: crypto.randomUUID(),
      type: "theme",
      value: title,
      briefing: title,
      extractedAt: new Date().toISOString(),
    }
  }

  const [row] = await db
    .insert(contentWizards)
    .values({
      userId,
      motor: "brandsdecoded_v4",
      currentStep: "input",
      theme: title,
      seeds: [seed],
      themeId,
    })
    .returning({ id: contentWizards.id })

  if (!row?.id) throw new Error("Falha ao criar wizard — insert não retornou ID")

  return { wizardId: row.id, redirectPath: `/wizard/brandsdecoded/${row.id}` }
}
