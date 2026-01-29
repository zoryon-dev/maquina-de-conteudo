/**
 * Upstash QStash Client for Cron Jobs
 *
 * Sistema robusto de agendamento usando QStash para substituir Vercel Cron.
 * Usa o SDK oficial @upstash/qstash.
 *
 * Características de robustez:
 * - SDK oficial com autenticação tratada automaticamente
 * - Retry automático com exponential backoff
 * - Idempotência para evitar execuções duplicadas
 * - Health check e monitoramento
 * - Fallback para polling se QStash falhar
 * - Timeout protection
 */

import { Client } from "@upstash/qstash";
import { toAppError, getErrorMessage } from "@/lib/errors";

// ============================================================================
// TYPES
// ============================================================================

export interface QStashSchedule {
  /** Cron expression (ex: "* * * * *" para cada minuto) */
  cron: string;
  /** Endpoint para chamar */
  endpoint: string;
  /** Payload para identificação */
  payload?: Record<string, unknown>;
}

export interface QStashResponse {
  success: boolean;
  scheduleId?: string;
  error?: string;
  message?: string;
}

export interface SetupResult {
  success: boolean;
  created: string[];
  deleted: string[];
  errors: Array<{ name: string; error: string }>;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/** Verifica se QStash está configurado */
export function isQStashConfigured(): boolean {
  return !!(
    process.env.QSTASH_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/** Obtém o token do QStash (JWT completo) */
function getQStashToken(): string {
  // O QStash usa o token JWT completo (não decodificado)
  return process.env.QSTASH_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
}

/** Obtém a URL base da API QStash */
function getQStashUrl(): string {
  return process.env.QSTASH_URL || "https://qstash.upstash.io";
}

/** Obtém a URL da aplicação */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

/** Obtém o secret para autenticação do cron */
function getCronSecret(): string {
  return process.env.CRON_SECRET || process.env.WORKER_SECRET || "dev-secret";
}

/**
 * Cria um cliente QStash configurado
 */
function createQStashClient(): Client | null {
  const token = getQStashToken();
  if (!token) {
    return null;
  }

  try {
    return new Client({
      token,
      baseUrl: getQStashUrl(),
    });
  } catch (error) {
    console.error("[QStash] Error creating client:", error);
    return null;
  }
}

// ============================================================================
// SCHEDULES CONFIGURAÇÃO
// ============================================================================

/**
 * Scheduler para configurar todos os cron jobs da aplicação
 */
export const cronSchedules: Record<string, QStashSchedule> = {
  workers: {
    cron: "* * * * *", // A cada minuto
    endpoint: "/api/workers",
    payload: { source: "qstash", job: "workers" },
  },
  socialPublish: {
    cron: "*/5 * * * *", // A cada 5 minutos
    endpoint: "/api/cron/social-publish",
    payload: { source: "qstash", job: "social-publish" },
  },
};

/**
 * Armazenamento local de schedule IDs para gestão
 *
 * Nota: Em produção, você pode querer armazenar isso no banco de dados
 * ou em um serviço de configuração. Por enquanto, usamos localStorage
 * via arquivo ou variáveis de ambiente.
 */
const SCHEDULE_IDS_KEY = "qstash_schedule_ids";

interface StoredSchedule {
  name: string;
  scheduleId: string;
  cron: string;
  endpoint: string;
  createdAt: string;
}

/**
 * Salva IDs dos schedules localmente (em memória para serverless)
 */
let storedSchedules: Map<string, string> = new Map();

function storeScheduleId(name: string, scheduleId: string): void {
  storedSchedules.set(name, scheduleId);
  // Em produção, salvar no DB:
  // await db.insert(qstashSchedules).values({ name, scheduleId, ... })
}

function getStoredScheduleId(name: string): string | undefined {
  return storedSchedules.get(name);
}

function removeStoredScheduleId(name: string): void {
  storedSchedules.delete(name);
}

/**
 * Lista todos os schedules ativos
 *
 * Nota: O SDK do QStash não tem método para listar schedules,
 * então precisamos rastrear localmente ou usar a API HTTP diretamente.
 */
async function listSchedules(): Promise<{
  schedules?: StoredSchedule[];
  error?: string;
}> {
  // Por enquanto, retorna os schedules armazenados localmente
  // Em produção, buscar do banco ou usar API HTTP
  const schedules: StoredSchedule[] = [];

  for (const [name, scheduleId] of storedSchedules.entries()) {
    const config = cronSchedules[name as keyof typeof cronSchedules];
    if (config && scheduleId) {
      schedules.push({
        name,
        scheduleId,
        cron: config.cron,
        endpoint: config.endpoint,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { schedules };
}

/**
 * Cria um novo schedule no QStash usando a API Schedules
 */
async function createSchedule(
  client: Client,
  cron: string,
  destinationUrl: string,
  options?: {
    headers?: Record<string, string>;
    body?: unknown;
  }
): Promise<{ scheduleId?: string; error?: string }> {
  try {
    // Usar a API Schedules do client
    const result = await client.schedules.create({
      destination: destinationUrl,
      cron: cron,
      body: options?.body as any, // BodyInit type issue with QStash client
      headers: options?.headers as HeadersInit | undefined,
      method: "POST" as const,
      retries: 3, // Retry 3 vezes em caso de falha
    });

    // O resultado é o scheduleId diretamente (string)
    const scheduleId = (result as any).scheduleId || (result as any).id;

    if (!scheduleId) {
      return {
        error: "No schedule ID returned from QStash",
      };
    }

    return { scheduleId };
  } catch (error) {
    const appError = toAppError(error, "QSTASH_CREATE_SCHEDULE_FAILED");
    return {
      error: getErrorMessage(appError),
    };
  }
}

/**
 * Deleta um schedule pelo ID usando o SDK
 */
async function deleteSchedule(
  client: Client,
  scheduleId: string
): Promise<{ error?: string }> {
  try {
    // Usar a API Schedules do client
    await client.schedules.delete(scheduleId);
    return {};
  } catch (error) {
    const appError = toAppError(error, "QSTASH_DELETE_SCHEDULE_FAILED");
    return {
      error: getErrorMessage(appError),
    };
  }
}

/**
 * Lista todos os schedules usando o SDK
 */
async function listAllSchedules(client: Client): Promise<{
  schedules?: Array<{ scheduleId: string; cron: string; destinationUrl: string }>;
  error?: string;
}> {
  try {
    const schedules = await client.schedules.list();

    return {
      schedules: schedules.map((s) => ({
        scheduleId: s.scheduleId,
        cron: s.cron,
        destinationUrl: s.destination,
      })),
    };
  } catch (error) {
    const appError = toAppError(error, "QSTASH_LIST_SCHEDULES_FAILED");
    return {
      error: getErrorMessage(appError),
    };
  }
}

// ============================================================================
// FUNÇÕES DE ALTO NÍVEL
// ============================================================================

/**
 * Configura todos os cron jobs no QStash
 */
export async function setupCronJobs(): Promise<SetupResult> {
  const client = createQStashClient();
  const appUrl = getAppUrl();
  const cronSecret = getCronSecret();

  if (!client) {
    return {
      success: false,
      created: [],
      deleted: [],
      errors: Object.entries(cronSchedules).map(([name]) => ({
        name,
        error: "QStash client not configured",
      })),
    };
  }


  const result: SetupResult = {
    success: true,
    created: [],
    deleted: [],
    errors: [],
  };

  try {
    // 1. Listar schedules existentes no QStash
    const { schedules: existingSchedules, error: listError } =
      await listAllSchedules(client);

    if (listError) {
      console.error("[QStash] Error listing schedules:", listError);
      return {
        success: false,
        created: [],
        deleted: [],
        errors: [{ name: "list", error: listError }],
      };
    }

    // 2. Criar mapa de schedules existentes por endpoint
    const existingMap = new Map<string, string>();
    for (const schedule of existingSchedules || []) {
      existingMap.set(schedule.destinationUrl, schedule.scheduleId);
    }

    // 3. Criar ou atualizar cada schedule
    for (const [name, config] of Object.entries(cronSchedules) as Array<
      [string, QStashSchedule]
    >) {
      const fullUrl = `${appUrl}${config.endpoint}`;

      // Preparar headers com autenticação
      const headers = {
        "Authorization": `Bearer ${cronSecret}`,
      };

      // Converter payload para JSON string para o body
      const body = config.payload
        ? JSON.stringify(config.payload)
        : undefined;

      // Se já existe um schedule para este endpoint, deletar e recriar
      if (existingMap.has(fullUrl)) {
        const oldId = existingMap.get(fullUrl)!;
        const deleteResult = await deleteSchedule(client, oldId);
        if (deleteResult.error) {
          result.errors.push({
            name,
            error: `Delete failed: ${deleteResult.error}`,
          });
          result.success = false;
          continue;
        }
        result.deleted.push(name);
        existingMap.delete(fullUrl);
      }

      // Criar novo schedule usando o SDK
      const createResult = await createSchedule(client, config.cron, fullUrl, {
        headers,
        body: config.payload,
      });

      if (createResult.error || !createResult.scheduleId) {
        result.errors.push({
          name,
          error: createResult.error || "No schedule ID returned",
        });
        result.success = false;
      } else {
        result.created.push(name);
        const scheduleId = typeof createResult.scheduleId === 'string'
          ? createResult.scheduleId
          : JSON.stringify(createResult.scheduleId);
        storeScheduleId(name, scheduleId);
      }
    }

    // 4. Deletar schedules órfãos
    const configuredEndpoints = new Set(
      Object.values(cronSchedules).map((s) => `${appUrl}${s.endpoint}`)
    );

    for (const [endpoint, scheduleId] of existingMap.entries()) {
      if (!configuredEndpoints.has(endpoint)) {
        const { error } = await deleteSchedule(client, scheduleId);
        if (error) {
          result.errors.push({
            name: endpoint,
            error: `Delete orphan failed: ${error}`,
          });
        } else {
          result.deleted.push(endpoint);
        }
      }
    }

    return result;
  } catch (error) {
    const appError = toAppError(error, "QSTASH_SETUP_FAILED");
    console.error("[QStash] Setup error:", appError);
    return {
      success: false,
      created: result.created,
      deleted: result.deleted,
      errors: [{ name: "setup", error: getErrorMessage(appError) }],
    };
  }
}

/**
 * Remove todos os cron jobs do QStash
 */
export async function removeCronJobs(): Promise<{
  success: boolean;
  deleted: string[];
  errors: Array<{ error: string }>;
}> {
  const client = createQStashClient();

  if (!client) {
    return {
      success: false,
      deleted: [],
      errors: [{ error: "QStash client not configured" }],
    };
  }


  const result = {
    success: true,
    deleted: [] as string[],
    errors: [] as Array<{ error: string }>,
  };

  try {
    const { schedules, error: listError } = await listAllSchedules(client);

    if (listError) {
      return {
        success: false,
        deleted: [],
        errors: [{ error: listError }],
      };
    }

    if (!schedules || schedules.length === 0) {
      return result;
    }

    for (const schedule of schedules) {
      const { error } = await deleteSchedule(client, schedule.scheduleId);
      if (error) {
        result.errors.push({
          error: `Failed to delete ${schedule.scheduleId}: ${error}`,
        });
        result.success = false;
      } else {
        result.deleted.push(schedule.destinationUrl);
        // Remover do armazenamento local
        for (const [name, scheduleId] of storedSchedules.entries()) {
          if (scheduleId === schedule.scheduleId) {
            removeStoredScheduleId(name);
          }
        }
      }
    }

    // Limpar armazenamento local
    storedSchedules.clear();

    return result;
  } catch (error) {
    const appError = toAppError(error, "QSTASH_REMOVE_FAILED");
    return {
      success: false,
      deleted: result.deleted,
      errors: [{ error: getErrorMessage(appError) }],
    };
  }
}

/**
 * Trigger manual de um job via QStash
 */
export async function triggerJob(
  jobName: keyof typeof cronSchedules
): Promise<QStashResponse> {
  const client = createQStashClient();
  const appUrl = getAppUrl();
  const cronSecret = getCronSecret();

  if (!client) {
    return {
      success: false,
      error: "QStash client not configured",
    };
  }

  const config = cronSchedules[jobName];
  if (!config) {
    return {
      success: false,
      error: `Unknown job: ${jobName}`,
    };
  }

  const fullUrl = `${appUrl}${config.endpoint}`;

  try {
    const result = await client.publishJSON({
      url: fullUrl,
      body: config.payload as Record<string, unknown>,
      headers: {
        "Authorization": `Bearer ${cronSecret}`,
      } as Record<string, string>,
    });

    return {
      success: true,
      scheduleId: (result as any)?.scheduleId || (result as any)?.messageId,
      message: `Job "${jobName}" triggered successfully`,
    };
  } catch (error) {
    const appError = toAppError(error, "QSTASH_TRIGGER_FAILED");
    return {
      success: false,
      error: getErrorMessage(appError),
    };
  }
}

/**
 * Verifica a saúde do sistema QStash
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  configured: boolean;
  schedulesCount?: number;
  error?: string;
}> {
  const configured = isQStashConfigured();

  if (!configured) {
    return {
      healthy: false,
      configured: false,
      error: "QStash not configured (missing QSTASH_TOKEN or UPSTASH_REDIS_REST_TOKEN)",
    };
  }

  const client = createQStashClient();
  if (!client) {
    return {
      healthy: false,
      configured: true,
      error: "Failed to create QStash client",
    };
  }

  try {
    const { schedules, error } = await listAllSchedules(client);

    if (error) {
      return {
        healthy: false,
        configured: true,
        error,
      };
    }

    return {
      healthy: true,
      configured: true,
      schedulesCount: schedules?.length || 0,
    };
  } catch (error) {
    const appError = toAppError(error, "QSTASH_HEALTH_CHECK_FAILED");
    return {
      healthy: false,
      configured: true,
      error: getErrorMessage(appError),
    };
  }
}

// ============================================================================
// FALLBACK: POLLING MANUAL
// ============================================================================

/**
 * Fallback para quando QStash não está disponível.
 */
export async function fallbackPollingWorker(): Promise<{
  processed: number;
  error?: string;
}> {
  const appUrl = getAppUrl();
  const cronSecret = getCronSecret();

  try {
    const response = await fetch(`${appUrl}/api/workers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return {
        processed: 0,
        error: `Worker returned ${response.status}`,
      };
    }

    return {
      processed: 1,
    };
  } catch (error) {
    const appError = toAppError(error, "FALLBACK_POLLING_FAILED");
    return {
      processed: 0,
      error: getErrorMessage(appError),
    };
  }
}
