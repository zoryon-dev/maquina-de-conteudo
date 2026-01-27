/**
 * Apply Schema Migration - OAuth Sessions Table
 *
 * This script applies the migration for creating oauth_sessions table.
 * This table replaces cookie-based session storage which doesn't work with Next.js redirects.
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
  console.log('🔄 Applying oauth_sessions table migration...\n');

  const sql = neon(DATABASE_URL);

  try {
    // 1. Create oauth_sessions table
    console.log('⏳ Creating oauth_sessions table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS oauth_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          long_lived_token TEXT,
          token_expires_at TIMESTAMPTZ,
          pages_data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      console.log('✅ Created table oauth_sessions');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Table oauth_sessions already exists');
      } else {
        throw e;
      }
    }

    // 2. Create indexes
    console.log('⏳ Creating indexes...');
    try {
      await sql`CREATE INDEX IF NOT EXISTS oauth_sessions_user_id_idx ON oauth_sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS oauth_sessions_platform_idx ON oauth_sessions(platform)`;
      await sql`CREATE INDEX IF NOT EXISTS oauth_sessions_expires_at_idx ON oauth_sessions(expires_at)`;
      await sql`CREATE INDEX IF NOT EXISTS oauth_sessions_id_expires_at_idx ON oauth_sessions(id, expires_at)`;
      console.log('✅ Created indexes');
    } catch (e: any) {
      console.log('⚠️  Index creation issue (may already exist):', e.message);
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
