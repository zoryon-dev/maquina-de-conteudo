# Zustand Store Patterns

Padrões de state management usando Zustand.

## Store Básico

```typescript
import { create } from 'zustand'

interface BearStore {
  bears: number
  increase: () => void
  decrease: () => void
}

const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  decrease: () => set((state) => ({ bears: state.bears - 1 })),
}))
```

## Store com Actions Separadas

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type State = {
  count: number
}

type Actions = {
  increment: () => void
  decrement: () => void
  reset: () => void
  setCount: (value: number) => void
}

type CountStore = State & Actions

export const useCountStore = create<CountStore>()(
  devtools(
    (set) => ({
      // State
      count: 0,
      
      // Actions
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
      reset: () => set({ count: 0 }),
      setCount: (value) => set({ count: value }),
    }),
    { name: 'CountStore' }
  )
)
```

## Store com Async Actions

```typescript
interface User {
  id: string
  name: string
  email: string
}

interface UserStore {
  user: User | null
  loading: boolean
  error: string | null
  
  // Actions
  fetchUser: (id: string) => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  // Initial state
  user: null,
  loading: false,
  error: null,
  
  // Async action
  fetchUser: async (id) => {
    set({ loading: true, error: null })
    
    try {
      const response = await fetch(`/api/users/${id}`)
      const user = await response.json()
      set({ user, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user',
        loading: false 
      })
    }
  },
  
  updateUser: async (data) => {
    set({ loading: true, error: null })
    
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
      const user = await response.json()
      set({ user, loading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update user',
        loading: false 
      })
    }
  },
  
  clearUser: () => set({ user: null, error: null })
}))
```

## Store com Persistência

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesStore {
  theme: 'light' | 'dark'
  language: string
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (language: string) => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'pt-BR',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'preferences-storage', // localStorage key
    }
  )
)
```

## Seletores (Otimização de Render)

Em vez de acessar o store inteiro, use seletores para evitar re-renders:

```typescript
// ❌ Ruim - re-renderiza se qualquer coisa mudar
function Component() {
  const { user, loading, error } = useUserStore()
  // ...
}

// ✅ Bom - só re-renderiza se `user` mudar
function Component() {
  const user = useUserStore((state) => state.user)
  const loading = useUserStore((state) => state.loading)
  // ...
}

// ✅ Ainda melhor - seletores shallow
import { shallow } from 'zustand/shallow'

function Component() {
  const { user, loading } = useUserStore(
    (state) => ({ user: state.user, loading: state.loading }),
    shallow
  )
  // ...
}
```

## Composição de Múltiplos Stores

```typescript
// store/auth.ts
export const useAuthStore = create<AuthStore>()(...)

// store/user.ts
export const useUserStore = create<UserStore>()(...)

// store/ui.ts
export const useUIStore = create<UIStore>()(...)

// Uso no componente
function ProfileComponent() {
  const { isAuthenticated } = useAuthStore((state) => state)
  const user = useUserStore((state) => state.user)
  const { sidebarOpen } = useUIStore((state) => state.sidebarOpen)
  
  // ...
}
```

## Actions com Redux Toolkit Style

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Todo {
  id: string
  text: string
  done: boolean
}

interface TodosStore {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
}

export const useTodosStore = create<TodosStore>()(
  immer((set) => ({
    todos: [],
    
    addTodo: (text) => set((state) => {
      state.todos.push({ id: crypto.randomUUID(), text, done: false })
    }),
    
    toggleTodo: (id) => set((state) => {
      const todo = state.todos.find((t) => t.id === id)
      if (todo) todo.done = !todo.done
    }),
    
    removeTodo: (id) => set((state) => {
      state.todos = state.todos.filter((t) => t.id !== id)
    }),
  }))
)
```

## DevTools Integration

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useStore = create()(
  devtools(
    (set) => ({
      // ...
    }),
    {
      name: 'MyStore', // Nome no Redux DevTools
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)
```

## Testing Zustand Stores

```typescript
import { renderHook, act } from '@testing-library/react'
import { useCountStore } from './count-store'

describe('CountStore', () => {
  it('should increment count', () => {
    const { result } = renderHook(() => useCountStore())
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })
  
  it('should reset count', () => {
    const { result } = renderHook(() => useCountStore())
    
    act(() => {
      result.current.setCount(5)
      result.current.reset()
    })
    
    expect(result.current.count).toBe(0)
  })
})
```
