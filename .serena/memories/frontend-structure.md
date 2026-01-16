# Frontend Structure - Fase 4

Estrutura de componentes e layouts implementados na Fase 4 do Máquina de Conteúdo.

## Route Groups

O projeto usa route groups do Next.js para organizar layouts diferentes sem afetar as URLs:

```
src/app/
├── (auth)/              # Grupo auth - layout simples
│   ├── layout.tsx       # AuthLayout (sem navbar)
│   ├── sign-in/
│   │   └── [[...sign-in]]/page.tsx
│   └── sign-up/
│       └── [[...sign-up]]/page.tsx
│
├── (app)/               # Grupo app - layout completo
│   ├── layout.tsx       # AppLayout (com navbar)
│   └── dashboard/
│       └── page.tsx
│
├── layout.tsx           # Root layout (ClerkProvider)
└── page.tsx             # Landing page pública
```

`★ Insight ─────────────────────────────────────`
**Route Groups com Parênteses**
Os parênteses `(auth)` e `(app)` criam grupos lógicos que **não aparecem na URL**. Isso permite layouts diferentes para `/dashboard` e `/sign-in` sem criar URLs feias como `/app/dashboard`.

**Dynamic Routes com Colchetes Triplos**
`[[...sign-in]]` é uma catch-all route opcional do Clerk. Os três colchetes significam que a rota pode incluir segmentos adicionais OU nenhum segmento, permitindo URLs como `/sign-in`, `/sign-in/factor`, e apenas `/`.
`─────────────────────────────────────────────────`

## Layouts

### Root Layout (`app/layout.tsx`)
- **Responsabilidade:** Envolver app com `ClerkProvider` e configurar dark mode
- **Classes críticas:** `className="dark"` no `<html>` e `bg-[#0a0a0f]` no `<body>`

### AuthLayout (`app/(auth)/layout.tsx`)
- **Responsabilidade:** Layout para páginas não autenticadas
- **Características:** Fundo escuro, sem navbar, centralizado
- **Componentes:** Usa `AuthBackground` para efeitos visuais

### AppLayout (`components/app-layout.tsx`)
- **Responsabilidade:** Layout principal para rotas autenticadas
- **Estrutura:**
  - Header fixo com logo, navbar e user menu
  - Main content com padding top (espaço para header)
- **Classes principais:**
  - Header: `border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl`
  - Container: `max-w-6xl mx-auto`

## Componentes de Autenticação

### SignInCard (`components/auth/sign-in-card.tsx`)
- **Props:** `redirectUrl?: string`
- **Integração:** `<SignIn>` do Clerk
- **Importante:** Usar `forceRedirectUrl` (não `redirectUrl` depreciado)

### SignUpCard (`components/auth/sign-up-card.tsx`)
- **Props:** `redirectUrl?: string`
- **Integração:** `<SignUp>` do Clerk

### OAuthButtons (`components/auth/oauth-buttons.tsx`)
- **Providers:** Google, Discord
- **Nota:** Ícones de marcas usam SVG inline (Lucide removeu ícones de marcas)

### DevHelp (`components/auth/dev-help.tsx`)
- **Visibilidade:** Apenas em development (`process.env.NODE_ENV !== "production"`)
- **Propósito:** Mostrar informações úteis para testes

### UserMenu (`components/auth/user-menu.tsx`)
- **Responsabilidade:** Menu de usuário no header
- **Componente:** Usa `UserButton` do Clerk

## Componentes do Dashboard

### AnimatedAIChat (`components/dashboard/animated-ai-chat.tsx`)

Interface conversacional com command palette.

**Props:**
```typescript
interface AnimatedAIChatProps {
  onSendMessage?: (message: string, model?: string) => void
}
```

**Features:**
- Textarea auto-resize (mínimo 60px, máximo 200px)
- Command palette activada por `/`
- Sugestões rápidas (botões abaixo do chat)
- Model selector integrado
- Animações com Framer Motion
- Mouse glow effect

**Comandos disponíveis:**
| Prefix | Label | Descrição |
|--------|-------|-----------|
| `/texto` | Novo Texto | Criar texto para redes sociais |
| `/imagem` | Gerar Imagem | Criar imagem com IA |
| `/carrossel` | Carrossel | Criar carrossel para post |
| `/agendar` | Agendar | Agendar publicação |
| `/fontes` | Fontes | Adicionar fonte de conteúdo |
| `/especialistas` | Especialistas | Ver especialistas disponíveis |

**Hooks customizados:**
```typescript
const { textareaRef, adjustHeight } = useAutoResizeTextarea({
  minHeight: 60,
  maxHeight: 200,
})
```

## Model Selector

### Componente (`components/chat/model-selector.tsx`)

**Props:**
```typescript
interface ModelSelectorProps {
  value?: string
  onValueChange?: (modelId: string) => void
  modelType?: "text" | "image" | "both"
  className?: string
}
```

**Features:**
- Usa shadcn `DropdownMenu` (composição original)
- Organiza modelos por tipo (texto/imagem)
- Indica modelo selecionado com `✓`
- Sem ícones dentro do dropdown

### Hook (`components/chat/model-selector.tsx`)

```typescript
const { selectedModel, setSelectedModel, modelInfo, isTextModel, isImageModel }
  = useModelSelector(defaultModel)
```

### Constantes (`lib/models.ts`)

