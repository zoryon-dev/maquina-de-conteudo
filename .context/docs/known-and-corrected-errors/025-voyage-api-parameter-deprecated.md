# Erro 025: Parâmetro `encoding_format` depreciado na API da Voyage AI

## Data
2025-01-17

## Sintoma
Erro ao processar embeddings na aba Fontes, mesmo com a API key da Voyage configurada corretamente.

## Causa Raiz
A API da Voyage AI atualizou seus parâmetros, e o parâmetro `encoding_format` foi renomeado para `output_dtype`.

## Detalhes
A documentação da Voyage AI mostra que o parâmetro correto agora é `output_dtype` em vez de `encoding_format`:
- https://docs.voyageai.com/docs/embeddings

Valores aceitos para `output_dtype`:
- `float` - 32-bit floating point (padrão)
- `int8` - 8-bit inteiros (-128 a 127)
- `uint8` - 8-bit unsigned (0 a 255)
- `binary` - bit-packed quantized single-bit (int8)
- `ubinary` - bit-packed quantized single-bit (uint8)

## Arquivos Afetados
- `src/lib/voyage/embeddings.ts` - 2 ocorrências
- `src/lib/voyage/index.ts` - 1 ocorrência (função de validação)

## Correção
```typescript
// ❌ ANTIGO (depreciado)
body: JSON.stringify({
  input: text,
  model,
  encoding_format: "float",
})

// ✅ NOVO (correto)
body: JSON.stringify({
  input: text,
  model,
  output_dtype: "float",
})
```

## Referências
- Voyage AI Embeddings Documentation: https://docs.voyageai.com/docs/embeddings
- API Reference: https://docs.voyageai.com/reference/embeddings-api
