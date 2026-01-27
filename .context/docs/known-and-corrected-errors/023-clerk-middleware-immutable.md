# TypeError: immutable - Clerk Middleware

**Data:** 2026-01-16
**Erro:** Runtime TypeError no middleware do Clerk

---

## Sintoma

```bash
⨯ TypeError: immutable
    at appendHeader
    at _Headers.append
    at clerkMiddleware.ts (255:33)
```

Ocorre ao acessar qualquer rota da aplicação, inclusive `/`.

---

## Causa Raiz

O `clerkMiddleware` **deve sempre retornar uma Response**. Quando o middleware não retorna nada explicitamente, o Clerk tenta manipular headers de `undefined`, causando o erro de imutabilidade.

```typescript
// ❌ ERRADO - Não retorna nada no caso base
export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname === "/" && (await auth()).userId) {
    return Response.redirect(url);
  }
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
  // Faltou: return NextResponse.next()
});
```

---

## Solução

Sempre retornar `NextResponse.next()` no final do middleware:

```typescript
// ✅ CORRETO
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname === "/" && (await auth()).userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next(); // ← SEMPRE RETORNAR ALGO
});
```

**Nota:** Também usar `NextResponse.redirect()` ao invés de `Response.redirect()` para consistência.

---

## Arquivo Afetado
- `src/proxy.ts` (antigo `src/middleware.ts`)

---

## Referências
- Clerk Next.js Quickstart: https://context7.com/clerk/clerk-nextjs-app-quickstart
