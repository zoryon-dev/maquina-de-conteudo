/**
 * Apply Social Connections Page Fields Migration
 *
 * This script applies the migration for:
 * 1. Adding page_id column to social_connections
 * 2. Adding page_access_token column to social_connections
 * 3. Adding page_name column to social_connections
 * 4. Creating index for page_id
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
  console.log('🔄 Applying social_connections page fields migration...\n');

  const sql = neon(DATABASE_URL);

  try {
    // 1. Add page_id column
    console.log('⏳ Adding page_id column...');
    try {
      await sql`ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS page_id text`;
      console.log('✅ Added column page_id');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Column page_id already exists');
      } else {
        throw e;
      }
    }

    // 2. Add page_access_token column
    console.log('⏳ Adding page_access_token column...');
    try {
      await sql`ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS page_access_token text`;
      console.log('✅ Added column page_access_token');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Column page_access_token already exists');
      } else {
        throw e;
      }
    }

    // 3. Add page_name column
    console.log('⏳ Adding page_name column...');
    try {
      await sql`ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS page_name text`;
      console.log('✅ Added column page_name');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Column page_name already exists');
      } else {
        throw e;
      }
    }

    // 4. Create index for page_id
    console.log('⏳ Creating index for page_id...');
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS social_connections_page_id_idx
        ON social_connections(page_id)
      `;
      console.log('✅ Created index social_connections_page_id_idx');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Index social_connections_page_id_idx already exists');
      } else {
        throw e;
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error((error as any)?.message || error);
    return false;
  }
}

applyMigration().then((success) => {
  process.exit(success ? 0 : 1);
});
