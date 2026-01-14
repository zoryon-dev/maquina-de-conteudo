# React Hooks Patterns

Padrões de React Hooks customizados usados no projeto.

## Hook Padrão de Breakpoint

```typescript
// src/hooks/use-mobile.ts
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```

**Uso:**
```typescript
function Component() {
  const isMobile = useIsMobile()
  
  return (
    <div className={isMobile ? "flex-col" : "flex-row"}>
      {isMobile ? <MobileNav /> : <DesktopNav />}
    </div>
  )
}
```

## Padrão de Hook de Dados Assíncronos

```typescript
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): AsyncState<T> {
  const [state, setState] = React.useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null
  })

  React.useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      try {
        const result = await asyncFunction()
        if (!cancelled) {
          setState({ data: result, loading: false, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error as Error })
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, dependencies)

  return state
}
```

## Padrão de Hook de Local Storage

```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue]
}
```

## Padrão de Hook de Toggle

```typescript
function useToggle(initialValue = false): {
  value: boolean
  toggle: () => void
  setTrue: () => void
  setFalse: () => void
  setValue: (value: boolean) => void
} {
  const [value, setValue] = React.useState(initialValue)

  const toggle = React.useCallback(() => {
    setValue(v => !v)
  }, [])

  const setTrue = React.useCallback(() => {
    setValue(true)
  }, [])

  const setFalse = React.useCallback(() => {
    setValue(false)
  }, [])

  return { value, toggle, setTrue, setFalse, setValue }
}
```

## Padrão de Hook de Debounce

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

## Hook de Media Query Genérico

```typescript
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches)

    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener("change", handleChange)

    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [query])

  return matches
}
```

**Uso:**
```typescript
const isDark = useMediaQuery("(prefers-color-scheme: dark)")
const isPrint = useMediaQuery("print")
```

## Padrão de Hook de Clipboard

```typescript
function useClipboard(): {
  copy: (text: string) => Promise<boolean>
  copied: boolean
} {
  const [copied, setCopied] = React.useState(false)

  const copy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      setCopied(false)
      return false
    }
  }, [])

  return { copy, copied }
}
```

## Regras dos Hooks

1. ✅ **Sempre** usar hooks no topo do componente
2. ✅ **Sempre** usar hooks em React Components ou outros hooks
3. ❌ **Nunca** chamar hooks condicionalmente
4. ❌ **Nunca** chamar hooks dentro de loops

```typescript
// ❌ Errado
function Component({ condition }) {
  if (condition) {
    const [value, setValue] = useState(0) // Erro!
  }
}

// ✅ Certo
function Component({ condition }) {
  const [value, setValue] = useState(0)
  
  if (!condition) return null
  // ...
}
```

## Hooks Customizados vs Components

- **Hook**: Lógica reutilizável que NÃO retorna JSX
- **Component**: UI reutilizável que SEMPRE retorna JSX

```typescript
// ✅ Hook - retorna valores/funções
function useFormState(initialState) {
  const [state, setState] = useState(initialState)
  return [state, setState] // Sem JSX
}

// ✅ Component - retorna JSX
function FormInput({ label, ...props }) {
  return (
    <div>
      <label>{label}</label>
      <input {...props} />
    </div>
  )
}
```
