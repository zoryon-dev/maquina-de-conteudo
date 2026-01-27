# JSON.parse Error - "[object Object]" is not valid JSON

**Erro:**
```
SyntaxError: "[object Object]" is not valid JSON
    at JSON.parse (<anonymous>)
    at Step4Generation.useEffect.pollWizardStatus (step-4-generation.tsx:129:59)
```

**Contexto:** O Step 4 do Wizard (`step-4-generation.tsx`) estava tentando fazer parse de um campo que já era um objeto JavaScript.

**Causa:** Quando `response.json()` é chamado, o resultado já é um objeto JavaScript parseado. Se o banco retorna um JSONB como objeto (não string), chamar `JSON.parse()` novamente causa erro.

**Solução:** Verificar o tipo antes de tentar fazer parse:
```typescript
// ❌ ERRADO - Assumiu que generatedContent é sempre string
const generatedContent: GeneratedContent = JSON.parse(
  wizard.generatedContent
)

// ✅ CORRETO - Verifica se é string ou objeto
const generatedContent: GeneratedContent = typeof wizard.generatedContent === 'string'
  ? JSON.parse(wizard.generatedContent)
  : wizard.generatedContent
```

**Por que isso acontece:**
- PostgreSQL JSONB columns podem ser retornados como objetos JavaScript pelo Drizzle ORM
- `response.json()` já faz o parse do JSON da resposta HTTP
- Se o valor no banco for armazenado como JSONB (não string JSON), ele vem como objeto

**Arquivo:**
- `.context/docs/known-and-corrected-errors/032-json-parse-object-error.md`
- `src/app/(app)/wizard/components/steps/step-4-generation.tsx` - Linha 129-132

**Janeiro 2026**
