/**
 * Library Types
 * Tipos para a Biblioteca de Conteúdos
 */

import type {
  LibraryItem as DbLibraryItem,
  ScheduledPost as DbScheduledPost,
} from "@/db/schema";
import type { PostType, ContentStatus } from "@/db/schema";

/**
 * Platform type para agendamento
 */
export type Platform = "instagram" | "twitter" | "linkedin" | "tiktok";

/**
 * Status de scheduled post
 */
export type ScheduledPostStatus = "pending" | "published" | "failed";

/**
 * Category base interface
 */
export interface CategoryBase {
  id: number
  userId: string
  name: string
  parentId: number | null
  color: string | null
  icon: string | null
  orderIdx: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Category type (re-export from DB)
 */
export type Category = CategoryBase

/**
 * Category com filhos (para estrutura hierárquica)
 */
export interface CategoryWithChildren extends CategoryBase {
  children?: CategoryWithChildren[]
  itemCount?: number;
}

/**
 * Tag base interface
 */
export interface TagBase {
  id: number
  userId: string
  name: string
  color: string | null
  createdAt: Date
}

/**
 * Tag type (re-export from DB)
 */
export type Tag = TagBase

/**
 * Tag com contagem de uso
 */
export interface TagWithCount extends TagBase {
  itemCount?: number;
}

/**
 * Library Item com relacionamentos
 */
export interface LibraryItemWithRelations extends DbLibraryItem {
  category?: Category | null;
  tags: Tag[];
  scheduledPosts: ScheduledPostPlatform[];
}

/**
 * Scheduled Post com info de plataforma
 */
export interface ScheduledPostPlatform extends DbScheduledPost {
  platform: Platform;
  status: ScheduledPostStatus;
}

/**
 * Filtros da biblioteca
 */
export interface LibraryFilters {
  search?: string;
  types?: PostType[];
  statuses?: ContentStatus[];
  categories?: number[];
  tags?: number[];
  platforms?: Platform[];
  dateRange?: { start: Date; end: Date; preset?: DatePreset };
  page?: number;
  limit?: number;
}

/**
 * Presets de filtro de data
 */
export type DatePreset = "today" | "week" | "month" | "custom"

/**
 * Configurações de preset de data
 */
export interface DatePresetConfig {
  label: string;
  getRange: () => { start: Date; end: Date }
}

export const DATE_PRESETS: Record<DatePreset, DatePresetConfig> = {
  today: {
    label: "Hoje",
    getRange: () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  },
  week: {
    label: "Esta Semana",
    getRange: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  },
  month: {
    label: "Este Mês",
    getRange: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  },
  custom: {
    label: "Personalizado",
    getRange: () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  }
}

/**
 * Modo de visualização
 */
export interface ViewMode {
  mode: "grid" | "list";
  sortBy: "createdAt" | "updatedAt" | "scheduledFor" | "title";
  sortOrder: "asc" | "desc";
}

/**
 * Form data para criar/editar library item
 */
export interface LibraryItemFormData {
  title?: string;
  content: string;
  type: PostType;
  status?: ContentStatus;
  platforms?: Platform[];
  scheduledFor?: Date | null;
  categoryId?: number | null;
  tagIds?: number[];
  mediaUrl?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Batch action type
 */
export type BatchActionType = "delete" | "updateStatus" | "schedule";

/**
 * Batch action data
 */
export interface BatchAction {
  type: BatchActionType;
  ids: number[];
  data?: {
    status?: ContentStatus;
    scheduledFor?: Date;
  };
}

/**
 * Configurações de plataforma (para badges e UI)
 */
export interface PlatformConfig {
  label: string;
  icon: string;
  color: string;
  bgGradient: string;
  badgeColor: string;
}

/**
 * Configurações de tipo de conteúdo
 */
export interface ContentTypeConfig {
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Configurações de status
 */
export interface ContentStatusConfig {
  label: string;
  color: string;
  bgGradient: string;
  icon: string;
}

/**
 * Resposta de Server Action
 */
export interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Paginação
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Lista paginada
 */
export interface PaginatedList<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * Estatísticas da biblioteca
 */
export interface LibraryStats {
  totalItems: number;
  byType: Record<PostType, number>;
  byStatus: Record<ContentStatus, number>;
  byPlatform: Record<Platform, number>;
  scheduledThisWeek: number;
  scheduledThisMonth: number;
}

/**
 * Operação de edição inline
 */
export interface InlineEditOperation {
  field: "title" | "status" | "categoryId";
  value: unknown;
  itemId: number;
}

/**
 * Estado de seleção para batch actions
 */
export interface SelectionState {
  selectedIds: Set<number>;
  isAllSelected: boolean;
  totalCount: number;
}
