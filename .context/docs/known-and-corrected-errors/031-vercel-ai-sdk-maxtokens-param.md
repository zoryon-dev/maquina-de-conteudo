# Vercel AI SDK - maxTokens Parameter Error

**Data**: Janeiro 2026
**Status**: ✅ Corrigido
**Arquivo**: `src/lib/wizard-services/llm.service.ts`

## Erro

```
Error: Object literal may only specify known properties, and 'maxTokens' does not exist in type...
```

## Causa

A função `generateText()` do Vercel AI SDK v3+ não suporta o parâmetro `maxTokens`. Isso é diferente de outras bibliotecas LLM que usam esse parâmetro.

## Solução

Remova o parâmetro `maxTokens` das opções de `generateText()`:

```typescript
// ❌ ERRADO
const result = await generateText({
  model: openrouter(model),
  prompt,
  temperature: 0.7,
  maxTokens: 4000, // Error!
});

// ✅ CORRETO
const result = await generateText({
  model: openrouter(model),
  prompt,
  temperature: 0.7,
});
```

## Alternativa

Se precisar limitar tokens, use o parâmetro `maxCompletionTokens` (disponível em alguns modelos) ou controle via prompt:

```typescript
// Limitar via prompt do sistema
const systemPrompt = "Responda em no máximo 500 palavras...";
```

## Referências

- Vercel AI SDK Documentation: https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-text
