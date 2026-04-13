/**
 * Temperaturas centralizadas do motor BrandsDecoded v4.
 *
 * Cada step do pipeline tem uma temperatura calibrada para sua função:
 * - TRIAGEM (0.3): extração/compressão — quase determinístico.
 * - HEADLINES (0.8): geração criativa com guardrails estruturais.
 * - ESPINHA (0.5): densidade editorial sem virar experimental.
 * - COPY (0.7): redação jornalística com voz consistente.
 * - LEGENDA (0.7): mesma calibração que copy (texto corrido editorial).
 *
 * Cada constante pode ser sobrescrita via env var. Usar `Number()` + `||`
 * garante fallback quando a env var não estiver definida ou for inválida
 * (Number("") === 0 e Number(undefined) === NaN — ambos caem no fallback).
 */

export const BD_TEMP_TRIAGEM = Number(process.env.BD_TEMP_TRIAGEM) || 0.3
export const BD_TEMP_HEADLINES = Number(process.env.BD_TEMP_HEADLINES) || 0.8
export const BD_TEMP_ESPINHA = Number(process.env.BD_TEMP_ESPINHA) || 0.5
export const BD_TEMP_COPY = Number(process.env.BD_TEMP_COPY) || 0.7
export const BD_TEMP_LEGENDA = Number(process.env.BD_TEMP_LEGENDA) || 0.7
