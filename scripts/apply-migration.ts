import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

async function main() {
  console.log('Applying migration...');
  
  // Criar enum published_post_status
  try {
    await sql`CREATE TYPE published_post_status AS ENUM ('scheduled', 'pending', 'processing', 'published', 'failed', 'cancelled')`;
    console.log('✓ Created enum published_post_status');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('✓ Enum published_post_status already exists');
    } else {
      console.error('Error creating enum:', e.message);
    }
  }
  
  // Adicionar coluna media_url
  try {
    await sql`ALTER TABLE published_posts ADD COLUMN IF NOT EXISTS media_url text`;
    console.log('✓ Added column media_url');
  } catch (e: any) {
    console.error('Error adding column:', e.message);
  }
  
  // Alterar coluna status para usar o novo enum
  try {
    await sql`ALTER TABLE published_posts ALTER COLUMN status SET DATA TYPE published_post_status USING status::published_post_status`;
    console.log('✓ Altered column status to use enum');
  } catch (e: any) {
    if (e.message.includes('already uses')) {
      console.log('✓ Column status already uses enum');
    } else {
      console.error('Error altering column:', e.message);
    }
  }
  
  console.log('Migration complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
