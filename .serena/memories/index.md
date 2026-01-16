# Documentation Index

Índice de toda documentação de padrões e símbolos do projeto Máquina de Conteúdo.

## Memórias Disponíveis

### Fundamentos
- **[project-structure](serena:read?memory=project-structure.md)** - Estrutura completa de diretórios e arquivos
- **[design-system-tokens](serena:read?memory=design-system-tokens.md)** - Tokens de design (cores, tipografia, espaçamento)

### Frontend
- **[frontend-structure](serena:read?memory=frontend-structure.md)** - Estrutura de componentes e layouts (Fase 4) ⭐
- **[settings-page](serena:read?memory=settings-page.md)** - Página de configurações completa ⭐

### Features
- **[calendar-patterns](serena:read?memory=calendar-patterns.md)** - Calendário editorial ⭐
- **[library-patterns](serena:read?memory=library-patterns.md)** - Biblioteca de conteúdo ⭐
- **[sources-page-refactor](serena:read?memory=sources-page-refactor.md)** - Página de fontes com RAG

### Backend & Features
- **[prompt-system](serena:read?memory=prompt-system.md)** - Sistema de prompts em 4 camadas ⭐

### Padrões de Código
- **[component-patterns](serena:read?memory=component-patterns.md)** - Padrões de componentes React e Radix UI
- **[tailwind-patterns](serena:read?memory=tailwind-patterns.md)** - Padrões e convenções de Tailwind CSS
- **[typescript-patterns](serena:read?memory=typescript-patterns.md)** - Padrões TypeScript e tipos genéricos
- **[react-hooks-patterns](serena:read?memory=react-hooks-patterns.md)** - Hooks customizados e padrões React
- **[zustand-patterns](serena:read?memory=zustand-patterns.md)** - State management com Zustand
- **[nextjs-patterns](serena:read?memory=nextjs-patterns.md)** - Padrões Next.js App Router
- **[shadcn-patterns](serena:read?memory=shadcn-patterns.md)** - Padrões shadcn/ui
- **[form-validation-patterns](serena:read?memory=form-validation-patterns.md)** - Validação de formulários
- **[queue-patterns](serena:read?memory=queue-patterns.md)** - Sistema de filas com Upstash Redis ⭐
- **[database-patterns](serena:read?memory=database-patterns.md)** - Banco de dados com Drizzle ORM ⭐
- **[auth-patterns](serena:read?memory=auth-patterns.md)** - Autenticação com Clerk ⭐
- **[calendar-patterns](serena:read?memory=calendar-patterns.md)** - Calendário editorial ⭐
- **[library-patterns](serena:read?memory=library-patterns.md)** - Biblioteca de conteúdo ⭐

## Stack Tecnológica

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| Framework | Next.js | 16.1.1 |
| React | React | 19.2.3 |
| TypeScript | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | Radix UI | - |
| Class Utilities | class-variance-authority | 0.7.x |
| Autenticação | Clerk | 6.x |
| Database | Neon (PostgreSQL) | - |
| ORM | Drizzle ORM | 0.45.x |
| State Management | Zustand | 5.x |

## Dependências Principais

### UI & Styling
- `tailwindcss` - Framework CSS utility-first
- `tw-animate-css` - Animações para Tailwind v4
- `class-variance-authority` - Variantes de componentes
- `clsx` - Classes condicionais
- `tailwind-merge` - Merge inteligente de classes

### Radix UI Primitives
- `@radix-ui/react-dialog` - Dialog/Modal
- `@radix-ui/react-dropdown-menu` - Dropdown menu
- `@radix-ui/react-label` - Label acessível
- `@radix-ui/react-menubar` - Menu bar
- `@radix-ui/react-progress` - Progress bar
- `@radix-ui/react-radio-group` - Radio buttons
- `@radix-ui/react-separator` - Separador visual
- `@radix-ui/react-slot` - Slot para composição
- `@radix-ui/react-switch` - Toggle switch
- `@radix-ui/react-tooltip` - Tooltip

### Animação & UX
- `framer-motion` - Animações declarativas
- `gsap` - Animações high-performance
- `three` - Renderização 3D
- `next-themes` - Theme switching
- `sonner` - Toast notifications

### Backend & Database
- `@clerk/nextjs` - Autenticação
- `@neondatabase/serverless` - Client PostgreSQL serverless
- `drizzle-orm` - ORM type-safe

### Utilitários
- `lucide-react` - Ícones
- `react-markdown` - Renderização Markdown
- `zustand` - State management

## Comandos Úteis

### Desenvolvimento
```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Build para produção
npm run start    # Servidor produção
npm run lint     # Linter ESLint
```

### Database (adicionar ao package.json)
```bash
npm run db:generate  # Gera migration
npm run db:migrate   # Executa migration
npm run db:push      # Push schema (sem migration)
npm run db:studio    # Interface visual Drizzle
```

## Convenções de Nome

| Tipo | Formato | Exemplo |
|------|---------|---------|
| Componentes | PascalCase | `UserProfile.tsx` |
| Hooks | usePascalCase | `useAuth.ts` |
| Utilitários | kebab-case | `format-date.ts` |
| Types | PascalCase | `UserTypes.ts` |
| Constantes | UPPER_SNAKE_CASE | `API_BASE_URL` |

## Design Tokens

### Cores Primárias
- **Primary**: Lime Green (`#a3e635` / `84 76% 55%`)
- **Background**: Light `#fafafa` / Dark `#0a0a0a`
- **Border**: Light `#e0e0e0` / Dark `rgba(255,255,255,0.1)`

### Border Radius
- Base: `12px` (`0.75rem`)
- Scale: sm, md, lg, xl, 2xl, 3xl, 4xl

### Tipografia
- Sans: Inter
- Mono: Geist Mono

## Agentes Especialistas

O projeto possui agentes especialistas disponíveis em `.context/agents/`:

- `nextjs-specialist.md` - Next.js e App Router
- `neon-database-specialist.md` - Neon e Drizzle ORM
- `clerk-auth-specialist.md` - Autenticação Clerk

## Como Consultar a Documentação

No Claude Code, use o comando Serena para ler memórias específicas:

```
Use a memória de padrões de componentes para criar um novo botão
```

Ou consulte diretamente arquivos:
- `CLAUDE.md` - Instruções do projeto
- `.context/docs/architecture.md` - Arquitetura
- `.context/docs/development-workflow.md` - Workflow de desenvolvimento
