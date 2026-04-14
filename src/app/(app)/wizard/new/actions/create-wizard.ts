"use server"

/**
 * Server Action: cria um novo content_wizard e resolve o path de redirect.
 *
 * Motor define a rota de destino:
 *  - brandsdecoded_v4 → /wizard/brandsdecoded/[id] (rota isolada BD)
 *  - tribal_v4        → /wizard/[id] (rota Tribal atual)
 *
 * Quando contentType !== "carousel", motor é ignorado no uso prático
 * (wizard Tribal cobre text/image/schedule), mas o registro sempre persiste
 * o motor pra manter a tabela consistente.
 */

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { contentWizards } from "@/db/schema"

export type CreateWizardInput = {
  type: "text" | "image" | "carousel" | "schedule"
  motor: "tribal_v4" | "brandsdecoded_v4"
}

type Result =
  | { success: true; data: { wizardId: number; redirectPath: string } }
  | { success: false; error: string }

export async function createNewWizardAction(
  input: CreateWizardInput
): Promise<Result> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: "auth required" }

  try {
    // schedule não é um tipo de post_type, mapeia pra "text" + marca via metadata
    // futura se necessário. Por ora, persiste como "text" para não violar enum.
    const contentType =
      input.type === "schedule" ? "text" : input.type

    const [row] = await db
      .insert(contentWizards)
      .values({
        userId,
        motor: input.motor,
        contentType,
        currentStep: "input",
      })
      .returning({ id: contentWizards.id })

    if (!row) {
      return { success: false, error: "falha ao criar wizard" }
    }

    const path =
      input.motor === "brandsdecoded_v4"
        ? `/wizard/brandsdecoded/${row.id}`
        : `/wizard/${row.id}`

    return {
      success: true,
      data: { wizardId: row.id, redirectPath: path },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[create-wizard] failed:", msg)
    return { success: false, error: msg }
  }
}
