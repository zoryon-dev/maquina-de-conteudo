# Infinite Loop Pattern em React Hooks

**Erro:** Infinite POST loop em componentes React
**Data:** Janeiro 2026
**Status:** ✅ Resolvido

---

## Sintoma

O componente faz requests POST infinitas para o servidor, causando:
- Alto consumo de CPU
- Tráfego de rede excessivo
- UI não responsiva
- Logs com milhares de requests

```
POST /calendar 200 in 93ms
POST /calendar 200 in 93ms
POST /calendar 200 in 101ms
... (repeating infinitely)
```

---

## Causa Raiz

Usar `useCallback` com dependências de objeto (`dateRange`, `filters`) que criam nova referência a cada render:

```typescript
// ❌ ERRADO
const fetchPosts = useCallback(async () => {
  const result = await getCalendarPostsAction(dateRange, filters)
  setPosts(result)
}, [dateRange, filters])  // Nova referência a cada render!
```

Ou usar `router.push()` em hooks que causam re-renders:

```typescript
// ❌ ERRADO
const updateUrl = useCallback(() => {
  const params = new URLSearchParams()
  params.set('view', view)
  router.push(`/calendar?${params.toString()}`)
}, [view])  // Trigger re-render → updateUrl → re-render → ...
```

---

## Solução

### 1. Usar `useRef` para Comparação de Estabilidade

```typescript
// ✅ CORRETO
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ dateRange, filters })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchPosts()
  }
}, [dateRange, filters])
```

### 2. Remover URL Sync quando Não Necessário

```typescript
// ✅ CORRETO - State local puro
const [view, setView] = useState<CalendarView>(initialView || "month")
const [currentDate, setCurrentDate] = useState<Date>(() => new Date())

const goToPrevious = useCallback(() => {
  setCurrentDate((prev) => {
    switch (view) {
      case "month": return addMonths(prev, -1)
      case "week": return addDays(prev, -7)
      case "day": return addDays(prev, -1)
    }
  })
}, [view])
```

---

## Quando Usar Cada Abordagem

| Abordagem | Quando Usar |
|-----------|------------|
| `useRef` + `JSON.stringify` | Comparar objetos em `useEffect` |
| State local | Estado interno do componente |
| URL params | Estado que deve ser compartilhável via link |
| Zustand | Estado global compartilhado |

---

## Arquivos Afetados

### Calendário (Fase 6)
- `src/app/(app)/calendar/hooks/use-calendar-posts.ts` - Refatorado para usar `useRef`
- `src/app/(app)/calendar/hooks/use-calendar-navigation.ts` - Removido URL sync
- `src/app/(app)/calendar/hooks/use-calendar-filters.ts` - Removido URL sync

### Biblioteca (Fase 7)
- `src/app/(app)/library/hooks/use-library-data.ts` - Usa `useRef` + `JSON.stringify` para `filters` e `viewMode`

**Exemplo da Biblioteca:**
```typescript
// use-library-data.ts
const prevDepsRef = useRef<string>("")

useEffect(() => {
  const deps = JSON.stringify({ filters, viewMode })
  if (deps !== prevDepsRef.current) {
    prevDepsRef.current = deps
    fetchData()
  }
}, [filters, viewMode])
```

---

## Referências

- `.serena/memories/calendar-patterns.md` - Padrões do calendário
- `.serena/memories/library-patterns.md` - Padrões da biblioteca (mesma solução aplicada)
- `.context/docs/insights/06-fase-6-calendar.md` - Insights da fase 6
- `.context/docs/insights/07-fase-7-library.md` - Insights da fase 7
