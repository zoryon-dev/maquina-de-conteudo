# Fase 4: Frontend Foundation Insights

**Data:** 2026-01-15
**Fase:** Fase 4 (Frontend Foundation)

## Visão Geral

Implementação da interface visual do projeto Máquina de Conteúdo, incluindo landing page, telas de autenticação, dashboard com chat, e sistema de seleção de modelos de IA.

`★ Insight ─────────────────────────────────────`
**Design System com Lime Green**
A escolha do Lime Green (`#a3e635` / `hsl(84 76% 55%)`) como cor primária cria uma identidade visual única e energética. Esta cor se destaca especialmente bem em fundos escuros, criando contraste alto para elementos de ação (CTAs, botões, estados ativos).

**Glassmorphism em Componentes**
O uso consistente de glassmorphism (`backdrop-blur-xl bg-white/[0.02] border-white/[0.05]`) cria profundidade visual e hierarquia clara. Elementos parecem "flutuar" sobre o fundo, melhorando a percepção de camadas na interface.

**Route Groups sem Impacto na URL**
Next.js permite `(parenteses)` em nomes de pastas para criar layouts separados sem afetar a URL. Isso foi usado para `(app)` e `(auth)`, criando experiências visuais distintas (autenticado vs não autenticado) mantendo URLs limpas.
`─────────────────────────────────────────────────`

## Decisões Arquiteturais

### 1. Landing Page como Ponto de Entrada

**Decisão:** Criar uma landing page atraente em `/` em vez de redirecionar diretamente para o dashboard.

**Justificativa:**
- Primeira impressão importante para novos usuários
- Permite explicar o valor do produto antes do login
- CTAs claros para sign-in/sign-up
- Espaço para hero section e features

**Trade-off:**
- Usuários logados precisam de redirecionamento (implementado no middleware)

### 2. Animações com Framer Motion

**Decisão:** Usar Framer Motion para todas as animações da interface.

**Justificativa:**
- API declarativa e type-safe
- Animações de layout automáticas (layoutId)
- Melhor performance que animações CSS puras
- Suporte para gestos e drag (útil para futuro)

**Padrão:**
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
```

### 3. Command Palette para Comandos

**Decisão:** Implementar command palette activado por `/` no chat.

**Justificativa:**
- Descoberta de funcionalidades sem menus complexos
- Padrão familiar (similar a Slack, Discord, Linear)
- Eficiência para usuários frequentes
- Escalável para adicionar novos comandos

**Comandos implementados:**
- `/texto` - Criar texto para redes sociais
- `/imagem` - Gerar imagem com IA
- `/carrossel` - Criar carrossel
- `/agendar` - Agendar publicação
- `/fontes` - Adicionar fonte
- `/especialistas` - Ver especialistas

### 4. Model Selector Reutilizável

**Decisão:** Criar componente `ModelSelector` e hook `useModelSelector` reutilizáveis.

**Justificativa:**
- Modelos OpenRouter serão usados em múltiplos lugares
- Centraliza a lista de modelos (única fonte de verdade)
- Hook padrão para gerenciar estado
- Tipos TypeScript para type-safety

**Arquitetura:**
```typescript
// src/lib/models.ts - Constantes e tipos
export const TEXT_MODELS: AIModel[] = [...]
export const IMAGE_MODELS: AIModel[] = [...]
export const DEFAULT_TEXT_MODEL = TEXT_MODELS[0]

