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
  primaryKey,
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
  "document_embedding",
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
    zepThreadId: text("zep_thread_id"), // Zep Cloud thread ID para contexto multi-agent
    currentAgent: text("current_agent").default("zory"), // Agente atual da conversa
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
    index("chats_created_at_idx").on(table.createdAt),
    index("chats_zep_thread_id_idx").on(table.zepThreadId),
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

// 3.1. ZEP_THREADS - Sessões Zep Cloud para contexto multi-agent
export const zepThreads = pgTable(
  "zep_threads",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    zepThreadId: text("zep_thread_id").notNull().unique(), // Zep Cloud thread ID
    currentAgent: text("current_agent").notNull().default("zory"), // Agente atual
    agentSessionId: text("agent_session_id").notNull(), // ID único da sessão do agente
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("zep_threads_user_id_idx").on(table.userId),
    index("zep_threads_zep_id_idx").on(table.zepThreadId),
    unique("zep_threads_user_zep_unique").on(table.userId, table.zepThreadId),
  ]
);

// 3.2. CONVERSATION_COLLECTIONS - Pastas para organizar conversas
export const conversationCollections = pgTable(
  "conversation_collections",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"), // hex color para badge (ex: "#a3e635")
    icon: text("icon"), // nome do ícone Lucide (ex: "folder", "folder-archive")
    parentId: integer("parent_id"), // null = coleção raiz
    orderIdx: integer("order_idx").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
  },
  (table) => [
    index("conversation_collections_user_id_idx").on(table.userId),
    index("conversation_collections_parent_id_idx").on(table.parentId),
    index("conversation_collections_deleted_at_idx").on(table.deletedAt),
    unique("conversation_collections_user_parent_name_unique").on(
      table.userId,
      table.parentId,
      table.name
    ),
  ]
);

// 3.3. CONVERSATION_COLLECTION_ITEMS - Relação many-to-many entre conversas e coleções
export const conversationCollectionItems = pgTable(
  "conversation_collection_items",
  {
    id: serial("id").primaryKey(),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => conversationCollections.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [
    index("conversation_collection_items_collection_id_idx").on(table.collectionId),
    index("conversation_collection_items_conversation_id_idx").on(table.conversationId),
    unique("conversation_collection_items_conv_coll_unique").on(table.conversationId, table.collectionId),
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
    categoryId: integer("category_id").references(
      () => categories.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("library_items_user_id_idx").on(table.userId),
    index("library_items_status_idx").on(table.status),
    index("library_items_type_idx").on(table.type),
    index("library_items_scheduled_for_idx").on(table.scheduledFor),
    index("library_items_category_id_idx").on(table.categoryId),
  ]
);

// 4.1. CATEGORIES - Categorias hierárquicas para organização de conteúdo
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: integer("parent_id"),
    color: text("color"), // hex color para badge (ex: "#a3e635")
    icon: text("icon"), // nome do ícone Lucide (ex: "folder")
    orderIdx: integer("order_idx").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("categories_user_id_idx").on(table.userId),
    index("categories_parent_id_idx").on(table.parentId),
    unique("categories_user_parent_name_unique").on(table.userId, table.parentId, table.name),
  ]
);

// 4.2. TAGS - Tags livres para organização flexível
export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"), // hex color para badge
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tags_user_id_idx").on(table.userId),
    unique("tags_user_name_unique").on(table.userId, table.name),
  ]
);

