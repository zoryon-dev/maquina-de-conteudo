import { db } from "@/db"
import { sql } from "drizzle-orm"

async function migrate() {
  console.log("Running storage migration...")

  try {
    // Create enum type
    await db.execute(sql`DO $$ BEGIN
      CREATE TYPE storage_provider AS ENUM ('local', 'r2');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`)
    console.log("✓ Created storage_provider enum")

    // Add columns to documents table
    await db.execute(sql`DO $$ BEGIN
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_provider storage_provider;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`)
    console.log("✓ Added storage_provider column")

    await db.execute(sql`DO $$ BEGIN
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_key text;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`)
    console.log("✓ Added storage_key column")

    await db.execute(sql`DO $$ BEGIN
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_metadata jsonb;
    EXCEPTION
      WHEN duplicate_column THEN null;
    END $$;`)
    console.log("✓ Added storage_metadata column")

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_storage_provider_idx ON documents USING btree (storage_provider);`)
    console.log("✓ Created documents_storage_provider_idx")

    await db.execute(sql`CREATE INDEX IF NOT EXISTS documents_storage_key_idx ON documents USING btree (storage_key);`)
    console.log("✓ Created documents_storage_key_idx")

    console.log("\n✅ Migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

migrate()
