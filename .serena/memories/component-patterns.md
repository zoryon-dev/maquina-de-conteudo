# Component Patterns

Visão geral dos padrões de componentes React usados no projeto Máquina de Conteúdo.

## Padrão Base de Componentes UI

Os componentes seguem uma estrutura consistente baseada em Radix UI + CVA (Class Variance Authority):

```typescript
// Estrutura padrão de componente
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 1. Definir variantes usando CVA
const componentVariants = cva(
  // Classes base aplicadas sempre
  "inline-flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border bg-background",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-10 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// 2. Interface do componente estende VariantProps
export interface ComponentProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof componentVariants> {
  asChild?: boolean
}

// 3. Componente com forwardRef para refs
const Component = React.forwardRef<HTMLButtonElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(componentVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Component.displayName = "Component"

export { Component }
```

## Padrões de Composição

### Card Pattern
Componentes card são compostos de subcomponentes:

```typescript
// Subcomponentes usando função
const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5", className)} {...props} />
)

// Exportação composta
Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter
```

### Sidebar Pattern
Componentes complexos usam Context para estado compartilhado:

```typescript
const SidebarContext = React.createContext<SidebarContextValue | null>(null)

const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange: setOpen,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = controlledOpen ? setOpen : setUncontrolledOpen
  
  return (
    <SidebarContext.Provider value={{ open, setOpen, state }}>
      {children}
    </SidebarContext.Provider>
  )
}
```

## Classes Utilitárias Comuns

| Classe | Uso |
|--------|-----|
| `gap-2` | Espaçamento entre elementos |
| `shrink-0` | Previne shrink em flex containers |
| `transition-all` | Animação suave em todas propriedades |
| `focus-visible:ring-[3px]` | Ring de foco acessível |
| `disabled:opacity-50` | Estado desabilitado visual |
| `[&_svg]:pointer-events-none` | SVG sem eventos de pointer |
| `has-[>svg]:px-3` | Padding condicional se tiver SVG |

## Padrões de Refs

Sempre usar `React.forwardRef` para componentes que podem receber refs:

```typescript
const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("base-classes", className)} {...props} />
  }
)
Component.displayName = "Component"
```

## Padrões de Acessibilidade

- `aria-invalid`: Para estados de erro
- `focus-visible`: Para foco apenas por teclado
- `role`: Atributos de role quando necessário
- `aria-label`: Labels descritivas para ícones
