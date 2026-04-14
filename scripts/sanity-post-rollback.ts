// Sanity check pós-rollback: valida que o sistema básico continua
// funcionando depois de reverter uma fase do content-engine-overhaul.
//
// Uso: npx tsx scripts/sanity-post-rollback.ts
//
// TODO (futuras fases):
//   - criar wizard Tribal de teste e validar output mínimo
//   - listar últimos 10 carrosséis e confirmar media_url presente
//   - smoke check do worker queue (jobs PUBLISHING não travados)

async function main(): Promise<void> {
  console.log("[sanity] TODO: criar wizard Tribal teste + validar output")
  console.log("[sanity] TODO: listar últimos 10 carrosséis (media_url check)")
  console.log("[sanity] TODO: smoke check de worker queue (jobs PUBLISHING)")
  console.log("[sanity] DONE (skeleton — implementar nas próximas fases)")
}

main().catch((err) => {
  console.error("[sanity] FAIL:", err)
  process.exit(1)
})
