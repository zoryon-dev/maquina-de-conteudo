/**
 * Apply Schema Migration - Published Posts Status Enum
 *
 * This script applies the migration for:
 * 1. Creating published_post_status enum
 * 2. Adding media_url column to published_posts
 * 3. Altering status column to use the new enum
 */

import { neon } from '@neondatabase/serverless';

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function applyMigration() {
  console.log('🔄 Applying schema migration...\n');

  // DATABASE_URL is validated above, but TypeScript needs explicit non-null assertion
  const sql = neon(DATABASE_URL!);

  try {
    // 1. Create enum published_post_status
    console.log('⏳ Creating published_post_status enum...');
    try {
      await sql`
        CREATE TYPE published_post_status AS ENUM (
          'scheduled', 'pending', 'processing', 'published', 'failed', 'cancelled'
        )
      `;
      console.log('✅ Created enum published_post_status');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Enum published_post_status already exists');
      } else {
        throw e;
      }
    }

    // 2. Add media_url column
    console.log('⏳ Adding media_url column...');
    try {
      await sql`ALTER TABLE published_posts ADD COLUMN IF NOT EXISTS media_url text`;
      console.log('✅ Added column media_url');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Column media_url already exists');
      } else {
        throw e;
      }
    }

    // 3. Alter status column to use enum
    console.log('⏳ Altering status column to use enum...');
    try {
      await sql`
        ALTER TABLE published_posts
        ALTER COLUMN status
        SET DATA TYPE published_post_status
        USING status::text::published_post_status
      `;
      console.log('✅ Altered column status to use enum');
    } catch (e: any) {
      if (e.message.includes('already uses') || e.message.includes('already exists')) {
        console.log('✅ Column status already uses enum');
      } else {
        // Try alternative approach for existing data
        console.log('⚠️  Trying alternative approach...');
        await sql`
          ALTER TABLE published_posts
          ALTER COLUMN status
          SET DATA TYPE published_post_status
          USING CASE
            WHEN status = 'scheduled' THEN 'scheduled'::published_post_status
            WHEN status = 'pending' THEN 'pending'::published_post_status
            WHEN status = 'processing' THEN 'processing'::published_post_status
            WHEN status = 'published' THEN 'published'::published_post_status
            WHEN status = 'failed' THEN 'failed'::published_post_status
            WHEN status = 'cancelled' THEN 'cancelled'::published_post_status
            ELSE 'scheduled'::published_post_status
          END
        `;
        console.log('✅ Altered column status using CASE approach');
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error((error as any).message);
    return false;
  }
}

applyMigration().then((success) => {
  process.exit(success ? 0 : 1);
});
