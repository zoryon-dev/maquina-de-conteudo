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

## Error Handling Patterns

### Hierarquia de Erros (Jan 2026)

**Arquivo**: `src/lib/errors.ts`

O projeto usa uma hierarquia de erros específicos em vez de catch-all genéricos:

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace?.(this, this.constructor)
  }

  toJSON() {
    return { name: this.name, message: this.message, code: this.code, statusCode: this.statusCode, details: this.details }
  }
}

// Error types específicos
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details)
    this.name = "ValidationError"
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Authentication failed", details?: unknown) {
    super(message, "AUTH_ERROR", 401, details)
    this.name = "AuthError"
  }
}

export class JobError extends AppError {
  constructor(message: string, public jobId?: number, details?: unknown) {
    super(message, "JOB_ERROR", 500, { jobId, ...details })
    this.name = "JobError"
  }
}
// ... ForbiddenError, NotFoundError, NetworkError, RateLimitError, ConfigError
```

### Type Guards para Erros

```typescript
// Verificar se é AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

// Verificar se tem propriedade code (como SocialApiError)
export function hasErrorCode(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  )
}

// Verificar erro específico
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}
```

### Normalização de Erros

```typescript
// Converter unknown para AppError
export function toAppError(error: unknown, defaultCode: string = "UNKNOWN_ERROR"): AppError {
  if (isAppError(error)) return error
  if (error instanceof Error) {
    return new AppError(error.message, defaultCode, 500, error)
  }
  if (typeof error === "string") {
    return new AppError(error, defaultCode, 500)
  }
  return new AppError("An unknown error occurred", defaultCode, 500, error)
}

// Extrair mensagem de erro safely
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (hasErrorCode(error)) return error.message
  if (isAppError(error)) return error.message
  return "An unknown error occurred"
}
```

### Padrão de Error Handling em APIs

```typescript
// ❌ ERRADO - catch-all genérico
try {
  await operation()
} catch (error) {
  console.error(error)
  return { error: "Something went wrong" }
}

// ✅ CORRETO - tratamento específico
try {
  await operation()
} catch (error) {
  const appError = toAppError(error, "OPERATION_FAILED")
  console.error("[Operation] Error:", appError)

  // Verificar tipo específico
  if (isAuthError(appError)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (hasErrorCode(error) && error.code === "TOKEN_EXPIRED") {
    // Handle token expired
  }

  return NextResponse.json(
    { error: getErrorMessage(appError) },
    { status: appError.statusCode }
  )
}
```

### Agrupamento de Erros em Loops

```typescript
// Para operações em lote, agrupar erros em vez de falhar totalmente
interface BatchError {
  id: number
  error: string
}

const errors: BatchError[] = []
let successCount = 0

for (const item of items) {
  try {
    await processItem(item)
    successCount++
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Batch] Error processing item ${item.id}:`, errorMsg)
    errors.push({ id: item.id, error: errorMsg })
  }
}

// Log summary se houver erros
if (errors.length > 0) {
  console.warn(`[Batch] ${errors.length}/${items.length} failed`)
  console.warn(`[Batch] Failed: ${errors.map(e => `#${e.id}`).join(", ")}`)
}

return { success: true, successCount, errors: errors.length > 0 ? errors : undefined }
```

### Safe JSON Parsing

```typescript
// Evitar crashes com JSON malformado
function parseJsonSafely<T = unknown>(json: string | null | undefined, fallback: T = {} as T): T {
  if (!json) return fallback
  try {
    const parsed = JSON.parse(json)
    return typeof parsed === "object" && parsed !== null ? parsed as T : fallback
  } catch (error) {
    console.error("[Parse] Failed to parse JSON:", error)
    return fallback
  }
}

// Uso
const metadata = parseJsonSafely<Record<string, unknown>>(item.metadata, {})
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