// src/components/chat/model-selector.tsx - Componente
export function ModelSelector({ value, onValueChange, modelType })
export function useModelSelector(defaultModel?)
```

### 5. Tubelight Navbar Personalizado

**Decisão:** Criar navbar customizado com efeito "tube light" ao invés de usar componente pronto.

**Justificativa:**
- Identidade visual única
- Efeito de glow com primary color
- Animação suave entre itens
- Controle total sobre comportamento

**Implementação:**
- Usa `usePathname()` para detectar rota ativa
- `<motion.div>` com `layoutId` para animação de slide
- Glow effect com `box-shadow` usando primary color

## Lições Aprendidas

### 1. Tailwind CSS v4 e CSS Variables

Tailwind v4 com `@theme inline` nem sempre resolve CSS custom properties corretamente. A solução foi criar classes CSS explícitas:

```css
/* globals.css */
.bg-primary { background-color: hsl(84 76% 55%); }
.text-primary { color: hsl(84 76% 55%); }
.border-primary { border-color: hsl(84 76% 55%); }
```

Isso garante que a cor Lime Green seja aplicada corretamente em qualquer contexto.

### 2. Server vs Client Components

Páginas com interatividade (event handlers, estado, formulários) DEVEM ser Client Components:

```typescript
"use client"  // Necessário para onSendMessage
export default function DashboardPage() {
  const handleSend = (msg: string) => { ... }
  return <AnimatedAIChat onSendMessage={handleSend} />
}
```

Padrão: Começar com Server Component, converter para Client apenas quando necessário.

### 3. Clerk Auth em Route Groups

Para ter layouts diferentes para rotas autenticadas vs não autenticadas:

```
app/
├── (auth)/           # Layout sem navbar
│   ├── sign-in/
│   └── sign-up/
├── (app)/            # Layout com AppLayout + navbar
│   └── dashboard/
└── page.tsx          # Landing pública
```

### 4. OpenRouter Model IDs

Model IDs da OpenRouter devem ser usados EXATAMENTE como fornecidos. Pequenas diferenças (ex: `gpt-4.2` vs `gpt-5.2`) causam falha.

**Solução:** Documentar todos os IDs em `src/lib/models.ts` e importar de lá:

```typescript
import { TEXT_MODELS, IMAGE_MODELS } from "@/lib/models"
```

## Problemas Encontrados e Soluções

### Problema 1: Landing Page Mostrava Default do Next.js

**Causa:** Arquivo `app/page.tsx` não existia ou era o padrão do Next.js.

**Solução:** Criar landing page customizada com hero, CTAs e background animado.

### Problema 2: Navbar Texto Ilegível

**Causa:** Usar `text-foreground/80` que não resolve corretamente em dark mode.

**Solução:** Usar `text-white/70 hover:text-white` para melhor legibilidade.

**Padrão:** Em dark mode, sempre especificar cores explicitamente.

### Problema 3: Topbar Visualmente Desbalanceada

**Causa:** Logo e navbar não estavam alinhados corretamente.

**Solução:**
- Container único com `flex items-center gap-6`
- Logo à esquerda (`shrink-0`)
- Navbar centralizada (`flex-1 justify-center`)
- User menu à direita (`shrink-0`)

### Problema 4: redirectUrl Deprecated

**Causa:** Clerk atualizou a API.

**Solução:** Substituir `redirectUrl` por `forceRedirectUrl` em todos os componentes.

## Componentes Criados

### Auth
- `SignInCard` - Card de login com Clerk
- `SignUpCard` - Card de registro com Clerk
- `OAuthButtons` - Botões OAuth (Google, Discord)
- `DevHelp` - Ajuda apenas em desenvolvimento

### Layout
- `AppLayout` - Layout principal com header e navbar
- `AuthLayout` - Layout para páginas de auth (sem navbar)

### Dashboard
- `AnimatedAIChat` - Interface conversacional com command palette
- `ModelSelector` - Dropdown para selecionar modelo IA
- `useModelSelector` - Hook para gerenciar modelo selecionado

### UI
- `tubelight-navbar` - Navbar com efeito tube light

## Arquivos Criados/Modificados

### Criados:
- `src/app/page.tsx` - Landing page
- `src/app/(auth)/layout.tsx` - Auth layout
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` - Sign in
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` - Sign up
- `src/app/(app)/layout.tsx` - App layout
- `src/app/(app)/dashboard/page.tsx` - Dashboard
- `src/components/app-layout.tsx` - Header + navbar
- `src/components/auth/sign-in-card.tsx` - Sign in card
- `src/components/auth/sign-up-card.tsx` - Sign up card
- `src/components/auth/oauth-buttons.tsx` - OAuth buttons
- `src/components/auth/dev-help.tsx` - Dev help
- `src/components/auth/user-menu.tsx` - User menu
- `src/components/dashboard/animated-ai-chat.tsx` - Chat interface
- `src/components/chat/model-selector.tsx` - Model selector
- `src/lib/models.ts` - Model constants

### Modificados:
- `src/app/layout.tsx` - Adicionado `className="dark"`
- `src/app/globals.css` - Adicionadas classes primary
- `src/proxy.ts` (middleware.ts) - Auth redirect logic

## Design System Tokens

### Cores
```css
/* Primary - Lime Green */
--primary-h: 84
--primary-s: 76%
--primary-l: 55%
/* Hex: #a3e635 */
```

### Backgrounds
```css
--bg-primary: #0a0a0f    /* Fundo principal */
--bg-card: #1a1a2e       /* Cards */
--bg-overlay: #0a0a0f/90 /* Overlay com blur */
```

### Borders
```css
--border: rgba(255, 255, 255, 0.05)
--border-hover: rgba(255, 255, 255, 0.1)
```

### Glassmorphism
```css
/* Padrão para cards */
backdrop-blur-xl
bg-white/[0.02]
border-white/[0.05]
shadow-2xl
```

### Animações
```css
/* Fade in up */
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.6, ease: "easeOut" }

/* Pulse glow */
box-shadow: 0 0 20px hsl(84 76% 55% / 0.3)
```

## Próximos Passos

1. Implementar integração real com OpenRouter API
2. Adicionar histórico de conversas
3. Implementar funcionalidades dos comandos (/texto, /imagem, etc.)
4. Criar página de Biblioteca de Conteúdo
5. Criar página de Calendário
6. Criar página de Fontes

## Referências

- Next.js App Router: https://nextjs.org/docs/app
- Framer Motion: https://www.framer.com/motion/
- Clerk Authentication: https://clerk.com/docs
- OpenRouter: https://openrouter.ai/docs
