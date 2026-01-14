# Tailwind CSS Patterns

Padrões e convenções de Tailwind CSS usados no projeto.

## Helper `cn()` - Merge de Classes

Função central para combinar classes condicionalmente:

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Uso:**
```typescript
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  "additional-classes",
  className
)} />
```

**Benefícios:**
- `clsx`: Condicionais limpas (`&&`, arrays, objetos)
- `twMerge`: Remove classes duplicadas (última vence)
- `ClassValue`: Aceita string, array, objeto, undefined

## Padrões de Layout

### Flexbox
```typescript
// Center + Gap
"flex items-center justify-center gap-2"

// Coluna com espaçamento
"flex flex-col gap-4"

// Space between
"flex items-center justify-between"
```

### Grid
```typescript
// Grid responsivo
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"

// Auto-fit
"grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
```

### Container
```typescript
// Container centralizado
"container mx-auto max-w-7xl px-4"

// Full width com padding
"w-full px-4 py-8"
```

## Padrões Visuais

### Glassmorphism
```typescript
"bg-white/10 backdrop-blur-md border border-white/10 rounded-xl"
```

### Cards
```typescript
"bg-card text-card-foreground rounded-lg border shadow-sm"
```

### Hover Effects
```typescript
// Subtle lift
"transition-all hover:scale-[1.02] hover:shadow-lg"

// Background fade
"hover:bg-accent/50 transition-colors"

// Icon color
"group-hover:text-primary transition-colors"
```

### Focus States
```typescript
// Ring acessível
"outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Border change
"focus:border-primary transition-colors"
```

## Padrões de Tipografia

```typescript
// Títulos
"text-2xl font-bold tracking-tight"

// Lead text
"text-xl text-muted-foreground"

// Body
"text-sm text-foreground"

// Muted
"text-sm text-muted-foreground"

// Code
"font-mono text-xs bg-muted px-1.5 py-0.5 rounded"
```

## Padrões de Espaçamento

```typescript
// Padding scale
p-1 p-2 p-3 p-4 p-6 p-8
px-4 py-2

// Margin scale
m-4 mx-auto my-2

// Gap em flex/grid
gap-1 gap-2 gap-4 gap-6 gap-8
```

## Modificadores de Estado

```typescript
// Hover
hover:bg-primary

// Focus (mouse + keyboard)
focus:ring-2

// Focus-visible (só teclado)
focus-visible:ring-2

// Active
active:scale-95

// Disabled
disabled:opacity-50 disabled:pointer-events-none

// Group (para elementos filhos)
group hover:group-hover:text-primary
```

## Responsive Prefixes

```typescript
"base md:responsive lg:more-responsive"

// Exemplo real:
"w-full md:w-1/2 lg:w-1/3"
"text-sm md:text-base lg:text-lg"
"flex-col md:flex-row"
```

## Dark Mode

```typescript
// Prefício dark:
"bg-white dark:bg-gray-900"
"text-gray-900 dark:text-gray-100"

// Exemplo completo:
"bg-card text-card-foreground border dark:border-gray-800"
```

## Padrões de Animação

```typescript
// Fade in
"animate-in fade-in duration-200"

// Slide in
"animate-in slide-in-from-top duration-300"

// Scale
"animate-in zoom-in duration-200"

// Custom (com tw-animate-css)
"animate-custom-bounce"
```

## Tamanhos de Componentes

```typescript
// Sm
"h-8 px-3 text-sm"

// Default (md)
"h-9 px-4 text-sm"

// Lg  
"h-10 px-6 text-base"

// Icon button
"size-9"
```

## Padrões de Border Radius

```typescript
"rounded-sm"    // 2px
"rounded"       // 4px (padrão)
"rounded-md"    // 6px
"rounded-lg"    // 8px
"rounded-xl"    // 12px
"rounded-2xl"   // 16px
"rounded-3xl"   // 24px
"rounded-full"  // 9999px (pílula/círculo)
```

## Utility-First Examples

```typescript
// Badge
"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"

// Skeleton loading
"animate-pulse rounded-md bg-muted h-4 w-full"

// Separator
"h-px w-full bg-border"

// Kbd (keyboard key)
"inline-flex items-center rounded border bg-muted px-2 py-1 text-xs font-mono"
```
