# Insight: Visual Fixes no Wizard - Janeiro 2026

**Data:** Janeiro 2026
**Contexto:** Refatoração visual do Wizard de Criação
**Impacto:** Melhoria significativa da UX e acessibilidade

## Visão Geral

Durante a análise do fluxo completo do Wizard de Criação, identificamos e corrigimos problemas visuais críticos que afetavam a usabilidade. Este insight documenta o aprendizado e padrões derivados dessa experiência.

## Problemas Identificados

### 1. Inputs Invisíveis em Gradient Backgrounds

**O Problema:**
Componentes de formulário shadcn/ui (`Input`, `Textarea`) usam tokens CSS do Tailwind v4 (`border-input`, `text-foreground`, `placeholder:text-muted-foreground`) que só resolvem quando a classe `.dark` está presente no elemento pai.

**Por que aconteceu:**
- O Wizard usa gradient background customizado `from-[#0a0a0f] to-[#1a1a2e]`
- O layout não adiciona `.dark` no elemento (por design)
- Tokens do Tailwind v4 dependem da presença da classe `.dark` para resolver

**Solução Aplicada:**
```tsx
// Padrão reutilizável para inputs em gradient backgrounds
className="!border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50"
```

**Learning:**
> Sempre que usar gradient backgrounds customizados em dark mode, verifique se os componentes de formulário estão visíveis. Tokens CSS do Tailwind v4 requerem `.dark` class para resolver.

### 2. Footer com `sticky` Criava Problema Visual

**O Problema:**
```tsx
// Antes - Footer "grudado" no fundo da viewport
<div className="pt-6 border-t border-white/10 sticky bottom-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent pb-safe">
```

**Por que era problemático:**
- Botão sempre visível mesmo com muito conteúdo
- Gradient overlay criava artefatos visuais
- `pb-safe` (iOS safe area) desnecessário em desktop

**Solução Aplicada:**
```tsx
// Depois - Footer natural com padding adequado
<div className="pt-8 border-t border-white/10">
```

**Learning:**
> `position: sticky` deve ser usado com moderação em formulários. O comportamento natural de scroll é geralmente preferível para UX.

## Padrões Estabelecidos

### Pattern 1: Explicit Dark Mode Styles

Para componentes em gradient backgrounds sem `.dark` class:

```tsx
// Input
!border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50

// Textarea (adicionar resize-none se necessário)
resize-none !border-white/10 !bg-white/[0.02] !text-white !placeholder:text-white/40 focus-visible:!border-primary/50

// Select trigger
!border-white/10 !bg-white/[0.02] !text-white
```

### Pattern 2: Collapsible Sections para Forms

O componente `CollapsibleSection` criado para o Wizard oferece:

- Header clicável com ícone e descrição
- Animação suave de expandir/colapsar (Framer Motion)
- Espaçamento consistente (`p-4` para header, `p-4` para conteúdo)
- Borda sutil (`border-white/10`)

**Uso recomendado para:**
- Formulários longos com múltiplas seções
- Configurações opcionais
- Agrupamento lógico de campos relacionados

### Pattern 3: Grid 2-Colunas para Forms

Layout em grid melhora utilização de espaço em telas largas:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* Coluna esquerda */}
  <div className="space-y-4">...</div>

  {/* Coluna direita */}
  <div className="space-y-4">...</div>
</div>
```

**Benefícios:**
- Melhor uso de espaço horizontal
- Permite mais conteúdo "above the fold"
- Mantém responsividade (collapse para 1 coluna em mobile)

## Checklist para Visual QA

Ao criar novos componentes para gradient backgrounds:

- [ ] Bordas visíveis em todos os inputs
- [ ] Texto digitável visível
- [ ] Placeholders visíveis
- [ ] Focus states funcionais
- [ ] Contraste adequado (WCAG AA mínimo)
- [ ] Estados hover/active definidos
- [ ] Footer não usa `sticky` desnecessariamente
- [ ] Espaçamento consistente (`gap-4` para seções, `p-4` para containers)

## Arquivos Modificados

| Arquivo | Modificação | Linhas |
|---------|-------------|--------|
| `step-1-inputs.tsx` | Dark mode overrides em inputs | ~9 componentes |
| `step-1-inputs.tsx` | Footer spacing fix | 1 linha |
| `step-3-narratives.tsx` | Dark mode override em textarea | 1 componente |
| `step-2-processing.tsx` | Removed unused imports | 2 linhas |

## Próximos Passos

1. **Considerar variantes de componentes:** Criar `InputDarkGradient`, `TextareaDarkGradient` se o padrão se repetir
2. **Design tokens:** Avaliar migrar para design tokens explícitos ao invés de depender de `.dark` class
3. **Testes visuais:** Adicionar screenshot tests para evitar regressões

## Referências

- Erro documentado: `known-and-corrected-errors/030-tailwind-tokens-gradient-background.md`
- Padrões: `CLAUDE.md` - Design System
- Componente: `src/components/ui/collapsible.tsx`
