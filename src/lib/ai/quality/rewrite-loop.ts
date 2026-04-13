// Loop de até N tentativas: gera → QA → se reprovou, pede rewrite com
// feedback estruturado. Usado pelo Tribal v4 (e qualquer motor futuro)
// como camada universal de qualidade.

import { runEditorialQA, type EditorialQAResult, type EditorialQAOptions } from "./editorial-qa"

export type RewriteLoopOptions = {
  maxAttempts?: number // default 2
  qaOptions?: EditorialQAOptions
  // Hook opcional para logar tentativas (ex: persistir em jobs.processingProgress)
  onAttempt?: (attempt: number, qa: EditorialQAResult) => void | Promise<void>
}

export type RewriteLoopResult = {
  finalText: string
  attempts: number
  approved: boolean
  history: Array<{ attempt: number; qa: EditorialQAResult }>
}

// O caller fornece um `regenerate` que recebe feedback e devolve novo texto.
// Isso desacopla o loop do prompt específico de cada motor (Tribal, BD, etc).
export type RegenerateFn = (feedback: string) => Promise<string>

export async function runWithRewriteLoop(
  initialText: string,
  regenerate: RegenerateFn,
  opts: RewriteLoopOptions = {}
): Promise<RewriteLoopResult> {
  const maxAttempts = opts.maxAttempts ?? 2
  const history: RewriteLoopResult["history"] = []

  let currentText = initialText
  let attempt = 0

  while (true) {
    attempt += 1
    const qa = await runEditorialQA(currentText, opts.qaOptions)
    history.push({ attempt, qa })

    if (opts.onAttempt) {
      try {
        await opts.onAttempt(attempt, qa)
      } catch (err) {
        // Hook não deve quebrar o loop — só loga.
        console.error("[rewrite-loop] onAttempt hook failed:", err)
      }
    }

    if (qa.passed) {
      return {
        finalText: currentText,
        attempts: attempt,
        approved: true,
        history,
      }
    }

    if (attempt > maxAttempts) {
      // Esgotou tentativas — devolve a última versão MESMO assim, para não
      // travar o pipeline. Caller decide se mostra warning ao usuário.
      return {
        finalText: currentText,
        attempts: attempt - 1,
        approved: false,
        history,
      }
    }

    try {
      currentText = await regenerate(qa.feedback)
    } catch (err) {
      console.error("[rewrite-loop] regenerate failed at attempt", attempt, err)
      return {
        finalText: currentText,
        attempts: attempt,
        approved: false,
        history,
      }
    }
  }
}
