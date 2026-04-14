import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createWizardFromTheme, type Motor } from "@/lib/wizard/create-wizard"

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
  try { body = await request.json() } catch { /* optional body */ }

  const motor: Motor = body.motor ?? "tribal_v4"
  if (!["tribal_v4", "brandsdecoded_v4"].includes(motor)) {
    return NextResponse.json({ error: "invalid motor" }, { status: 400 })
  }

  try {
    const { wizardId, redirectPath } = await createWizardFromTheme(themeId, motor, userId)
    return NextResponse.json({ wizardId, redirectPath })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