// 4.3. LIBRARY_ITEM_TAGS - Relação many-to-many entre library_items e tags
export const libraryItemTags = pgTable(
  "library_item_tags",
  {
    libraryItemId: integer("library_item_id")
      .notNull()
      .references(() => libraryItems.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("library_item_tags_library_item_id_idx").on(table.libraryItemId),
    index("library_item_tags_tag_id_idx").on(table.tagId),
    primaryKey({ columns: [table.libraryItemId, table.tagId] }),
  ]
);

// Storage provider enum
export const storageProviderEnum = pgEnum("storage_provider", ["local", "r2"]);

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
    filePath: text("file_path"), // Caminho do arquivo uploadado (pdf, txt, etc) - LEGACY, mantido para compatibilidade
    fileType: text("file_type"), // pdf, txt, md, etc.
    category: text("category").default("general"), // Para seleção em massa no RAG
    metadata: text("metadata"), // JSON
    // Storage fields (Cloudflare R2 migration)
    storageProvider: storageProviderEnum("storage_provider"), // "local" | "r2" | null
    storageKey: text("storage_key"), // Chave única no storage (ex: "documents/user/123-file.pdf")
    storageMetadata: jsonb("storage_metadata"), // Metadados do storage (ETag, versão, etc.)
    embedded: boolean("embedded").default(false).notNull(), // Se possui embeddings gerados
    embeddingModel: text("embedding_model").default("voyage-4-large"), // Modelo usado
    embeddingStatus: text("embedding_status"), // pending, processing, completed, failed
    embeddingProgress: integer("embedding_progress").default(0), // Chunks processados
    chunksCount: integer("chunks_count").default(0), // Total de chunks
    lastEmbeddedAt: timestamp("last_embedded_at"), // Última vez que foi embeddado
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("documents_user_id_idx").on(table.userId),
    index("documents_created_at_idx").on(table.createdAt),
    index("documents_category_idx").on(table.category),
    index("documents_embedded_idx").on(table.embedded),
    index("documents_embedding_status_idx").on(table.embeddingStatus),
    index("documents_embedded_category_idx").on(table.userId, table.category, table.embedded),
    // Storage indexes for R2 migration
    index("documents_storage_provider_idx").on(table.storageProvider),
    index("documents_storage_key_idx").on(table.storageKey),
  ]
);

// 5.1. DOCUMENT_COLLECTIONS - Coleções/Pastas para organizar documentos
export const documentCollections = pgTable(
  "document_collections",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: integer("parent_id"), // null = coleção raiz
    color: text("color"), // hex color para badge (ex: "#a3e635")
    icon: text("icon"), // nome do ícone Lucide (ex: "folder", "folder-archive")
    orderIdx: integer("order_idx").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete
  },
  (table) => [
    index("document_collections_user_id_idx").on(table.userId),
    index("document_collections_parent_id_idx").on(table.parentId),
    unique("document_collections_user_parent_name_unique").on(
      table.userId,
      table.parentId,
      table.name
    ),
  ]
);

// 5.2. DOCUMENT_COLLECTION_ITEMS - Relação many-to-many entre documentos e coleções
export const documentCollectionItems = pgTable(
  "document_collection_items",
  {
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => documentCollections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("document_collection_items_document_id_idx").on(table.documentId),
    index("document_collection_items_collection_id_idx").on(table.collectionId),
    primaryKey({ columns: [table.documentId, table.collectionId] }),
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

// Relations - usersRelations movido para SETTINGS RELATIONS para incluir settings tables

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const zepThreadsRelations = relations(zepThreads, ({ one }) => ({
  user: one(users, {
    fields: [zepThreads.userId],
    references: [users.id],
  }),
}));

// Conversation collections relations
export const conversationCollectionsRelations = relations(conversationCollections, ({ one, many }) => ({
  user: one(users, {
    fields: [conversationCollections.userId],
    references: [users.id],
  }),
  parent: one(conversationCollections, {
    fields: [conversationCollections.parentId],
    references: [conversationCollections.id],
    relationName: "conversation_collection_hierarchy",
  }),
  children: many(conversationCollections, {
    relationName: "conversation_collection_hierarchy",
  }),
  items: many(conversationCollectionItems),
}));

// Conversation collection items relations (junction table)
export const conversationCollectionItemsRelations = relations(conversationCollectionItems, ({ one }) => ({
  collection: one(conversationCollections, {
    fields: [conversationCollectionItems.collectionId],
    references: [conversationCollections.id],
  }),
  conversation: one(chats, {
    fields: [conversationCollectionItems.conversationId],
    references: [chats.id],
  }),
}));

// Update chats relations to include collections
export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
  collectionItems: many(conversationCollectionItems),
}));

