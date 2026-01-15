import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const postTypeEnum = pgEnum("post_type", [
  "text",
  "image",
  "carousel",
  "video",
  "story",
]);

// Job Enums
export const jobTypeEnum = pgEnum("job_type", [
  "ai_text_generation",
  "ai_image_generation",
  "carousel_creation",
  "scheduled_publish",
  "web_scraping",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// 1. USERS - Sincronizado com Clerk
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID
    email: text("email").notNull().unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_created_at_idx").on(table.createdAt),
  ]
);

// 2. CHATS - Threads de conversa
export const chats = pgTable(
  "chats",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    model: text("model").notNull(), // OpenRouter model usado
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
    index("chats_created_at_idx").on(table.createdAt),
  ]
);

// 3. MESSAGES - Mensagens individuais
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_chat_id_idx").on(table.chatId),
    index("messages_created_at_idx").on(table.createdAt),
  ]
);

// 4. LIBRARY_ITEMS - Biblioteca de conteúdo
export const libraryItems = pgTable(
  "library_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: postTypeEnum("type").notNull(),
    status: contentStatusEnum("status").notNull(),
    title: text("title"),
    content: text("content"), // JSON string para conteúdo estruturado
    mediaUrl: text("media_url"), // Array de URLs armazenado como JSON string
    metadata: text("metadata"), // JSON para dados adicionais
    scheduledFor: timestamp("scheduled_for"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("library_items_user_id_idx").on(table.userId),
    index("library_items_status_idx").on(table.status),
    index("library_items_type_idx").on(table.type),
    index("library_items_scheduled_for_idx").on(table.scheduledFor),
  ]
);

// 5. DOCUMENTS - Base de conhecimento
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sourceUrl: text("source_url"),
    fileType: text("file_type"), // pdf, txt, md, etc.
    metadata: text("metadata"), // JSON
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("documents_user_id_idx").on(table.userId),
    index("documents_created_at_idx").on(table.createdAt),
  ]
);

// 6. SOURCES - Fontes de conteúdo para scraping
export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(), // website, rss, social
    config: text("config"), // JSON de configuração de scraping
    lastScrapedAt: timestamp("last_scraped_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sources_user_id_idx").on(table.userId),
    unique("sources_user_url_unique").on(table.userId, table.url),
  ]
);

// 7. SCHEDULED_POSTS - Fila de publicação
export const scheduledPosts = pgTable(
  "scheduled_posts",
  {
    id: serial("id").primaryKey(),
    libraryItemId: integer("library_item_id")
      .notNull()
      .references(() => libraryItems.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // instagram, twitter, linkedin
    scheduledFor: timestamp("scheduled_for").notNull(),
    status: text("status").notNull(), // pending, published, failed
    postedAt: timestamp("posted_at"),
    platformPostId: text("platform_post_id"), // ID externo após publicar
    error: text("error"), // Mensagem de erro se falhou
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("scheduled_posts_scheduled_for_idx").on(table.scheduledFor),
    index("scheduled_posts_status_idx").on(table.status),
  ]
);

// 8. JOBS - Background jobs processing
export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<Record<string, unknown>>(), // Dados de entrada do job
    result: jsonb("result"), // Resultado do processamento
    error: text("error"), // Mensagem de erro se falhou
    priority: integer("priority").default(0), // Prioridade (maior = mais urgente)
    attempts: integer("attempts").default(0), // Número de tentativas
    maxAttempts: integer("max_attempts").default(3), // Máximo de tentativas
    startedAt: timestamp("started_at"), // Quando o job começou a processar
    completedAt: timestamp("completed_at"), // Quando o job terminou
    scheduledFor: timestamp("scheduled_for"), // Para jobs agendados
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("jobs_user_id_idx").on(table.userId),
    index("jobs_status_idx").on(table.status),
    index("jobs_type_idx").on(table.type),
    index("jobs_scheduled_for_idx").on(table.scheduledFor),
    index("jobs_created_at_idx").on(table.createdAt),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  libraryItems: many(libraryItems),
  documents: many(documents),
  sources: many(sources),
  jobs: many(jobs),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const libraryItemsRelations = relations(libraryItems, ({ one, many }) => ({
  user: one(users, {
    fields: [libraryItems.userId],
    references: [users.id],
  }),
  scheduledPosts: many(scheduledPosts),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ one }) => ({
  user: one(users, {
    fields: [sources.userId],
    references: [users.id],
  }),
}));

export const scheduledPostsRelations = relations(scheduledPosts, ({ one }) => ({
  libraryItem: one(libraryItems, {
    fields: [scheduledPosts.libraryItemId],
    references: [libraryItems.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type LibraryItem = typeof libraryItems.$inferSelect;
export type NewLibraryItem = typeof libraryItems.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type NewScheduledPost = typeof scheduledPosts.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobType = typeof jobTypeEnum.enumValues[number];
export type JobStatus = typeof jobStatusEnum.enumValues[number];
