/**
 * Library Import Template API Route
 *
 * GET /api/library/import/template — Returns a CSV template with headers and 2 example rows
 */

import { NextResponse } from "next/server"

export async function GET() {
  const BOM = "\uFEFF"

  const headers = "id,tipo,titulo,status,legenda,hashtags,categoria,tags,criado_em,atualizado_em"

  const exampleRows = [
    ',text,Dica de produtividade,draft,"Aqui vai a legenda do post com informacoes importantes sobre o tema.",#produtividade #dicas,Marketing,produtividade; dicas,,',
    ',carousel,10 tendencias para 2026,draft,"Descubra as principais tendencias do mercado para o proximo ano.",#tendencias #mercado,Estrategia,tendencias; analise,,',
  ]

  const csv = BOM + [headers, ...exampleRows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-importacao-biblioteca.csv"',
    },
  })
}