export const libraryItemsRelations = relations(libraryItems, ({ one, many }) => ({
  user: one(users, {
    fields: [libraryItems.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [libraryItems.categoryId],
    references: [categories.id],
  }),
  scheduledPosts: many(scheduledPosts),
  tags: many(libraryItemTags),
}));

// Categories relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_hierarchy",
  }),
  children: many(categories, {
    relationName: "category_hierarchy",
  }),
  libraryItems: many(libraryItems),
}));

// Tags relations
export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  libraryItems: many(libraryItemTags),
}));

// LibraryItemTags relations (junction table)
export const libraryItemTagsRelations = relations(libraryItemTags, ({ one }) => ({
  libraryItem: one(libraryItems, {
    fields: [libraryItemTags.libraryItemId],
    references: [libraryItems.id],
  }),
  tag: one(tags, {
    fields: [libraryItemTags.tagId],
    references: [tags.id],
  }),
}));

// documentsRelations - movido para SETTINGS RELATIONS para incluir embeddings

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

// ========================================
// SETTINGS TABLES
// ========================================

// 9. USER_SETTINGS - Configurações gerais do usuário
export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    // Modelos padrão (fallback)
    defaultTextModel: text("default_text_model")
      .notNull()
      .default("openai/gpt-5.2"),
    defaultImageModel: text("default_image_model")
      .notNull()
      .default("openai/gpt-5-image"),
    embeddingModel: text("embedding_model")
      .notNull()
      .default("voyage-4-large"),
    variableProcessingModel: text("variable_processing_model")
      .notNull()
      .default("google/gemini-3-flash-preview"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_settings_user_id_idx").on(table.userId),
  ]
);

// 10. USER_API_KEYS - API keys encriptadas
export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // openrouter, voyage, firecrawl, tavily, screenshotone, apify
    encryptedKey: text("encrypted_key").notNull(),
    nonce: text("nonce").notNull(), // Para AES-256-GCM
    isValid: boolean("is_valid"), // null = não validado ainda
    lastValidatedAt: timestamp("last_validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_api_keys_user_id_idx").on(table.userId),
    index("user_api_keys_provider_idx").on(table.provider),
    unique("user_api_keys_user_provider_unique").on(table.userId, table.provider),
  ]
);

// 11. SYSTEM_PROMPTS - Prompts de sistema (controlado pelos devs)
export const systemPrompts = pgTable(
  "system_prompts",
  {
    id: serial("id").primaryKey(),
    agent: text("agent").notNull().unique(), // zory, estrategista, calendario, criador
    prompt: text("prompt").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("system_prompts_agent_idx").on(table.agent),
  ]
);

// 12. USER_PROMPTS - Sobrescrita de prompts pelo usuário
export const userPrompts = pgTable(
  "user_prompts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agent: text("agent").notNull(), // zory, estrategista, calendario, criador
    prompt: text("prompt").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_prompts_user_id_idx").on(table.userId),
    unique("user_prompts_user_agent_unique").on(table.userId, table.agent),
  ]
);

// 13. USER_VARIABLES - Variáveis personalizáveis do usuário
export const userVariables = pgTable(
  "user_variables",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variableKey: text("variable_key").notNull(), // tone, niche, targetAudience, platform, etc.
    variableValue: text("variable_value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_variables_user_id_idx").on(table.userId),
    index("user_variables_key_idx").on(table.variableKey),
    unique("user_variables_user_key_unique").on(table.userId, table.variableKey),
  ]
);

// 14. DOCUMENT_EMBEDDINGS - Embeddings para RAG
export const documentEmbeddings = pgTable(
  "document_embeddings",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    embedding: text("embedding").notNull(), // Vetor serializado como JSON string
    model: text("model").notNull().default("voyage-4-large"),
    chunkIndex: integer("chunk_index").default(0), // Índice do chunk no documento
    chunkText: text("chunk_text"), // Texto do chunk para exibição
    startPos: integer("start_pos"), // Posição inicial no documento original
    endPos: integer("end_pos"), // Posição final no documento original
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("document_embeddings_document_id_idx").on(table.documentId),
    index("document_embeddings_document_chunk_idx").on(table.documentId, table.chunkIndex),
  ]
);

