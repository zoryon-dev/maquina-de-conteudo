# Database Patterns

Padrões para banco de dados com Neon PostgreSQL e Drizzle ORM.

## Configuração

### Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Conexão Serverless

```typescript
// src/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

**Por que HTTP adapter?**
- Compatível com Edge Runtime
- Sem conexões persistentes
- Ideal para serverless (Vercel, Cloudflare)

## Padrões de Schema

### Tabela Base com Soft Delete

```typescript
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Tabela com JSONB

```typescript
import { jsonb } from "drizzle-orm/pg-core";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").notNull(),
  // JSONB para payloads flexíveis
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  result: jsonb("result"),
  priority: integer("priority").default(0),
});
```

### Índices

```typescript
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_created_at_idx").on(table.createdAt),
]);
```

### Relações

```typescript
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
  chats: many(chats),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
}));
```

## Padrões de Query

### Insert com Returning

```typescript
const [newJob] = await db
  .insert(jobs)
  .values({ type, status, userId, payload })
  .returning({ id: jobs.id });
```

### Select com Filtros

```typescript
import { eq, and, desc } from "drizzle-orm";

const userJobs = await db
  .select()
  .from(jobs)
  .where(and(
    eq(jobs.userId, userId),
    eq(jobs.status, "pending" as any)
  ))
  .orderBy(desc(jobs.createdAt))
  .limit(20);
```

### Update

```typescript
await db.update(jobs)
  .set({ status: "completed", result })
  .where(eq(jobs.id, jobId));
```

### Update com Expressão

```typescript
import { sql } from "drizzle-orm";

await db.update(jobs)
  .set({
    attempts: sql`${jobs.attempts} + 1`,
    updatedAt: new Date(),
  })
  .where(eq(jobs.id, jobId));
```

## Schema do Projeto

### 8 Tabelas Principais

```
users          → Sincronizado com Clerk (soft delete)
chats          → Threads de conversa AI
messages       → Mensagens (role: user/assistant/system)
library_items  → Biblioteca de conteúdo (type, status, JSON content)
documents      → Base de conhecimento (RAG)
sources        → Fontes para scraping (unique: userId+url)
scheduled_posts→ Fila de publicação (platform, scheduledFor)
jobs           → Background jobs (type, status, retry logic)
```

## Enums Padrão

```typescript
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "ai_text_generation",
  "ai_image_generation",
  "carousel_creation",
  "scheduled_publish",
  "web_scraping",
]);
```

## Type Inference

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobType = typeof jobTypeEnum.enumValues[number];
```

## Migration com MCP Neon

```typescript
// Criar migration
await prepare_database_migration({
  projectId: "xxx",
  databaseName: "neondb",
  migrationSql: "-- SQL aqui",
});

// Testar no branch temporário
await describe_branch({ branchId: "temp-branch", projectId: "xxx" });

// Confirmar migration
await complete_database_migration({ migrationId: "xxx" });
```

## Scripts NPM

```json
{
  "db:generate": "drizzle-kit generate --dialect postgresql",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:pull": "drizzle-kit introspect"
}
```

## Boas Práticas

1. **Soft Delete**: Sempre usar `deletedAt` em vez de DELETE
2. **Índices**: Adicionar índices para colunas frequentemente filtradas
3. **JSONB**: Usar para dados flexíveis ou que mudam frequentemente
4. **Relations**: Definir explicitamente para type safety
5. **Timestamps**: Usar `defaultNow()` para `createdAt` em todas as tabelas
6. **Cascade**: Usar `onDelete: "cascade"` para relacionamentos fortes

## Connection String

### Formato Pooler (Recomendado)

```env
DATABASE_URL=postgresql://user:pass@host-pooler.region.neon.tech/db?sslmode=require
```

### Direto (Não recomendado para serverless)

```env
DATABASE_URL=postgresql://user:pass@host.region.neon.tech/db?sslmode=require
```
