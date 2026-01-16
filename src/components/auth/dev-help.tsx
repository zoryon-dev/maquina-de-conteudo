"use client"

import { Info } from "lucide-react"

/**
 * DevHelp - Informações de ajuda para desenvolvimento
 *
 * Mostra instruções apenas em ambiente de desenvolvimento.
 */
export function DevHelp() {
  if (process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-white/70 space-y-1.5">
          <p className="font-medium text-white">
            Ambiente de Desenvolvimento
          </p>
          <p className="text-white/50">
            Para testar o aplicativo, crie uma conta gratuita usando o botão
            "Criar conta" ou faça login com Google/GitHub.
          </p>
          <p className="text-white/50">
            Você também pode criar usuários de teste diretamente no{" "}
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Clerk Dashboard
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
