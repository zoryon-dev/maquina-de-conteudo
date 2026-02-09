import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"
import { isAdmin } from "@/lib/auth/admin"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const results = {
    steps: [] as string[],
    success: false,
    error: null as string | null,
  }

  try {
    // Create enum type
    await db.execute(sql`DO $$ BEGIN
      CREATE TYPE storage_provider AS ENUM ('local', 'r2');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`)
    results.steps.push("✓ Created storage_provider enum")

    // Add columns to documents table
    await db.execute(sql`DO $$ BEGIN
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_provider storage_provider;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`)
    results.steps.push("✓ Added storage_provider column")

    await db.execute(sql`DO $$ BEGIN
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_key text;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`)
    results.steps.push("✓ Added storage_key column")

    await db.execute(sql`DO $$ BEGIN
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_metadata jsonb;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`)
    results.steps.push("✓ Added storage_metadata column")

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_storage_provider_idx ON documents USING btree (storage_provider);`)
    results.steps.push("✓ Created documents_storage_provider_idx")

    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_storage_key_idx ON documents USING btree (storage_key);`)
    results.steps.push("✓ Created documents_storage_key_idx")

    results.success = true
  } catch (error) {
    console.error("[Admin] Migration error:", error instanceof Error ? error.message : String(error))
    results.error = "Migration failed"
  }

  return NextResponse.json(results)
}
