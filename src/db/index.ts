import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";

let sqlClient: NeonQueryFunction<false, false> | null = null;
let dbInstance: NeonHttpDatabase<Record<string, never>> | null = null;

function getDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
}

export function getDb(): NeonHttpDatabase<Record<string, never>> {
  if (!dbInstance) {
    sqlClient = neon(getDbUrl());
    dbInstance = drizzle({ client: sqlClient });
  }
  return dbInstance;
}

// Manter export `db` para compatibilidade, mas usando getter lazy
export const db = new Proxy({} as NeonHttpDatabase<Record<string, never>>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