// Update documents table to add document_type
// Adicionar coluna via migration (não quebra schema atual)

// ========================================
// SETTINGS RELATIONS
// ========================================

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
}));

export const userPromptsRelations = relations(userPrompts, ({ one }) => ({
  user: one(users, {
    fields: [userPrompts.userId],
    references: [users.id],
  }),
}));

export const userVariablesRelations = relations(userVariables, ({ one }) => ({
  user: one(users, {
    fields: [userVariables.userId],
    references: [users.id],
  }),
}));

export const documentEmbeddingsRelations = relations(documentEmbeddings, ({ one }) => ({
  document: one(documents, {
    fields: [documentEmbeddings.documentId],
    references: [documents.id],
  }),
}));

// Update documents relations to include embeddings and collections
export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  embeddings: many(documentEmbeddings),
  collectionItems: many(documentCollectionItems),
}));

// Document collections relations
export const documentCollectionsRelations = relations(documentCollections, ({ one, many }) => ({
  user: one(users, {
    fields: [documentCollections.userId],
    references: [users.id],
  }),
  parent: one(documentCollections, {
    fields: [documentCollections.parentId],
    references: [documentCollections.id],
    relationName: "collection_hierarchy",
  }),
  children: many(documentCollections, {
    relationName: "collection_hierarchy",
  }),
  items: many(documentCollectionItems),
}));

// Document collection items relations (junction table)
export const documentCollectionItemsRelations = relations(documentCollectionItems, ({ one }) => ({
  document: one(documents, {
    fields: [documentCollectionItems.documentId],
    references: [documents.id],
  }),
  collection: one(documentCollections, {
    fields: [documentCollectionItems.collectionId],
    references: [documentCollections.id],
  }),
}));

// Update users relations to include settings tables and collections
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  zepThreads: many(zepThreads),
  libraryItems: many(libraryItems),
  documents: many(documents),
  documentCollections: many(documentCollections),
  conversationCollections: many(conversationCollections),
  sources: many(sources),
  jobs: many(jobs),
  settings: many(userSettings),
  apiKeys: many(userApiKeys),
  prompts: many(userPrompts),
  variables: many(userVariables),
}));

// ========================================
// TYPE EXPORTS - SETTINGS
// ========================================

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type UserApiKey = typeof userApiKeys.$inferSelect;
export type NewUserApiKey = typeof userApiKeys.$inferInsert;
export type SystemPrompt = typeof systemPrompts.$inferSelect;
export type NewSystemPrompt = typeof systemPrompts.$inferInsert;
export type UserPrompt = typeof userPrompts.$inferSelect;
export type NewUserPrompt = typeof userPrompts.$inferInsert;
export type UserVariable = typeof userVariables.$inferSelect;
export type NewUserVariable = typeof userVariables.$inferInsert;
export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert;
export type DocumentCollection = typeof documentCollections.$inferSelect;
export type NewDocumentCollection = typeof documentCollections.$inferInsert;
export type DocumentCollectionItem = typeof documentCollectionItems.$inferSelect;
export type NewDocumentCollectionItem = typeof documentCollectionItems.$inferInsert;

// ========================================
// TYPE EXPORTS - LIBRARY
// ========================================

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type LibraryItemTag = typeof libraryItemTags.$inferSelect;
export type NewLibraryItemTag = typeof libraryItemTags.$inferInsert;

// Type exports
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
export type ZepThread = typeof zepThreads.$inferSelect;
export type NewZepThread = typeof zepThreads.$inferInsert;
export type ConversationCollection = typeof conversationCollections.$inferSelect;
export type NewConversationCollection = typeof conversationCollections.$inferInsert;
export type ConversationCollectionItem = typeof conversationCollectionItems.$inferSelect;
export type NewConversationCollectionItem = typeof conversationCollectionItems.$inferInsert;
export type JobType = typeof jobTypeEnum.enumValues[number];
export type JobStatus = typeof jobStatusEnum.enumValues[number];
export type PostType = typeof postTypeEnum.enumValues[number];
export type ContentStatus = typeof contentStatusEnum.enumValues[number];
