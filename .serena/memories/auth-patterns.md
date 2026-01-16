# Auth Patterns

Padrões de autenticação com Clerk para Next.js App Router.

## Configuração Básica

### Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # Para svix webhooks
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Webhook com Localhost

Para desenvolvimento, Clerk não consegue enviar webhooks para `localhost`. Use ngrok:

```bash
# 1. Instalar ngrok
brew install ngrok

# 2. Expor localhost
ngrok http 3000

# 3. Configurar webhook no Clerk Dashboard
# URL: https://abc123.ngrok-free.app/api/webhooks/clerk
```

## Middleware (Proteção de Rotas)

### Arquivo: src/middleware.ts

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/library(.*)",
  "/calendar(.*)",
  "/sources(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**⚠️ Importante**: Next.js 16+ mostra aviso sobre `middleware.ts` → usar `proxy.ts` futuramente.

## Layout com ClerkProvider

### Arquivo: src/app/layout.tsx

```typescript
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## Páginas de Autenticação

### Sign-in Personalizado

```typescript
// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass card">
        <SignIn
          appearance={{
            elements: {
              card: "shadow-none bg-transparent border-0 p-0",
              formButtonPrimary: {
                backgroundColor: "hsl(var(--primary))",
              },
            },
          }}
          signUpUrl="/sign-up"
          redirectUrl="/chat"
        />
      </div>
    </div>
  );
}
```

### Sign-up Personalizado

```typescript
// src/app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass card">
        <SignUp
          signInUrl="/sign-in"
          redirectUrl="/chat"
        />
      </div>
    </div>
  );
}
```

## Webhook de Sincronização

### Arquivo: src/app/api/webhooks/clerk/route.ts

```typescript
import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";

// Verificar assinatura Svix
async function verifySignature(payload: string, signature: string) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  const webhookSecret = secret?.startsWith("whsec_")
    ? secret
    : `whsec_${secret}`;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  return signature === expectedSignature;
}

export async function POST(request: Request) {
  const headersList = await headers();
  const svixSignature = headersList.get("svix-signature");
  const payload = await request.text();
  const body = JSON.parse(payload);

  // Verificar assinatura
  const signatureParts = svixSignature.split(",");
  const signature = signatureParts[1]?.split("=")[1];

  const isValid = await verifySignature(payload, signature || "");
  if (!isValid) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }

  // Processar eventos
  switch (body.type) {
    case "user.created":
      await handleUserCreated(body.data);
      break;
    case "user.updated":
      await handleUserUpdated(body.data);
      break;
    case "user.deleted":
      await handleUserDeleted(body.data);
      break;
  }

  return NextResponse.json({ success: true });
}

async function handleUserCreated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url } = data;

  const primaryEmail = email_addresses.find(
    (e: any) => e.id === data.primary_email_address_id
  );

  await db.insert(users).values({
    id,
    email: primaryEmail?.email_address || "",
    name: [first_name, last_name].filter(Boolean).join(" ") || null,
    avatarUrl: image_url || null,
  });
}

async function handleUserDeleted(data: any) {
  // Soft delete
  await db.update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, data.id));
}
```

## Usando Auth em API Routes

```typescript
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Buscar dados do usuário
  const user = await db.query.users.findByPk(userId);

  return NextResponse.json(user);
}
```

## Usando Auth em Server Components

```typescript
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getCurrentUser(userId);

  return <div>Welcome, {user.name}!</div>;
}
```

## Usando Auth em Client Components

```typescript
"use client";

import { useUser } from "@clerk/nextjs";

export function UserProfile() {
  const { user, isSignedIn } = useUser();

  if (!isSignedIn) {
    return <SignInButton />;
  }

  return (
    <div>
      <p>Hello, {user.firstName}!</p>
      <SignOutButton />
    </div>
  );
}
```

## Componentes Clerk Úteis

```typescript
import {
  SignInButton,
  SignUpButton,
  SignOutButton,
  UserButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
```

## Padrão de Menu de Usuário

```typescript
"use client";

import { UserButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";

export function UserMenu() {
  const { userId } = useAuth();

  if (!userId) return null;

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "w-10 h-10",
        },
      }}
      afterSignOutUrl="/"
    />
  );
}
```

## Rotas vs Autenticação

| Tipo | Rotas |
|------|-------|
| **Públicas** | `/`, `/sign-in`, `/sign-up`, `/api/webhooks` |
| **Protegidas** | `/chat`, `/library`, `/calendar`, `/sources`, `/settings` |
| **API Protegidas** | `/api/jobs`, `/api/workers`, `/api/*` |
