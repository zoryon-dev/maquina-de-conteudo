# Máquina de Conteúdo

Estúdio de conteúdo alimentado por IA para criar, editar e gerenciar posts para redes sociais.

## Funcionalidades

- 🤖 **Chat com IA** - Interface conversacional para criar conteúdo
- 📚 **Biblioteca de Conteúdo** - Textos, imagens e carrosséis
- 📖 **Base de Conhecimento** - Upload de documentos para consulta contextual
- 🔐 **Autenticação** - Login seguro com Clerk
- 🎨 **Design Moderno** - Interface com glassmorphism e dark theme

## Tech Stack

- [Next.js 15](https://nextjs.org/) - App Router
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Clerk](https://clerk.com/) - Autenticação
- [Neon](https://neon.tech/) - PostgreSQL serverless
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe queries
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [OpenRouter](https://openrouter.ai/) - LLM API
- [Tavily](https://tavily.com/) - Search API
- [Firecrawl](https://www.firecrawl.dev/) - Web scraping

## Começando

### Pré-requisitos

- Node.js 18+
- Conta no [Neon](https://neon.tech/)
- Conta no [Clerk](https://clerk.com/)
- API Keys: OpenRouter, Tavily, Firecrawl

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd maquina-de-conteudo

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# Rode as migrations
npx drizzle-kit migrate

# Inicie o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Linter
npx drizzle-kit studio   # UI do banco de dados
```

## Estrutura do Projeto

```
├── .context/          # Documentação e agentes especialistas
├── .claude/           # Skills do Claude Code
├── src/
│   ├── app/          # Rotas Next.js (App Router)
│   ├── components/   # Componentes React
│   ├── db/           # Schema e conexões do DB
│   ├── lib/          # Utilitários e configs
│   └── stores/       # Zustand stores
├── drizzle/          # Migrations
└── public/           # Arquivos estáticos
```

## Documentação

- [CLAUDE.md](./CLAUDE.md) - Documentação principal do projeto
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guia de contribuição
- [.context/docs/architecture.md](./.context/docs/architecture.md) - Arquitetura detalhada

## Licença

MIT
