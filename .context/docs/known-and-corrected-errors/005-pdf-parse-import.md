# pdf-parse v2.4.5 Import Pattern

**Data:** Jan 16, 2026
**Fase:** Fase 8 - Document Collections & File Upload

## Problema

O pacote `pdf-parse` v2.4.5 mudou sua API em relação à versão anterior. A importação antigada não funciona mais:

```typescript
// ❌ ERRADO - Não funciona mais
import pdf from 'pdf-parse'
const data = await pdf(buffer)

// ❌ ERRADO - Default export não existe
import PDFParse from 'pdf-parse'

// ❌ ERRADO - parse() não existe
const { PDFParse } = await import("pdf-parse")
const parser = new PDFParse(buffer)
const data = await parser.parse()
```

## Solução Correta

```typescript
// ✅ CORRETO - Named import com data option
const { PDFParse } = await import("pdf-parse")
const uint8Array = new Uint8Array(buffer)
const parser = new PDFParse({ data: uint8Array })
const data = await parser.getText()
return data.text || ""
```

## Detalhes

1. **Named import**: Usar `const { PDFParse } = await import("pdf-parse")` para ESM
2. **Constructor**: Passar `{ data: Uint8Array }` como opção
3. **Método**: Usar `getText()` ao invés de `parse()`
4. **Resultado**: Acessar `data.text` para obter o texto extraído

## Contexto de Uso

Usado em: `/src/app/api/documents/upload/route.ts`

```typescript
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse")
    const uint8Array = new Uint8Array(buffer)
    const parser = new PDFParse({ data: uint8Array })
    const data = await parser.getText()
    return data.text || ""
  } catch (error) {
    console.error("PDF extraction error:", error)
    throw new Error("Failed to extract text from PDF")
  }
}
```

## Links

- npm: https://www.npmjs.com/package/pdf-parse
- TypeScript definitions: `node_modules/pdf-parse/dist/pdf-parse/esm/PDFParse.d.ts`
