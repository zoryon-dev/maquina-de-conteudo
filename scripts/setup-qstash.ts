#!/usr/bin/env tsx
/**
 * Setup Script for QStash Cron Jobs
 *
 * Este script configura os cron jobs do Upstash QStash.
 * Deve ser executado durante o deploy ou manualmente para inicializar o sistema.
 *
 * Uso:
 *   npx tsx scripts/setup-qstash.ts          # Setup todos os crons
 *   npx tsx scripts/setup-qstash.ts remove  # Remove todos os crons
 *   npx tsx scripts/setup-qstash.ts health   # Health check
 *   npx tsx scripts/setup-qstash.ts trigger  # Trigger manual de um job
 *
 * Variáveis de ambiente necessárias:
 *   - QSTASH_TOKEN ou UPSTASH_REDIS_REST_TOKEN
 *   - NEXT_PUBLIC_APP_URL (opcional, usa localhost:3000 por padrão)
 *   - CRON_SECRET (opcional, usa dev-secret por padrão)
 */

import { config } from "dotenv";
import { resolve } from "path";

// Carregar .env.local explicitamente
const result = config({ path: resolve(process.cwd(), ".env.local") });

if (result.error) {
  console.warn("Warning: Could not load .env.local:", result.error.message);
}

import { setupCronJobs, removeCronJobs, healthCheck, triggerJob } from "../src/lib/cron/qstash";

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "setup";

  console.log("═".repeat(60));
  console.log("  QStash Cron Jobs Setup");
  console.log("═".repeat(60));
  console.log("");

  // Verificar variáveis de ambiente
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const hasToken = !!(process.env.QSTASH_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);

  console.log(`Environment:`);
  console.log(`  APP_URL:      ${appUrl}`);
  console.log(`  QSTASH_TOKEN: ${hasToken ? "✓ configured" : "✗ missing"}`);
  console.log("");

  if (!hasToken) {
    console.error("Error: QSTASH_TOKEN or UPSTASH_REDIS_REST_TOKEN is required");
    console.log("");
    console.log("Get your token at: https://console.upstash.com/qstash");
    process.exit(1);
  }

  try {
    switch (command) {
      case "setup": {
        console.log("Setting up cron jobs...");
        console.log("");

        const result = await setupCronJobs();

        console.log("");
        console.log("Results:");
        console.log(`  Created: ${result.created.length} jobs`);
        console.log(`  Deleted: ${result.deleted.length} jobs`);
        console.log(`  Errors:  ${result.errors.length} errors`);

        if (result.created.length > 0) {
          console.log("");
          console.log("Created schedules:");
          for (const name of result.created) {
            console.log(`  ✓ ${name}`);
          }
        }

        if (result.errors.length > 0) {
          console.log("");
          console.log("Errors:");
          for (const err of result.errors) {
            console.log(`  ✗ ${err.name}: ${err.error}`);
          }
        }

        process.exit(result.success ? 0 : 1);
      }

      case "remove": {
        console.log("Removing all cron jobs...");
        console.log("");

        const result = await removeCronJobs();

        console.log("");
        console.log("Results:");
        console.log(`  Deleted: ${result.deleted.length} jobs`);
        console.log(`  Errors:  ${result.errors.length} errors`);

        if (result.deleted.length > 0) {
          console.log("");
          console.log("Deleted schedules:");
          for (const endpoint of result.deleted) {
            console.log(`  ✓ ${endpoint}`);
          }
        }

        if (result.errors.length > 0) {
          console.log("");
          console.log("Errors:");
          for (const err of result.errors) {
            console.log(`  ✗ ${err.error}`);
          }
        }

        process.exit(result.success ? 0 : 1);
      }

      case "health": {
        console.log("Checking QStash health...");
        console.log("");

        const result = await healthCheck();

        console.log("Health Check Results:");
        console.log(`  Healthy:      ${result.healthy ? "✓" : "✗"}`);
        console.log(`  Configured:   ${result.configured ? "✓" : "✗"}`);
        console.log(`  Schedules:    ${result.schedulesCount || 0}`);

        if (result.error) {
          console.log("");
          console.log(`Error: ${result.error}`);
        }

        process.exit(result.healthy ? 0 : 1);
      }

      case "trigger": {
        const jobName = args[1];

        if (!jobName) {
          console.error("Error: Job name is required for trigger command");
          console.log("");
          console.log("Available jobs:");
          console.log("  - workers");
          console.log("  - socialPublish");
          console.log("");
          console.log("Usage: npx tsx scripts/setup-qstash.ts trigger <job-name>");
          process.exit(1);
        }

        console.log(`Triggering job: ${jobName}...`);
        console.log("");

        const result = await triggerJob(jobName as any);

        if (result.success) {
          console.log("✓ Job triggered successfully");
          console.log(`  Message ID: ${result.jobId}`);
          console.log(`  ${result.message}`);
        } else {
          console.error("✗ Failed to trigger job");
          console.error(`  Error: ${result.error}`);
        }

        process.exit(result.success ? 0 : 1);
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log("");
        console.log("Available commands:");
        console.log("  setup    - Configure all cron jobs");
        console.log("  remove   - Remove all cron jobs");
        console.log("  health   - Check QStash health");
        console.log("  trigger  - Manually trigger a job");
        console.log("");
        console.log("Usage: npx tsx scripts/setup-qstash.ts <command>");
        process.exit(1);
    }
  } catch (error) {
    console.error("");
    console.error("Error:", error);
    process.exit(1);
  }
}

// Executar
main();
