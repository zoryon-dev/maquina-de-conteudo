# Autenticação - Guia de Desenvolvimento

## Configuração do Clerk

Este projeto usa [Clerk](https://clerk.com/) para autenticação.

### Variáveis de Ambiente

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
CLERK_WEBHOOK_SECRET=whsec_
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

## Criando Usuários de Teste

### Opção 1: Via Clerk Dashboard

1. Acesse [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecione sua aplicação
3. Vá em "Users" → "Create user"
4. Preencha o email e senha
5. O usuário será criado imediatamente e pode ser usado para login

### Opção 2: Via Interface de Sign-up

1. Execute `npm run dev`
2. Acesse `http://localhost:3000`
3. Clique em "Criar Conta"
4. Preencha com qualquer email (ex: `test@example.com`)
5. Crie uma senha
6. O usuário será criado automaticamente

### Opção 3: OAuth (Google/GitHub)

Para testar OAuth em desenvolvimento:

1. Configure os callbacks OAuth no Clerk Dashboard:
   - Adicione `http://localhost:3000` aos Authorized URLs
   - Configure as credenciais do Google Console/GitHub OAuth App

2. Na tela de login, clique em "Continuar com Google" ou "GitHub"

## Rotas Protegidas

As seguintes rotas requerem autenticação:

- `/dashboard` - Chat com IA
- `/library` - Biblioteca de conteúdo
- `/calendar` - Calendário de posts
- `/sources` - Fontes de conteúdo
- `/settings` - Configurações

Usuários não autenticados são redirecionados para `/sign-in`.

## Proxy (Middleware)

O arquivo `src/proxy.ts` gerencia a proteção de rotas:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
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
```

## Webhook do Clerk

Para sincronização de dados do usuário:

```bash
# Em desenvolvimento, use ngrok
ngrok http 3000

# Configure no Clerk Dashboard:
# https://seu-ngrok-url.ngrok-free.app/api/webhooks/clerk
```

## Componentes de Autenticação

- `src/components/auth/auth-layout.tsx` - Layout para páginas de auth
- `src/components/auth/sign-in-card.tsx` - Card de login
- `src/components/auth/sign-up-card.tsx` - Card de cadastro
- `src/components/auth/oauth-buttons.tsx` - Botões OAuth
- `src/components/auth/user-menu.tsx` - Menu de usuário autenticado
- `src/components/auth/dev-help.tsx` - Ajuda em desenvolvimento

## Cores do Design System

Os componentes de auth usam as cores do tema Lime Green:

- `bg-primary` / `text-primary` - Lime Green `hsl(84 76% 55%)`
- `bg-white/5` + `border-white/10` - Glassmorphism effect
- `bg-[#0a0a0f]` - Fundo escuro principal
