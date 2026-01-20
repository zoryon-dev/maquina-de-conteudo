/**
 * Library Item Not Found Page
 *
 * Página exibida quando um item da biblioteca não é encontrado.
 */

import Link from "next/link"
import { FileX, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LibraryItemNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
        <FileX className="w-10 h-10 text-white/20" />
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">
        Conteúdo não encontrado
      </h1>

      <p className="text-white/60 mb-8 max-w-md">
        O conteúdo que você procura não existe ou foi removido.
        Verifique o link ou volte para a biblioteca.
      </p>

      <Button
        asChild
        variant="outline"
        className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
      >
        <Link href="/library" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Biblioteca
        </Link>
      </Button>
    </div>
  )
}
