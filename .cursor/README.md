# Documentação Cursor - Máquina de Conteúdo

Esta pasta contém documentação específica para o Cursor IDE, organizada em regras e padrões do projeto.

## Estrutura

```
.cursor/
├── README.md                    # Este arquivo
└── rules/                       # Regras do projeto
    ├── project-overview.mdc    # Visão geral do projeto
    ├── architecture.mdc        # Arquitetura e padrões
    ├── components.mdc          # Padrões de componentes
    ├── database.mdc            # Padrões de banco de dados
    ├── api-routes.mdc          # Padrões de API routes
    ├── queue-system.mdc        # Sistema de filas
    └── styling.mdc            # Padrões de estilização
```

## Como Usar

As regras em `.cursor/rules/` são automaticamente aplicadas pelo Cursor quando você trabalha no projeto. Elas fornecem:

- **Contexto do projeto**: Tech stack, estrutura, funcionalidades
- **Padrões de código**: Convenções, boas práticas, exemplos
- **Arquitetura**: Como o código está organizado
- **Guias de implementação**: Como implementar features específicas

## Regras Disponíveis

### project-overview.mdc
Visão geral completa do projeto:
- Tech stack
- Estrutura de diretórios
- Funcionalidades principais
- Variáveis de ambiente
- Comandos úteis

### architecture.mdc
Arquitetura detalhada:
- Padrão arquitetural (Next.js App Router)
- Estrutura de rotas
- Middleware e autenticação
- Banco de dados (schema, queries)
- Sistema de filas
- Componentes e state management

### components.mdc
Padrões de componentes React:
- Server vs Client Components
- Estrutura de componentes
- Componentes específicos (AppLayout, Auth, UI)
- Props e TypeScript
- Performance

### database.mdc
Padrões de banco de dados:
- Schema (8 tabelas)
- Queries com Drizzle ORM
- Migrations
- Performance e segurança

### api-routes.mdc
Padrões de API Routes:
- Autenticação
- Validação de input
- Respostas e status codes
- Error handling
- Webhooks

### queue-system.mdc
Sistema de filas:
- Arquitetura serverless
- Tipos de jobs
- Fluxo de processamento
- Handlers e retry logic

### styling.mdc
Padrões de estilização:
- Design system
- Tailwind CSS
- Componentes shadcn/ui
- Animações
- Responsividade

## Convenções

### Formato dos Arquivos
- Extensão: `.mdc` (Markdown Cursor)
- Frontmatter com metadados:
  ```markdown
  ---
  description: Descrição da regra
  globs: padrão de arquivos
  alwaysApply: true/false
  ---
  ```

### Atualização
As regras devem ser atualizadas quando:
- Novos padrões são estabelecidos
- Arquitetura muda significativamente
- Novas tecnologias são adicionadas
- Convenções são refinadas

## Referências Externas

Para documentação mais detalhada, consulte:
- `.context/docs/` - Documentação geral do projeto
- `CLAUDE.md` - Documentação principal
- `README.md` - Guia de início rápido
