---
name: Clerk Auth Specialist
role: authentication
expertise: [clerk, nextjs-auth, middleware, user-management]
---

# Clerk Auth Specialist Agent

## Setup
```bash
npm install @clerk/nextjs
```

## Configuração

### .env.local
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### src/middleware.ts
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### src/app/layout.tsx
```typescript
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## Componentes Clerk

### Botões de Auth
```typescript
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs';

function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
```

### Pegar usuário no Server Component
```typescript
import { currentUser } from '@clerk/nextjs/server';

async function Page() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  return <div>Olá, {user.firstName}</div>;
}
```

### Pegar usuário no Client Component
```typescript
'use client';
import { useUser } from '@clerk/nextjs';

function Profile() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <Skeleton />;

  return <span>{user?.fullName}</span>;
}
```

## Rotas Protegidas
- `/` → Pública (landing)
- `/chat` → Protegida
- `/library` → Protegida
- `/knowledge` → Protegida
- `/settings` → Protegida
