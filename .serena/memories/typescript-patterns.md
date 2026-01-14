# TypeScript Patterns

Padrões e convenções TypeScript usados no projeto.

## Configuração tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Tipos de Componentes

### Function Component Básico
```typescript
interface ComponentProps {
  title: string
  description?: string
  onAction?: () => void
}

function Component({ title, description, onAction }: ComponentProps) {
  return <div>{title}</div>
}
```

### Com HTMLAttributes
```typescript
import { HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'compact'
}

function Card({ className, variant, children, ...props }: CardProps) {
  return (
    <div className={cn("card-base", className)} {...props}>
      {children}
    </div>
  )
}
```

### Com VariantProps (CVA)
```typescript
import { VariantProps } from "class-variance-authority"

const buttonVariants = cva(/* ... */)

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
```

## Tipos Genéricos

### Tipo Genérico Simples
```typescript
interface AsyncData<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function useAsyncData<T>(fetcher: () => Promise<T>): AsyncData<T> {
  // ...
}
```

### Tipos de React
```typescript
import type { ReactNode, ReactElement } from "react"

interface LayoutProps {
  children: ReactNode
  header?: ReactElement
}
```

## Utility Types

```typescript
// Tornar propriedades opcionais
type PartialUser = Partial<User>

// Tornar propriedades requeridas
type RequiredUser = Required<User>

// Selecionar propriedades
type UserPreview = Pick<User, "id" | "name" | "avatar">

// Omitir propriedades
type CreateUserInput = Omit<User, "id" | "createdAt">

// Union de propriedades
type Status = "pending" | "loading" | "success" | "error"
```

## Tipos de API

```typescript
// API Response genérico
interface ApiResponse<T> {
  data: T
  message?: string
  errors?: Record<string, string[]>
}

// Paginação
interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// Erro da API
interface ApiError {
  code: string
  message: string
  details?: unknown
}
```

## Tipos de Formulário

```typescript
interface FormField<T> {
  value: T
  error?: string
  touched: boolean
}

type FormState<T> = {
  [K in keyof T]: FormField<T[K]>
}

// Exemplo de uso
interface LoginFormData {
  email: string
  password: string
}

const [form, setForm] = useState<FormState<LoginFormData>>({
  email: { value: "", error: undefined, touched: false },
  password: { value: "", error: undefined, touched: false }
})
```

## Tipos de Database (Drizzle)

```typescript
import { users } from "@/db/schema"

// Tipo de inserção (sem id auto-incremento)
type NewUser = typeof users.$inferInsert

// Tipo de seleção (com todos os campos)
type User = typeof users.$inferSelect

// Uso em funções
async function createUser(data: NewUser) {
  await db.insert(users).values(data)
}

async function getUser(id: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id))
  return result[0] ?? null
}
```

## Tipos de Router (Next.js)

```typescript
// App Router Server Component
interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { q } = await searchParams
  // ...
}
```

## Type Guards

```typescript
// Type guard simples
function isString(value: unknown): value is string {
  return typeof value === "string"
}

// Type guard para discriminated union
type Result = 
  | { success: true; data: string }
  | { success: false; error: string }

function isSuccess(result: Result): result is { success: true; data: string } {
  return result.success
}

// Uso
if (isSuccess(result)) {
  console.log(result.data) // TypeScript sabe que data existe
}
```

## Enums vs Union Types

```typescript
// ❌ Evitar enums (bundle size)
enum Status {
  Pending = "pending",
  Loading = "loading",
  Success = "success",
}

// ✅ Preferir union types
type Status = "pending" | "loading" | "success"

// Com const assertion para autocompletion
const Status = {
  Pending: "pending",
  Loading: "loading", 
  Success: "success",
} as const

type Status = typeof Status[keyof typeof Status]
```

## Padrão asChild (Radix)

```typescript
interface ComponentProps {
  asChild?: boolean
  // ... outras props
}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ asChild = false, className, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    
    return (
      <Comp ref={ref} className={cn("base-classes", className)} {...props}>
        {children}
      </Comp>
    )
  }
)
```
