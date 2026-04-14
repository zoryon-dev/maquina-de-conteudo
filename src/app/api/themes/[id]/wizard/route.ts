import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createWizardFromTheme, type Motor } from "@/lib/wizard/create-wizard"
import { toAppError, getErrorMessage } from "@/lib/errors"
import { isFeatureEnabled } from "@/lib/features"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const themeId = Number(id)
  if (!Number.isFinite(themeId)) return NextResponse.json({ error: "invalid theme id" }, { status: 400 })

  let body: { motor?: Motor } = {}
  try {
    const text = await request.text()
    if (text.trim()) {
      try {
        body = JSON.parse(text)
      } catch {
        return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
      }
    }
    // body is optional — empty request body is allowed
  } catch {
    // Cannot read body — proceed with empty body
  }

  const motor: Motor = body.motor ?? "tribal_v4"
  if (!["tribal_v4", "brandsdecoded_v4"].includes(motor)) {
    return NextResponse.json({ error: "invalid motor" }, { status: 400 })
  }

  if (motor === "brandsdecoded_v4" && !isFeatureEnabled("NEXT_PUBLIC_FEATURE_BD_WIZARD_V1")) {
    return NextResponse.json({ error: "BrandsDecoded wizard ainda não disponível" }, { status: 403 })
  }

  try {
    const { wizardId, redirectPath } = await createWizardFromTheme(themeId, motor, userId)
    return NextResponse.json({ wizardId, redirectPath })
  } catch (err) {
    const appError = toAppError(err, "WIZARD_CREATE_FAILED")
    console.error("[themes/wizard] Failed to create wizard:", themeId, appError)
    return NextResponse.json({ error: getErrorMessage(appError) }, { status: appError.statusCode ?? 500 })
  }
}
