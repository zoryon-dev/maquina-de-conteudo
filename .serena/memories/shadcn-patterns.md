# shadcn/ui Patterns

Padrões e convenções para usar shadcn/ui no projeto.

## O que é shadcn/ui

Não é uma biblioteca de componentes, mas uma **coleção de componentes reutilizáveis** copiados para o seu projeto. Você tem controle total sobre o código.

## Instalação Inicial

```bash
# Inicializar shadcn/ui
npx shadcn@latest init
```

Isso cria:
- `components.json` - Configuração do projeto
- `src/components/ui/` - Diretório para componentes UI
- `src/lib/utils.ts` - Função `cn()`

## Adicionar Componentes

```bash
# Adicionar um componente
npx shadcn@latest add button

# Adicionar múltiplos
npx shadcn@latest add button card dialog input

# Adicionar com sobrescrita
npx shadcn@latest add button --overwrite
```

## Estrutura de Componente shadcn

Todos os componentes seguem esta estrutura:

```typescript
// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// 1. Variantes CVA
const buttonVariants = cva(
  // Base classes
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// 2. Interface exportada
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

// 3. Componente com forwardRef
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

## Padrão asChild

O `asChild` permite composição usando Radix Slot:

```tsx
// ❌ Cria botão aninhado
<Button asChild>
  <a href="/docs">Documentation</a>
</Button>

// Renderiza como: <a class="button-classes">Documentation</a>

// Uso com Link Next.js
import Link from 'next/link'

<Button asChild>
  <Link href="/dashboard">Dashboard</Link>
</Button>
```

## Componentes Instalados no Projeto

### UI Primitives
- `button` - Botão com variantes
- `input` - Input de texto
- `textarea` - Área de texto
- `label` - Label acessível
- `switch` - Toggle on/off

### Layout
- `card` - Container com header/content/footer
- `separator` - Divisor visual
- `sidebar` - Sidebar colapsável

### Feedback
- `alert` - Mensagens de alerta
- `progress` - Barra de progresso
- `skeleton` - Placeholder de loading
- `sonner` - Toast notifications

### Overlays
- `dialog` - Modal/dialog
- `dropdown-menu` - Menu dropdown
- `menubar` - Menu bar
- `tooltip` - Tooltip informativo
- `sheet` - Drawer lateral

### Seleção
- `radio-group` - Radio buttons
- `native-select` - Select nativo

### Misc
- `badge` - Badge/small tag
- `spinner` - Loading spinner
- `empty` - Estado vazio
- `button-group` - Grupo de botões
- `input-group` - Grupo de inputs
- `tubelight-navbar` - Navbar com efeito glow

## Personalizando Componentes

### Alterar Variantes

```typescript
// Adicionar nova variante
const buttonVariants = cva(baseClasses, {
  variants: {
    variant: {
      // ... existentes
      gradient: "bg-gradient-to-r from-primary to-accent text-white",
    },
  },
})
```

### Criar Componentes Compostos

```typescript
// src/components/ui/form-button.tsx
import { Button, type ButtonProps } from "./button"

export function FormButton({ children, ...props }: ButtonProps) {
  return (
    <Button 
      className="w-full" 
      type="submit"
      {...props}
    >
      {children}
    </Button>
  )
}
```

## components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## Migração de ClassNames

```typescript
// Antes (Tailwind puro)
<div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">

// Depois (usando tokens do design system)
<div className="bg-card text-card-foreground rounded-lg border p-4">
```

## Acessibilidade

Todos os componentes shadcn/ui incluem:

- **ARIA attributes** - Roles e states apropriados
- **Keyboard navigation** - Tab, Enter, Escape, arrows
- **Focus management** - Focus trap em modais
- **Screen reader support** - Labels descritivas

```typescript
// Exemplo de acessibilidade no Button
<button
  disabled={disabled}
  aria-invalid={ariaInvalid}
  // Focus ring visível só por teclado
  className="focus-visible:ring-2"
>
```

## Dark Mode

Os componentes suportam dark mode automaticamente:

```typescript
// As classes são adaptadas via dark:
<div className="bg-background text-foreground border-border">
  {/* Light: bg-white text-gray-900 border-gray-200 */}
  {/* Dark: bg-gray-950 text-gray-50 border-gray-800 */}
</div>
```

## Links Úteis

- Documentação: https://ui.shadcn.com
- Components: https://ui.shadcn.com/docs/components
- Blocks: https://ui.shadcn.com/blocks (templates prontos)
