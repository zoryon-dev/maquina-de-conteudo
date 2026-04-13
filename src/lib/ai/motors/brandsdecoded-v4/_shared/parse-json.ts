// Re-export a partir de src/lib/ai/shared/parse-json para permitir uso
// cross-motor. Manter este arquivo como barrel garante que imports
// existentes dos módulos BD continuem funcionando.
export { extractLooseJSON } from "@/lib/ai/shared/parse-json"
