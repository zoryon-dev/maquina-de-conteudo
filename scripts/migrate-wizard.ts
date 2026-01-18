/**
 * Manual migration script for content_wizards table
 * Run with: npx tsx scripts/migrate-wizard.ts
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load .env.local
config({ path: ".env.local" });

const sql = neon(String(process.env.DATABASE_URL));

async function migrate() {
  console.log("Starting wizard migration...");

  try {
    // Create wizard_step enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "wizard_step" AS ENUM ('input', 'processing', 'narratives', 'generation', 'completed', 'abandoned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ Created wizard_step enum");

    // Add new job type values
    try {
      await sql`ALTER TYPE "job_type" ADD VALUE 'wizard_narratives'`;
      console.log("✓ Added wizard_narratives job type");
    } catch (e: any) {
      if (e.message.includes("already exists")) {
        console.log("  wizard_narratives already exists");
      }
    }

    try {
      await sql`ALTER TYPE "job_type" ADD VALUE 'wizard_generation'`;
      console.log("✓ Added wizard_generation job type");
    } catch (e: any) {
      if (e.message.includes("already exists")) {
        console.log("  wizard_generation already exists");
      }
    }

    // Create content_wizards table
    await sql`
      CREATE TABLE IF NOT EXISTS "content_wizards" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "current_step" "wizard_step" DEFAULT 'input' NOT NULL,
        "content_type" "post_type",
        "number_of_slides" integer DEFAULT 10,
        "model" text,
        "reference_url" text,
        "reference_video_url" text,
        "theme" text,
        "context" text,
        "objective" text,
        "cta" text,
        "target_audience" text,
        "rag_config" jsonb,
        "negative_terms" jsonb,
        "extracted_content" jsonb,
        "research_queries" jsonb,
        "research_results" jsonb,
        "narratives" jsonb,
        "selected_narrative_id" text,
        "generated_content" jsonb,
        "library_item_id" integer,
        "job_id" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "completed_at" timestamp,
        "abandoned_at" timestamp,
        CONSTRAINT "content_wizards_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
        CONSTRAINT "content_wizards_library_item_id_library_items_id_fk"
          FOREIGN KEY ("library_item_id") REFERENCES "library_items"("id") ON DELETE set null,
        CONSTRAINT "content_wizards_job_id_jobs_id_fk"
          FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE set null
      );
    `;
    console.log("✓ Created content_wizards table");

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS "content_wizards_user_id_idx" ON "content_wizards" USING btree ("user_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "content_wizards_current_step_idx" ON "content_wizards" USING btree ("current_step")`;
    await sql`CREATE INDEX IF NOT EXISTS "content_wizards_created_at_idx" ON "content_wizards" USING btree ("created_at")`;
    await sql`CREATE INDEX IF NOT EXISTS "content_wizards_library_item_id_idx" ON "content_wizards" USING btree ("library_item_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "content_wizards_job_id_idx" ON "content_wizards" USING btree ("job_id")`;
    console.log("✓ Created indexes");

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
