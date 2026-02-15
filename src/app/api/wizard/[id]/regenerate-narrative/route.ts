/**
 * Regenerate Single Narrative API Route
 *
 * POST /api/wizard/[id]/regenerate-narrative
 *
 * Regenerates a single narrative at a specific index, keeping the others intact.
 * Uses the same LLM service as the original narrative generation but targeted
 * to produce just one narrative with the specified angle.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { contentWizards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { generateNarratives } from "@/lib/wizard-services/llm.service";
import type { ContentType } from "@/lib/wizard-services/types";
import { z } from "zod";

const requestSchema = z.object({
  narrativeIndex: z.number().min(0).max(10),
  angle: z.enum(["herege", "visionario", "tradutor", "testemunha"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUserId = await ensureAuthenticatedUser();
    const { id } = await params;
    const wizardId = parseInt(id, 10);

    if (isNaN(wizardId)) {
      return NextResponse.json({ error: "Invalid wizard ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request. Required: narrativeIndex (number), angle (string)" },
        { status: 400 }
      );
    }

    const { narrativeIndex, angle } = parseResult.data;

    // Load wizard
    const wizardResult = await db
      .select()
      .from(contentWizards)
      .where(and(eq(contentWizards.id, wizardId), eq(contentWizards.userId, dbUserId)))
      .limit(1);

    const wizard = wizardResult[0];
    if (!wizard) {
      return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
    }

    const existingNarratives = (wizard.narratives as Array<{
      id: string;
      title: string;
      description: string;
      angle: string;
      hook?: string;
      core_belief?: string;
      status_quo_challenged?: string;
      viewpoint?: string;
      whyUse?: string;
      impact?: string;
      tone?: string;
      keywords?: string[];
      differentiation?: string;
      risks?: string;
    }>) ?? [];

    if (narrativeIndex >= existingNarratives.length) {
      return NextResponse.json(
        { error: "Narrative index out of bounds" },
        { status: 400 }
      );
    }

    // Generate a new narrative using the LLM
    const result = await generateNarratives(
      {
        contentType: (wizard.contentType ?? "text") as ContentType,
        theme: wizard.theme ?? undefined,
        context: wizard.context ?? undefined,
        objective: wizard.objective ?? undefined,
        cta: wizard.cta ?? undefined,
        targetAudience: wizard.targetAudience ?? undefined,
        numberOfSlides: wizard.numberOfSlides ?? undefined,
        referenceUrl: wizard.referenceUrl ?? undefined,
        referenceVideoUrl: wizard.referenceVideoUrl ?? undefined,
        customInstructions: `IMPORTANTE: Gere APENAS UMA narrativa com o angulo "${angle}". Retorne um array JSON com exatamente 1 narrativa.`,
      },
      wizard.model ?? undefined,
      dbUserId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Falha ao regenerar narrativa" },
        { status: 500 }
      );
    }

    if (!result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma narrativa gerada" },
        { status: 500 }
      );
    }

    // Pick the first generated narrative (even if multiple were returned)
    // Find one with matching angle, or take the first one
    const newNarrative =
      result.data.find((n) => n.angle === angle) ?? result.data[0];

    // Replace at the specified index
    const updatedNarratives = [...existingNarratives];
    updatedNarratives[narrativeIndex] = {
      ...newNarrative,
      id: `regenerated-${angle}-${Date.now()}`,
      angle: angle,
    };

    // Save to DB
    await db
      .update(contentWizards)
      .set({
        narratives: updatedNarratives as any,
        updatedAt: new Date(),
      })
      .where(eq(contentWizards.id, wizardId));

    return NextResponse.json({
      success: true,
      narrative: updatedNarratives[narrativeIndex],
      narratives: updatedNarratives,
    });
  } catch (error) {
    console.error("[RegenerateNarrative] Error:", error);
    return NextResponse.json(
      { error: "Falha ao regenerar narrativa" },
      { status: 500 }
    );
  }
}
