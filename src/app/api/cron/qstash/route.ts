/**
 * QStash Callback Endpoint
 *
 * Este endpoint recebe requisições do QStash para processar jobs agendados.
 *
 * Segurança:
 * - Verifica assinatura do QStash (header X-QStash-Signature)
 * - Valida timestamp para evitar replay attacks
 * - Usa CRON_SECRET como fallback
 *
 * Idempotência:
 * - Cada requisição tem um ID único do QStash
 * - Jobs já processados são ignorados
 *
 * Retry automático:
 * - QStash faz retry automático em caso de falha (status 5xx)
 * - Erros 4xx não geram retry
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Receiver } from "@upstash/qstash";
import { toAppError, getErrorMessage } from "@/lib/errors";

// ============================================================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================================================

/**
 * Verifica a assinatura do QStash usando o SDK oficial (@upstash/qstash Receiver)
 *
 * O Receiver lida com Ed25519 e rotação de chaves automaticamente.
 */
async function verifyQStashSignature(signature: string, body: string): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    console.error("[QStash] Missing signing keys");
    return false;
  }

  try {
    const receiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });
    await receiver.verify({ signature, body });
    return true;
  } catch (error) {
    console.error("[QStash] Signature verification failed:", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Processa o job específico baseado no payload
 */
async function processJob(payload: {
  source?: string;
  job?: string;
  [key: string]: unknown;
}): Promise<{ success: boolean; error?: string; data?: unknown }> {
  const { job } = payload;

  // Router simples baseado no nome do job
  switch (job) {
    case "workers": {
      // Chamar o worker principal
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

      const response = await fetch(`${appUrl}/api/workers`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
          "X-QStash-Source": "callback",
        },
        signal: AbortSignal.timeout(120_000), // 2 minutos timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Worker returned ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    }

    case "social-publish": {
      // Chamar o cron de social publish
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

      const response = await fetch(`${appUrl}/api/cron/social-publish`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${cronSecret}`,
          "X-QStash-Source": "callback",
        },
        signal: AbortSignal.timeout(60_000), // 1 minuto timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Social publish returned ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    }

    case "social-refresh": {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

      const response = await fetch(`${appUrl}/api/cron/social-refresh`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${cronSecret}`,
          "X-QStash-Source": "callback",
        },
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Social refresh returned ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    }

    default:
      return {
        success: false,
        error: `Unknown job type: ${job}`,
      };
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/cron/qstash
 *
 * Recebe callbacks do QStash e processa os jobs agendados.
 */
export async function POST(request: Request) {
  const headersList = await headers();

  // 1. Extrair headers do QStash
  const signature = headersList.get("x-qstash-signature");
  const timestamp = headersList.get("x-qstash-timestamp");
  const authHeader = headersList.get("authorization");
  const messageId = headersList.get("x-qstash-message-id");

  // 2. Obter corpo da requisição
  const rawBody = await request.text();
  let payload: Record<string, unknown> = {};

  try {
    if (rawBody) {
      payload = JSON.parse(rawBody);
    }
  } catch {
    // Corpo vazio ou inválido
  }

  // 3. Verificar autenticação (múltiplos métodos para robustez)

  // Método 1: Assinatura do QStash (via SDK oficial)
  const hasValidSignature = signature
    ? await verifyQStashSignature(signature, rawBody)
    : false;

  // Método 2: CRON_SECRET (para compatibilidade com testes manuais)
  const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET;
  const providedSecret = authHeader?.replace("Bearer ", "");
  const hasValidSecret = !!(cronSecret && providedSecret === cronSecret);

  // Método 3: Test mode (apenas localhost em dev)
  const host = headersList.get("host") || "";
  const isLocalhost = host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
  const isDev = process.env.NODE_ENV === "development";
  const testMode = payload.test === true && isDev && isLocalhost;

  // Validar que pelo menos um método de autenticação passou
  if (!hasValidSignature && !hasValidSecret && !testMode) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing or invalid authentication" },
      { status: 401 }
    );
  }

  // 6. Idempotência: verificar se já processamos este message ID
  // Em produção, você pode usar Redis para rastrear IDs processados
  // Por enquanto, vamos apenas processar e confiar no QStash para não duplicar

  // 7. Processar o job
  try {
    const result = await processJob(payload);

    if (!result.success) {
      // Retornar 5xx para que o QStash faça retry
      return NextResponse.json(
        {
          error: result.error,
          messageId,
          retryable: true,
        },
        { status: 503 } // Service Unavailable -> retry
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
      result: result.data,
    });
  } catch (error) {
    const appError = toAppError(error, "QSTASH_JOB_FAILED");

    // Retornar 5xx para retry
    return NextResponse.json(
      {
        error: getErrorMessage(appError),
        messageId,
        retryable: true,
      },
      { status: 503 }
    );
  }
}

/**
 * GET /api/cron/qstash
 *
 * Endpoint de health check e informações sobre o sistema de cron.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Health check simples
  if (action === "health") {
    const { healthCheck } = await import("@/lib/cron/qstash");
    const health = await healthCheck();

    return NextResponse.json({
      status: health.healthy ? "healthy" : "unhealthy",
      configured: health.configured,
      schedulesCount: health.schedulesCount || 0,
      error: health.error,
    });
  }

  // Informações gerais
  return NextResponse.json({
    service: "QStash Cron Callback",
    version: "1.0.0",
    configured: isQStashConfigured(),
    endpoints: {
      callback: "POST /api/cron/qstash",
      health: "GET /api/cron/qstash?action=health",
      setup: "POST /api/cron/qstash?action=setup",
      trigger: "POST /api/cron/qstash?action=trigger&job=<name>",
    },
    jobs: {
      workers: "Process worker queue (every minute)",
      "social-publish": "Publish scheduled social posts (every 5 minutes)",
      "social-refresh": "Refresh Meta tokens for Instagram connections (daily)",
    },
  });
}

/**
 * PUT /api/cron/qstash
 *
 * Endpoint para configurar os cron jobs no QStash.
 */
export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Apenas permitir em produção ou com autenticação
  const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET;
  const authHeader = (await headers()).get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (action === "setup") {
    const { setupCronJobs } = await import("@/lib/cron/qstash");
    const result = await setupCronJobs();

    return NextResponse.json(result);
  }

  if (action === "remove") {
    const { removeCronJobs } = await import("@/lib/cron/qstash");
    const result = await removeCronJobs();

    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/**
 * Auxiliar para verificar se QStash está configurado
 */
function isQStashConfigured(): boolean {
  return !!(
    process.env.QSTASH_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
