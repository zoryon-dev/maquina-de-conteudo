# Next.js App Router Patterns

Padrões específicos para Next.js 15+ com App Router.

## Server vs Client Components

### Server Components (Padrão)
```typescript
// Sem "use client" = Server Component
async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

export default async function UserProfile({ params }: { params: { id: string } }) {
  const user = await getUser(params.id)
  
  return <div>{user.name}</div>
}
```

### Client Components (quando necessário)
```typescript
"use client"

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Padrão de Separação
```typescript
// ✅ Server Component (default)
async function PostsList() {
  const posts = await fetchPosts()
  
  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

// ✅ Client Component (isolado)
"use client"
function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked(!like)}>{liked ? '❤️' : '🤍'}</button>
}
```

## Layouts

### Root Layout
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Nested Layouts
```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

## Server Actions

### Action Básica
```typescript
"use server"

import { revalidatePath } from 'next/cache'
import { db } from '@/db'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  
  const post = await db.insert(posts).values({ title }).returning()
  
  revalidatePath('/posts')
  return post
}
```

### Action com Validação
```typescript
"use server"

import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'

const createPostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(10),
})

export const createPost = actionClient
  .schema(createPostSchema)
  .action(async ({ parsedInput }) => {
    const post = await db.insert(posts).values(parsedInput).returning()
    revalidatePath('/posts')
    return post
  })
```

### Uso em Client Component
```typescript
"use client"

import { useTransition } from 'react'
import { createPost } from '@/app/actions/posts'

export function CreatePostForm() {
  const [isPending, startTransition] = useTransition()
  
  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await createPost(formData)
    })
  }
  
  return (
    <form action={handleSubmit}>
      <input name="title" />
      <button disabled={isPending}>Create</button>
    </form>
  )
}
```

## API Routes

### Route Handler Simples
```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/db'

export async function GET() {
  const users = await db.query.users.findMany()
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const body = await request.json()
  const user = await db.insert(users).values(body).returning()
  return NextResponse.json(user, { status: 201 })
}
```

### Route Handler Dinâmico
```typescript
// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await db.query.users.findByPk(id)
  
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  return NextResponse.json(user)
}
```

## Data Fetching

### Fetch com Cache
```typescript
// Cache padrão (force-cache)
async function getPosts() {
  const res = await fetch('https://api.example.com/posts')
  return res.json()
}
```

### Fetch Sem Cache
```typescript
// Sem cache (no-store)
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    cache: 'no-store'
  })
  return res.json()
}
```

### Fetch com Revalidação
```typescript
// Revalidar a cada 60 segundos
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }
  })
  return res.json()
}
```

### Fetch com Revalidação On-Demand
```typescript
// Revalidar quando ocorrer uma tag específica
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }
  })
  return res.json()
}

// Em server action ou route handler
import { revalidateTag } from 'next/cache'

revalidateTag('posts')
```

## Parâmetros de URL

### Route Params
```typescript
// app/posts/[id]/page.tsx
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPost(id)
  
  return <div>{post.title}</div>
}
```

### Search Params
```typescript
// app/search/page.tsx
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const results = await search(q || '')
  
  return <div>{/* ... */}</div>
}
```

## Middleware (Clerk)

```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

## Metadata API

### Estática
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Máquina de Conteúdo',
  description: 'Estúdio de conteúdo alimentado por IA',
}
```

### Dinâmica
```typescript
// app/posts/[id]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)
  
  return {
    title: post.title,
    description: post.excerpt,
  }
}
```

## Loading e Error States

### loading.tsx
```typescript
// app/posts/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
```

### error.tsx
```typescript
// app/posts/error.tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## not-found.tsx
```typescript
// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <h2>Page not found</h2>
      <Link href="/">Return home</Link>
    </div>
  )
}
```