```typescript
// Modelos de texto
export const TEXT_MODELS: AIModel[] = [
  { id: "openai/gpt-5.2", name: "GPT 5.2", type: "text", provider: "openai" },
  { id: "openai/gpt-5.1", name: "GPT 5.1", type: "text", provider: "openai" },
  { id: "openai/gpt-5.2-chat", name: "GPT 5.2 Chat", type: "text", provider: "openai" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview", type: "text", provider: "google" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview", type: "text", provider: "google" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "text", provider: "anthropic" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", type: "text", provider: "anthropic" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", type: "text", provider: "anthropic" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", type: "text", provider: "x-ai" },
  { id: "x-ai/grok-4-fast", name: "Grok 4 Fast", type: "text", provider: "x-ai" },
]

// Modelos de imagem
export const IMAGE_MODELS: AIModel[] = [
  { id: "openai/gpt-5-image", name: "GPT 5 Image", type: "image", provider: "openai" },
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image Preview", type: "image", provider: "google" },
  { id: "black-forest-labs/flux.2-pro", name: "Flux 2 Pro", type: "image", provider: "black-forest-labs" },
  { id: "black-forest-labs/flux.2-flex", name: "Flux 2 Flex", type: "image", provider: "black-forest-labs" },
  { id: "sourceful/riverflow-v2-max-preview", name: "Riverflow V2 Max Preview", type: "image", provider: "sourceful" },
  { id: "black-forest-labs/flux.2-max", name: "Flux 2 Max", type: "image", provider: "black-forest-labs" },
  { id: "bytedance-seed/seedream-4.5", name: "Seedream 4.5", type: "image", provider: "bytedance-seed" },
]

// Defaults
export const DEFAULT_TEXT_MODEL = TEXT_MODELS[0]
export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0]
```

`★ Insight ─────────────────────────────────────`
**Centralizar Model IDs é Crítico**
OpenRouter exige IDs **exatos**. `gpt-5.2` é diferente de `gpt-4.2`. Ao documentar em `src/lib/models.ts`, criamos uma única fonte de verdade que evita erros de digitação e facilita atualizações quando novos modelos surgirem.
`─────────────────────────────────────────────────`

## UI Components

### Tubelight Navbar (`components/ui/tubelight-navbar.tsx`)

Navbar customizada com efeito de "tube light" no item ativo.

**Props:**
```typescript
interface NavBarProps {
  items: NavItem[]
  defaultActive?: string
  className?: string
}

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}
```

**Features:**
- Detecção automática de rota ativa via `usePathname()`
- Animação de slide com `layoutId` do Framer Motion
- Glow effect com primary color
- Classes: `text-white/70 hover:text-white hover:bg-white/5`

## Padrões Visuais

### Glassmorphism
```typescript
// Padrão para cards
className="backdrop-blur-xl bg-white/[0.02] border-white/[0.05] shadow-2xl rounded-2xl"

// Para overlays
className="backdrop-blur-md bg-black/50"
```

### Botões com Primary Color
```typescript
// Primário (ativo)
className="bg-primary text-[#0a0a0f] shadow-lg shadow-primary/20"

// Secundário (inativo)
className="bg-white/[0.05] text-white/40"

// Hover
className="hover:bg-primary/90"
```

### Bordas
```typescript
// Padrão
border border-white/[0.05]

// Hover
hover:border-white/10

// Divisores
border-t border-white/[0.05]
```

### Animações com Framer Motion
```typescript
// Fade in up
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>

// Scale on tap
whileTap={{ scale: 0.98 }}

// Layout animation (para elementos que mudam de posição)
<motion.div layoutId="active-indicator" />

// Stagger children
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: i * 0.1 }}
  />
))}
```

## Cores - Implementação Prática

Devido a problemas com Tailwind v4 `@theme inline`, usamos classes CSS explícitas em `globals.css`:

```css
/* PRIMARY COLOR - Lime Green (#a3e635 = hsl(84 76% 55%)) */
.bg-primary { background-color: hsl(84 76% 55%); }
.text-primary { color: hsl(84 76% 55%); }
.border-primary { border-color: hsl(84 76% 55%); }

/* Primary com opacidade */
.bg-primary\/10 { background-color: hsl(84 76% 55% / 0.1); }
.bg-primary\/20 { background-color: hsl(84 76% 55% / 0.2); }
.bg-primary\/30 { background-color: hsl(84 76% 55% / 0.3); }

/* Shadow com primary */
.shadow-primary\/20 { box-shadow: 0 10px 15px -3px hsl(84 76% 55% / 0.2); }
```

## Dark Mode

O projeto é **sempre dark mode**. Classes importantes:

```typescript
// Fundo principal
bg-[#0a0a0f]  // ou bg-black

// Texto
text-white       // 100% opacidade
text-white/90    // 90% opacidade
text-white/70    // 70% opacidade (placeholder, labels)
text-white/40    // 40% opacidade (desabilitado)
text-white/20    // 20% opacidade (placeholder fraco)

// NUNCA usar tokens como text-foreground em dark mode
// ❌ text-foreground/80
// ✅ text-white/80
```

## Middleware (`proxy.ts`)

Antes `middleware.ts`, renomeado para `proxy.ts` (Next.js 16+):

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Rotas protegidas
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/library(.*)',
  '/calendar(.*)',
  '/sources(.*)',
  '/settings(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Redirect para dashboard se logado acessar /
  if (request.nextUrl.pathname === '/' && (await auth()).userId) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return Response.redirect(url)
  }

  // Proteger rotas
  if (isProtectedRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```
