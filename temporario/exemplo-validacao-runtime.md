# Exemplo de Validação Runtime v4.3

## O Que Acontece Agora

### ❌ SEM VALIDAÇÃO (Antes)
```typescript
// A IA "esquece" de incluir campos:
const respostaIA = {
  throughline: "construir riqueza...",
  valor_central: "",  // ❌ VAZIO!
  slides: [
    { titulo: "Slide 1", corpo: "...", tipo: undefined }  // ❌ SEM TIPO!
  ],
  legenda: "caption curta..."  // ❌ MENOS DE 250 PALAVRAS
};

// TypeScript aceita (tipos estão corretos)
// Mas o conteúdo está INCOMPLETO!
// Usuário recebe carrossel quebrado 😱
```

### ✅ COM VALIDAÇÃO (Agora)
```typescript
// Mesma resposta problemática da IA
const respostaIA = {
  throughline: "construir riqueza...",
  valor_central: "",
  slides: [
    { titulo: "Slide 1", corpo: "...", tipo: undefined }
  ],
  legenda: "caption curta..."
};

// NOSSA VALIDAÇÃO ENTRA EM AÇÃO:
try {
  const validado = validateCarouselResponse(respostaIA);
  // ❌ ERRO CAPTURADO ANTES DE IR PARA O USUÁRIO!
} catch (error) {
  console.error(error.message);
  // "Campo 'valor_central' está vazio (v4.3). A IA deve explicar o valor do carrossel."

  // Podemos tentar novamente com feedback específico!
}
```

## Como Funciona na Prática

### 1. IA Gera Conteúdo
```typescript
// No llm.service.ts:
const text = await generateText({
  model: openrouter(model),
  prompt: getCarouselPrompt({ ... }),  // Prompt v4.3
  temperature: 0.8
});
```

### 2. Parseamos JSON
```typescript
const parsed = extractJSONFromResponse(text);
// Pode retornar objeto incompleto!
```

### 3. **VALIDAÇÃO ENTRA EM AÇÃO** ⭐
```typescript
const validated = validateCarouselResponse(parsed);
```

### O Que a Validação Checa:

#### ✅ Campo `throughline`
```typescript
// Erro se:
- throughline não existe
- throughline é string vazia
```

#### ✅ Campo `valor_central` (NOVO v4.3)
```typescript
// Erro se:
- valor_central não existe
- valor_central é string vazia

// Exemplo válido:
valor_central: "Aprender as 5 regras de dinheiro que separam quem acumula de quem só sobrevive"
```

#### ✅ Campo `slides[].tipo` (NOVO v4.3)
```typescript
// Erro se:
- tipo não existe
- tipo não é um dos 7 válidos

// Tipos válidos:
"problema" | "conceito" | "passo" | "exemplo" | "erro" | "sintese" | "cta"
```

#### ✅ Campo `slides[].corpo`
```typescript
// Erro se:
- corpo não existe
- corpo tem menos de 180 caracteres (v4.3 aumentou!)

// Aviso (warning, não erro) se:
- corpo tem mais de 220 caracteres
```

#### ✅ Campo `legenda`
```typescript
// Erro se:
- legenda não existe
- legenda tem menos de 250 palavras (v4.3 aumentou!)
```

## Exemplo de Erro Amigável

### Código:
```typescript
throw new ValidationError(
  `Slide 2: Campo 'corpo' tem 150 caracteres, mas mínimo v4.3 é 180.`,
  `slides[1].corpo`,
  "180-220 caracteres",
  "150 caracteres (muito curto)"
);
```

### Resultado:
```
❌ ValidationError: Slide 2: Campo 'corpo' tem 150 caracteres,
   mas mínimo v4.3 é 180. A IA deve ser mais generosa.

   Campo: slides[1].corpo
   Esperado: 180-220 caracteres
   Recebido: 150 caracteres (muito curto)
```

## Vantagens da Validação Runtime

### 1. **Feedback Imediato**
- Não esperamos o usuário descobrir que o conteúdo está quebrado
- Capturamos o erro logo após a IA gerar

### 2. **Debugging Fácil**
```typescript
logValidationError(error, "generateCarousel");
// Imprime no console:
// [ValidationError] generateCarousel:
//   Campo: valor_central
//   Esperado: string não-vazia
//   Recebido: ""
```

### 3. **Opcional: Auto-correção**
```typescript
// Futuramente podemos:
const resultado = safeValidateCarousel(response);

if (!resultado.success) {
  // Pedir à IA para corrigir o erro específico
  const correcao = await pedirCorrecao(resultado.error, response);
  return safeValidateCarousel(correcao);
}
```

### 4. **Qualidade Garantida**
```typescript
// Usuário NUNCA recebe:
❌ Carrossel sem valor_central
❌ Slides sem tipo definido
❌ Caption muito curta
❌ Campos vazios

// Usuário SEMPRE recebe:
✅ Conteúdo completo
✅ Campos obrigatórios preenchidos
✅ Tamanos mínimos respeitados
```

## Fluxo Completo com Validação

```
┌─────────────────┐
│  IA Gera JSON   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse JSON     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  validateCarouselResponse()   │ ←── VALIDAÇÃO RUNTIME
│  - throughline existe?        │
│  - valor_central preenchido?  │ ←── NOVO v4.3
│  - tipo definido?             │ ←── NOVO v4.3
│  - corpo >= 180 chars?        │ ←── NOVO v4.3
│  - legenda >= 250 palavras?    │ ←── NOVO v4.3
└────────┬──────────────────────┘
         │
         ├── ❌ Erro? → Log + Throw (usuário vê mensagem amigável)
         │
         ▼
┌─────────────────┐
│  Salva no Banco │
└─────────────────┘
```

## Próximos Passos (Futuro)

### 1. **Auto-correção com Retry**
Se a validação falhar, pedir à IA para corrigir:

```typescript
for (let tentativa = 1; tentativa <= 2; tentativa++) {
  try {
    return validateCarouselResponse(response);
  } catch (error) {
    if (tentativa === 2) throw error; // Última tentativa

    // Pedir correção à IA
    response = await askAICorrection(response, error);
  }
}
```

### 2. **Métricas de Qualidade**
```typescript
// Rastrear quantas vezes a IA falhou:
metrics.validationErrors.carousels.sem_valor_central++;
metrics.validationErrors.carousels.slides_sem_tipo++;
metrics.validationErrors.carousels.corpo_muito_curto++;
```

### 3. **Alertas em Tempo Real**
```typescript
// Se validationErrors > 10% das tentativas:
alert("Modelo X está falhando em validar valor_central. Considerar trocar modelo.");
```

## Resumo

**Antes (Sem Validação):**
- ❌ IA esquece campos → usuário recebe conteúdo quebrado
- ❌ Diffícil debugar onde está o problema
- ❌ Qualidade inconsistente

**Depois (Com Validação):**
- ✅ IA esquece campos → erro capturado, usuário não recebe quebrado
- ✅ Log detalhado do que deu errado
- ✅ Qualidade garantida (100% dos campos obrigatórios)
