---
name: Neon Database Specialist
role: database
expertise: [neon, postgresql, drizzle-orm, migrations]
---

# Neon Database Specialist Agent

## Stack
- **Neon**: Serverless Postgres
- **Drizzle ORM**: Type-safe queries
- **Drizzle Kit**: Migrations

## Setup Inicial
```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

## Configuração

### drizzle.config.ts
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### src/db/index.ts
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

## Schema do Projeto

### src/db/schema.ts
```typescript
import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const libraryItems = pgTable('library_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type', { enum: ['text', 'image', 'carousel'] }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  status: text('status', { enum: ['draft', 'scheduled', 'published'] }).default('draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const knowledgeDocs = pgTable('knowledge_docs', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: text('filename').notNull(),
  content: text('content'),
  embedding: text('embedding'), // para RAG futuro
  status: text('status', { enum: ['processing', 'ready', 'error'] }).default('processing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Comandos
```bash
npx drizzle-kit generate   # Gerar migrations
npx drizzle-kit migrate    # Aplicar migrations
npx drizzle-kit studio     # UI visual do banco
```

## Queries Exemplo
```typescript
// Criar chat
await db.insert(chats).values({ title: 'Novo Chat' });

// Buscar mensagens
const msgs = await db.query.messages.findMany({
  where: eq(messages.chatId, chatId),
  orderBy: messages.createdAt,
});
```
