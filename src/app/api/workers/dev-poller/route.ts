/**
 * Development Worker Poller
 *
 * Script de desenvolvimento que mantém o worker rodando automaticamente.
 * Útil em desenvolvimento local onde o Vercel Cron não está disponível.
 *
 * Uso: npm run dev:worker (ou adicione ao seu package.json)
 *
 * Em desenvolvimento, este endpoint pode ser chamado pelo cliente
 * para garantir que jobs sejam processados automaticamente.
 */

import { NextResponse } from "next/server";

/**
 * GET /api/workers/dev-poller
 *
 * Inicia o poller do worker em desenvolvimento.
 * O cliente pode chamar este endpoint periodicamente.
 */
export async function GET(request: Request) {
  // Only work in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({
      enabled: false,
      reason: "Dev poller only works in development mode",
    });
  }

  const { searchParams } = new URL(request.url);
  const auto = searchParams.get("auto") === "true";

  if (auto) {
    // Trigger the worker in the background
    // Always use localhost for internal server-to-server calls in development
    const workerUrl = `http://localhost:3000/api/workers?test=true`;

    fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch((error) => {
      console.error("[DevPoller] Failed to trigger worker:", error);
    });

    return NextResponse.json({
      enabled: true,
      triggered: true,
      message: "Worker triggered in background",
    });
  }

  return NextResponse.json({
    enabled: true,
    message: "Dev poller is available. Add ?auto=true to trigger worker.",
  });
}

/**
 * POST /api/workers/dev-poller
 *
 * Alias para trigger o worker automaticamente.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({
      enabled: false,
    });
  }

  // Trigger the worker - always use localhost for internal calls
  const workerUrl = `http://localhost:3000/api/workers?test=true`;

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json() as any;

    return NextResponse.json({
      enabled: true,
      triggered: true,
      workerResponse: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        enabled: true,
        triggered: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
