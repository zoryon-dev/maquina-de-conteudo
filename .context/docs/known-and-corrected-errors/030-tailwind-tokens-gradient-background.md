# Tailwind Tokens Invisíveis em Gradient Backgrounds

**Data Identificação:** Janeiro 2026
**Status:** ✅ Corrigido
**Severidade:** Alta (quebra de UX)
**Componentes Afetados:** Wizard de Criação (`/wizard`)

## Desblema

Componentes shadcn/ui (`Input`, `Textarea`, etc.) ficam com bordas e textos invisíveis quando usados em páginas com gradient background sem a classe `.dark` no elemento pai.

## Sintomas

- Bordas dos inputs invisíveis (`border-input` não resolve)
- Texto dos inputs invisível (`text-foreground` não resolve)
- Placeholder invisível (`placeholder:text-muted-foreground` não resolve)
- Inputs parecem "desaparecidos" na interface

## Causa Raiz

O projeto usa **Tailwind CSS v4** com tokens CSS que só resolvem quando a classe `.dark` está presente no elemento pai:

```css
/* src/app/globals.css */
.dark {
  --background: 0 0% 10%;
  --foreground: 0 0% 100%;
  --input: 0 0% 25%;      /* ← Só funciona com .dark */
  --border: 0 0% 20%;     /* ← Só funciona com .dark */
}
```

O componente `Input` do shadcn/ui usa esses tokens:

```tsx
// src/components/ui/input.tsx
className={cn(
  "border-input h-9 w-full ... placeholder:text-muted-foreground",
  // ↑ Tokens não resolvem sem .dark
  className
)}
```

Quando a página usa um gradient customizado (`from-[#0a0a0f] to-[#1a1a2e]`) sem a classe `.dark`, os tokens não são aplicados.

## Solução

Usar cores explícitas com prefixo `!` (important) para sobrescrever os tokens:

```tsx
// ✅ CORRETO - Cores explícitas para dark mode
<Input
  className="h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
/>
```

### Padrão Reutilizável

Para inputs em gradient backgrounds dark mode, use este padrão:

```
!border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50
```

### Componentes Afetados

| Componente | Padrão de Corrigir |
|------------|-------------------|
| `Input` | Adicionar classes explícitas |
| `Textarea` | Adicionar classes explícitas |
| `Select` | Usar `!border-white/10 !bg-white/[0.02] !text-white` no trigger |
| Outros form components | Aplicar padrão similar |

## Exemplo Antes/Depois

### Antes (Quebrado)
```tsx
<div className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e]">
  <Input
    type="url"
    placeholder="https://exemplo.com"
    className="h-11"
  />
</div>
```
**Resultado:** Input invisível (sem borda, sem texto)

### Depois (Corrigido)
```tsx
<div className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e]">
  <Input
    type="url"
    placeholder="https://exemplo.com"
    className="h-11 !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
  />
</div>
```
**Resultado:** Input visível com borda, texto e placeholder

## Onde Foi Aplicado

- `src/app/(app)/wizard/components/steps/step-1-inputs.tsx` (7 Input + 2 Textarea)
- `src/app/(app)/wizard/components/steps/step-3-narratives.tsx` (1 Textarea)

## Notas Importantes

1. **Não adicione `.dark` globalmente** - Isso quebraria outras partes do app que usam tokens corretamente
2. **Prefira correções locais** - Aplique as classes explícitas apenas onde necessário
3. **Considere criar variantes** - Se o padrão se repetir muito, crie variantes dos componentes:
   ```tsx
   // Exemplo: InputDarkGradient
   export function InputDarkGradient({ className, ...props }) {
     return (
       <Input
         className={cn(
           "!border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50",
           className
         )}
         {...props}
       />
     )
   }
   ```

## Referências

- Issue: Visual bugs no Wizard de Criação
- Arquivo: `src/app/(app)/wizard/components/steps/step-1-inputs.tsx:302`
- Documentação relacionada: `CLAUDE.md` - Design System > Cores
