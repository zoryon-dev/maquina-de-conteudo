# Form Validation Patterns

Padrões de validação de formulários no projeto.

## Validação com Zod

### Schema Básico

```typescript
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter um número'),
})

type LoginFormData = z.infer<typeof loginSchema>
```

### Schema com Refinamento

```typescript
const registerSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})
```

### Schema com Transform

```typescript
const userSchema = z.object({
  email: z.string().email(),
  name: z.string(),
}).transform((data) => ({
  ...data,
  email: data.email.toLowerCase(),
  name: data.name.trim(),
}))
```

## Padrão de Hook de Formulário

### useState + Manual Validation

```typescript
"use client"

import { useState } from 'react'
import { z } from 'zod'

function useForm<T extends z.ZodType>(
  schema: T,
  initialValues: z.infer<T>
) {
  type FormData = z.infer<T>
  
  const [data, setData] = useState<FormData>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({})

  const setValue = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const setTouchedField = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const validate = (): boolean => {
    const result = schema.safeParse(data)
    
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof FormData] = err.message
        }
      })
      setErrors(fieldErrors)
      return false
    }
    
    setErrors({})
    return true
  }

  const reset = () => {
    setData(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    data,
    errors,
    touched,
    setValue,
    setTouchedField,
    validate,
    reset,
  }
}
```

### Uso do Hook

```typescript
function LoginForm() {
  const { data, errors, touched, setValue, setTouchedField, validate } = useForm(
    loginSchema,
    { email: '', password: '' }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validate()) {
      // Submit data
      console.log(data)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input
          value={data.email}
          onChange={(e) => setValue('email', e.target.value)}
          onBlur={() => setTouchedField('email')}
        />
        {touched.email && errors.email && (
          <span className="text-destructive">{errors.email}</span>
        )}
      </div>
      
      <button type="submit">Login</button>
    </form>
  )
}
```

## Validação Server-Side

### Server Action com Validação

```typescript
"use server"

import { z } from 'zod'
import { db } from '@/db'

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

export async function createUser(formData: FormData) {
  // 1. Parse e valida
  const result = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  if (!result.success) {
    return { 
      error: 'Validation failed', 
      issues: result.error.issues 
    }
  }

  // 2. Usa os dados validados (type-safe)
  const { name, email } = result.data
  
  try {
    const user = await db.insert(users).values({ name, email }).returning()
    return { success: true, user }
  } catch {
    return { error: 'Failed to create user' }
  }
}
```

### Cliente com Server Action

```typescript
"use client"

import { useActionState } from 'react'
import { createUser } from '@/app/actions/users'

const initialState = { error: null, user: null }

function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createUser, initialState)

  return (
    <form action={formAction}>
      <input name="name" required minLength={2} />
      <input name="email" type="email" required />
      
      {state.error && <div className="text-destructive">{state.error}</div>}
      
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

## Validação de Password

```typescript
const passwordSchema = z.string()
  .min(8, 'Mínimo de 8 caracteres')
  .max(128, 'Máximo de 128 caracteres')
  .regex(/[a-z]/, 'Deve conter uma letra minúscula')
  .regex(/[A-Z]/, 'Deve conter uma letra maiúscula')
  .regex(/[0-9]/, 'Deve conter um número')
  .regex(/[^a-zA-Z0-9]/, 'Deve conter um caractere especial')

// Com mensagem customizada
const passwordRequirements = [
  { regex: /.{8,}/, message: 'Mínimo 8 caracteres' },
  { regex: /[a-z]/, message: 'Letra minúscula' },
  { regex: /[A-Z]/, message: 'Letra maiúscula' },
  { regex: /[0-9]/, message: 'Número' },
  { regex: /[^a-zA-Z0-9]/, message: 'Caractere especial' },
]

function PasswordStrength({ password }: { password: string }) {
  const checks = passwordRequirements.map(req => ({
    ...req,
    valid: req.regex.test(password),
  }))

  return (
    <div>
      {checks.map(check => (
        <div key={check.message} className={check.valid ? 'text-success' : 'text-muted'}>
          {check.valid ? '✓' : '○'} {check.message}
        </div>
      ))}
    </div>
  )
}
```

## Componente de Input com Erro

```typescript
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function FormInput({ label, error, className, ...props }: FormInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

## Validação Assíncrona

```typescript
// Email único no banco
const emailSchema = z.string().email().superRefine(async (email, ctx) => {
  const exists = await db.query.users.findFirst({
    where: eq(users.email, email)
  })
  
  if (exists) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Email já cadastrado',
    })
  }
})

// Use com refine para validações assíncronas simples
const usernameSchema = z.string()
  .min(3)
  .refine(async (username) => {
    const response = await fetch(`/api/check-username?u=${username}`)
    return response.ok
  }, 'Nome de usuário já existe')
```

## Erros de Formulário

```typescript
// Tipo de erro de formulário
type FormError = {
  field?: string
  message: string
}

// Componente de exibição de erro
function FormErrors({ errors }: { errors: FormError[] }) {
  if (errors.length === 0) return null

  return (
    <div className="rounded-md bg-destructive/10 p-3">
      <h4 className="text-sm font-medium text-destructive">Erros no formulário:</h4>
      <ul className="mt-2 list-inside list-disc text-sm text-destructive">
        {errors.map((err, i) => (
          <li key={i}>{err.message}</li>
        ))}
      </ul>
    </div>
  )
}
```
