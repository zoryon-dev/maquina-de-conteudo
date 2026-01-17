# Infinite Loop Pattern - useEffect com Computed Values

**Erro:** Infinite loop de console logs em componente React
**Data:** 2026-01-17
**Status:** ✅ Resolvido

---

## Sintoma

Console mostra logs repetidos infinitamente:

```bash
Messages updated: 3
Last response: Olá! Para eu te ajudar do melhor jeito...
Is typing: true
Messages updated: 3
Last response: Olá! Para eu te ajudar do melhor jeito...
Is typing: true
... (repeating infinitely)
```

UI torna-se não responsiva devido a re-renders contínuos.

---

## Causa Raiz

Usar um valor computado (`lastResponseText`) diretamente nas dependências de `useEffect` sem memoização:

```typescript
// ❌ ERRADO - lastResponseText é recalculado em cada render
const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
const lastResponseText = lastAssistantMessage ? getMessageText(lastAssistantMessage) : null

useEffect(() => {
  console.log("Messages updated:", messages.length)
  console.log("Last response:", lastResponseText?.slice(0, 100))
  console.log("Is typing:", isTyping)
}, [messages, lastResponseText, isTyping])  // lastResponseText causa loop!
```

**Por que causa loop:**
1. Component renderiza → `lastResponseText` é um novo valor (nova referência)
2. useEffect detecta mudança em `lastResponseText` → executa
3. Console.log causa re-render (React DevTools ou outro efeito)
4. Volta para passo 1

---

## Solução

Mover a computação para `useMemo` com dependências estáveis:

```typescript
// ✅ CORRETO - useMemo garante estabilidade de referência
const lastResponseText = useMemo(() => {
  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
  return lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
}, [messages, getMessageText])

// Remover lastResponseText das dependências do useEffect de debug
useEffect(() => {
  console.log("Messages updated:", messages.length)
  console.log("Last response:", lastResponseText?.slice(0, 100))
  console.log("Is typing:", isTyping)
}, [messages, lastResponseText, isTyping])  // Agora é seguro
```

**Importante:** `getMessageText` também deve ser `useCallback` para não quebrar o memo:

```typescript
const getMessageText = useCallback((message: { parts?: Array<{ type: string; text?: string }> }): string => {
  if (!message.parts) return ""
  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
}, [])
```

---

## Padrão Geral para Evitar Loops Infinitos

| Situação | Solução |
|----------|---------|
| Computar valor derivado de state/props | `useMemo` |
| Função usada em useEffect/useMemo | `useCallback` |
| Objeto/array nas dependências | `useRef` + `JSON.stringify` |
| Evitar re-render desnecessário | `React.memo` no componente |

---

## Arquivos Afetados

- `src/components/dashboard/animated-ai-chat.tsx` - Linhas 157-161

**Antes:**
```typescript
// Get last assistant message for display
const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
const lastResponseText = lastAssistantMessage ? getMessageText(lastAssistantMessage) : null

// Debug log
useEffect(() => {
  console.log("Messages updated:", messages.length)
  console.log("Last response:", lastResponseText?.slice(0, 100))
  console.log("Is typing:", isTyping)
}, [messages, lastResponseText, isTyping])
```

**Depois:**
```typescript
// Get last assistant message for display (memoized to prevent re-renders)
const lastResponseText = useMemo(() => {
  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
  return lastAssistantMessage ? getMessageText(lastAssistantMessage) : null
}, [messages, getMessageText])
```

---

## Referências

- `.context/docs/known-and-corrected-errors/004-infinite-loop-hooks.md` - Padrão semelhante no calendário
- React Documentation: https://react.dev/reference/react/useMemo
- React Documentation: https://react.dev/reference/react/useCallback

---

## Notas Adicionais

1. **React DevTools pode exacerbar o problema** - Ao estar aberto, pode causar re-renders adicionais que tornam loops mais visíveis.

2. **Debug useEffect deve ser removido em produção** - Logs de debug em useEffect podem causar performance issues.

3. ** getMessageText estável** - Como não tem dependências, `useCallback` com array vazio garante mesma referência sempre.
