# Máquina de Conteúdo

## 1. Visão Geral do Projeto

**ContentHub AI** é uma plataforma web para geração de conteúdo para redes sociais através de chat com agentes de IA especializados. O foco inicial é o **Instagram**, permitindo criar posts simples e carrosséis de forma automatizada.

### 1.1 Propósito
- Gerar conteúdo de alta qualidade para Instagram (posts e carrosséis)
- Utilizar sistema RAG (Retrieval-Augmented Generation) para contexto personalizado
- Fornecer agentes especializados para diferentes tarefas (estratégia, calendário, criação)
- Automatizar a publicação via API do Instagram

### 1.2 Stack Tecnológico
| Categoria | Tecnologia |
|-----------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Estilização | Tailwind CSS, CSS Variables (HSL) |
| Componentes | shadcn/ui (Radix primitives) |
| Animações | Framer Motion |
| Roteamento | React Router DOM v6 |
| Estado | React Hooks (useState, useEffect) |
| Notificações | Sonner (toasts) |
| Formulários | React Hook Form + Zod |
| IA | OpenRouter (múltiplos modelos) |

---

## 2. Arquitetura da Aplicação

### 2.1 Estrutura de Rotas

```
/                 → Dashboard (Tela Inicial de Chat)
/chat             → Chat com Histórico de Conversas
/library          → Biblioteca de Conteúdos Gerados
/calendar         → Calendário Editorial
/sources          → Fontes de Conhecimento (RAG)
/settings         → Configurações e API Keys
```

### 2.2 Layout Principal (`AppLayout.tsx`)
- Sidebar lateral retrátil (slide-in/out)
- Botão de menu hamburger fixo no canto superior esquerdo
- Área principal que renderiza as rotas
- Backdrop com blur quando sidebar está aberta em mobile

---

## 3. Sistema de Agentes de IA

A aplicação possui **4 agentes especializados**, cada um com seu próprio system prompt:

| Agente | Handle | Cor | Propósito |
|--------|--------|-----|-----------|
| **Zory** | @zory | Cyan (190°) | Assistente generalista, versátil para qualquer tarefa |
| **Estrategista** | @estrategista | Roxo (262°) | Define posicionamento, tom de voz, público-alvo |
| **Calendário** | @calendario | Azul (199°) | Organiza frequência de posts, calendário editorial |
| **Criador** | @criador | Verde (142°) | Gera posts e carrosséis para Instagram |

### 3.1 Seleção de Agente
O usuário digita `@` no campo de texto para invocar a paleta de comandos e selecionar um agente. Cada agente tem:
- Ícone específico (Bot, Target, Calendar, Sparkles)
- Cor temática
- System prompt personalizado (editável em Configurações)

---

## 4. Telas da Aplicação

### 4.1 Dashboard / Tela Inicial (`Dashboard.tsx` + `AnimatedAIChat.tsx`)

A tela inicial é o ponto de entrada principal, apresentando uma interface de chat centralizada.

**Componentes Visuais:**

1. **ParallaxBackground** - Fundo animado com orbs que respondem ao movimento do mouse
   - 3 orbs com cores diferentes (primary, blue, amber)
   - Efeito parallax sutil baseado na posição do cursor
   - Blur de 96-128px para efeito suave

2. **Título Principal** - "O que você quer criar hoje?"
   - Gradiente de texto (foreground 90% → 40%)
   - Linha animada abaixo do título
   - Subtítulo: "Digite @agente para selecionar ou faça uma pergunta"

3. **Campo de Input com ShineBorder**
   - Borda animada com gradiente multicolorido (#A07CFE, #FE8FB5, #FFBE7B)
   - Textarea auto-expansível (60px → 200px)
   - Backdrop blur no container

4. **Paleta de Comandos** (Command Palette)
   - Aparece ao digitar `@`
   - Mostra os 4 agentes com ícone, label e descrição
   - Navegação por teclado (setas, Tab, Enter, Esc)
   - Animação staggered de entrada

5. **Área de Attachments**
   - Chips mostrando arquivos anexados
   - Botão X para remover cada arquivo
   - Aceita: PDF, DOC, DOCX, TXT, MD

6. **Barra de Ações Inferior:**
   - **Paperclip** - Anexar arquivos
   - **Brain + ChevronDown** - Dropdown de seleção de modelo de IA
   - **FolderOpen** - Abre modal de contexto (RAG)
   - **AnimatedButton "Enviar"** - Envia mensagem com glow animado

7. **Quick Actions** (Cards Rápidos)
   - 3 cards com ações pré-definidas para cada agente
   - Hover com scale e glow
   - Ao clicar, navega para `/chat` com parâmetros

8. **Seleção de Modelo**
   - Chips exibindo modelo selecionado e contextos
   - Modelos disponíveis via OpenRouter:
     - Claude 3.5 Sonnet, Claude 3 Haiku
     - GPT-4 Turbo, GPT-4o
     - Gemini Pro 1.5
     - Llama 3.1 70B

---

### 4.2 Modal de Contexto RAG (`ContextModal.tsx`)

Modal para selecionar fontes de conhecimento que a IA usará como referência.

**Estrutura:**
1. **Header** - "Selecionar Contexto" com ícone FolderOpen
2. **Campo de Busca** - Filtra fontes por título ou conteúdo
3. **Pastas Expansíveis** por tipo:
   - 📄 Documentos
   - 🎥 Vídeos do YouTube
   - 🌐 Páginas Web
4. **Lista de Fontes** dentro de cada pasta:
   - Checkbox de seleção
   - Título da fonte
   - Número de chunks
   - Botão "Eye" para preview
5. **Preview de Chunks** - Mostra excerpts do conteúdo da fonte
6. **Fontes Selecionadas** - Chips com opção de remover
7. **Botões de Ação** - Cancelar | Confirmar (N)

**Animações:**
- Expansão/colapso de pastas com height animado
- Preview de chunks com stagger delay
- Chips com scale ao aparecer/desaparecer

---

### 4.3 Chat com Histórico (`Chat.tsx`)

Interface de chat com sidebar lateral para gestão de conversas.

**Sidebar de Histórico (280px):**
1. **Toggle Button** - PanelLeftClose/PanelLeft para mostrar/esconder
2. **Botão "Nova Conversa"** - AnimatedButton com Plus
3. **Toggle Arquivadas** - Alterna entre conversas ativas e arquivadas
4. **Lista de Pastas** - Uma pasta por agente:
   - Geral (Zory)
   - Estratégia (Estrategista)
   - Calendário (Calendário)
   - Criação (Criador)
5. **Conversas dentro de cada pasta** - Collapsible com chevron

**Gestão de Pastas e Conversas:**
Menu de contexto (`ConversationMenu`) com opções:

Para **Pastas**:
- ✏️ Renomear
- 📥 Arquivar
- 🗑️ Excluir

Para **Conversas**:
- ✏️ Renomear
- 📁 Mover para outra pasta
- 📥 Arquivar
- 📋 Duplicar
- 🗑️ Excluir

**Diálogos Auxiliares:**
- `RenameDialog.tsx` - Modal para renomear
- `MoveDialog.tsx` - Modal para mover entre pastas
- `DeleteConfirmDialog.tsx` - Confirmação de exclusão

**Área de Chat:**
- Header com título da conversa e agente ativo
- Lista de mensagens (user/assistant)
- Typing indicator com animação
- Input de mensagem na parte inferior

---

### 4.4 Biblioteca de Conteúdos (`Library.tsx`)

Gerenciamento de todos os posts e carrosséis gerados.

**Componentes:**
1. **Header** - Título + botão "Novo Conteúdo"
2. **Barra de Busca** - Input com ícone Search
3. **Tabs de Filtro:**
   - Todos
   - Posts
   - Carrosséis
   - Rascunhos
   - Agendados
4. **Grid de Cards** (`StaggeredContainer`) com animação de entrada

**ContentCard:**
- Ícone de tipo (ImageIcon para carrossel, FileText para post)
- Badge de tipo
- Menu dropdown (⋮):
  - 👁️ Visualizar
  - ✏️ Editar
  - 📅 Agendar
  - 🗑️ Excluir
- Título e preview do conteúdo
- Status indicator (dot colorido)
- Ícone do Instagram
- Data de agendamento (se houver)

**Props especiais nos Cards:**
- `hover` - Efeito scale no hover
- `glow` - Sombra luminosa no hover

---

### 4.5 Fontes de Conteúdo / RAG (`Sources.tsx`)

Gerenciamento da base de conhecimento para o sistema RAG.

**Ações Principais:**
1. **Upload de Documento** - Dialog com drag & drop
   - Aceita: PDF, DOC, DOCX, TXT
   - Limite: 10MB
2. **Adicionar URL** - Dialog com input de URL
   - Opções: YouTube ou Página Web

**Tabs de Filtro:**
- Todas
- Documentos
- YouTube
- Páginas Web

**SourceCard:**
- Ícone por tipo (FileText, Youtube, Globe)
- Badge de tipo
- Menu dropdown:
  - 👁️ Visualizar
  - 🔗 Abrir URL
  - 🔄 Reprocessar
  - 🗑️ Excluir
- Título e descrição
- Data de adição

---

### 4.6 Calendário Editorial (`Calendar.tsx`)

Visualização e organização de publicações agendadas.

**Componentes:**
- Lista de eventos com `StaggeredContainer`
- Cards por evento com data, tipo e status

---

### 4.7 Configurações (`Settings.tsx`)

Gerenciamento de preferências e integrações.

**Tabs:**

1. **API Keys** - Chaves de API para integrações:
   | Serviço | Descrição |
   |---------|-----------|
   | OpenRouter | Acesso aos modelos de IA (obrigatório) |
   | Firecrawl | Extração de conteúdo de páginas web |
   | Apify | Extração de transcrições do YouTube |
   | Tavily | Buscas online em tempo real |
   | ScreenshotOne | Conversão HTML → Imagem |
   | Instagram | Publicação automática |

2. **Agentes** - Edição de system prompts
   - Cada agente com seu textarea
   - Botão salvar individual

3. **Aparência**
   - Seleção de tema: Claro | Escuro | Sistema

4. **Notificações**
   - Toggle para publicações agendadas
   - Toggle para publicações com erro
   - Toggle para novos recursos

---

## 5. Sistema de Design

### 5.1 Paleta de Cores (HSL)

**Cores Base:**
```css
--primary: 262 83% 58%        /* Roxo vibrante */
--secondary: 240 5% 15%       /* Cinza escuro */
--background: 240 10% 3.9%    /* Quase preto */
--foreground: 0 0% 98%        /* Branco */
```

**Cores de Status:**
```css
--success: 142 71% 50%        /* Verde */
--warning: 38 92% 55%         /* Laranja */
--info: 199 89% 55%           /* Azul */
--destructive: 0 62.8% 50%    /* Vermelho */
```

**Cores dos Agentes:**
```css
--agent-zory: 190 80% 60%            /* Cyan */
--agent-estrategista: 262 83% 65%    /* Roxo */
--agent-calendario: 199 89% 55%      /* Azul */
--agent-criador: 142 71% 50%         /* Verde */
```

### 5.2 Componentes de UI Personalizados

| Componente | Descrição |
|------------|-----------|
| `ShineBorder` | Borda animada com gradiente |
| `AnimatedButton` | Botão com glow e scale no hover |
| `ParallaxBackground` | Fundo com orbs que respondem ao mouse |
| `StaggeredContainer` | Container com animação staggered para filhos |
| `StaggeredItem` | Item filho com animação de entrada |
| `TypingIndicator` | Indicador de digitação (3 dots animados) |
| `ContextModal` | Modal de seleção de contexto RAG |

### 5.3 Animações Globais

```css
animate-fade-in: opacity 0→1, translateY 10px→0
animate-scale-in: scale 0.95→1, opacity 0→1
animate-slide-in-right: translateX 100%→0
animate-enter: fade-in + scale-in combinados
```

### 5.4 Efeitos Visuais

- **Glass Effect**: `bg-card/50 backdrop-blur-xl border border-border/50`
- **Glow Effect**: `box-shadow: 0 0 40px -10px hsl(var(--primary) / 0.5)`
- **Gradient Primary**: `linear-gradient(135deg, primary, purple)`

---

## 6. Integrações Planejadas

| Serviço | Propósito |
|---------|-----------|
| **OpenRouter** | Gateway para múltiplos LLMs (Claude, GPT, Gemini, Llama) |
| **Firecrawl** | Web scraping para extrair conteúdo de páginas |
| **Apify** | Extração de transcrições do YouTube |
| **Tavily** | Busca online em tempo real para pesquisas |
| **ScreenshotOne** | Conversão de templates HTML/CSS em imagens PNG |
| **Instagram API** | Publicação automática de posts e carrosséis |

---

## 7. Fluxo de Uso Principal

```
1. Usuário acessa Dashboard
        ↓
2. Digita @agente para selecionar especialista
        ↓
3. Seleciona modelo de IA (OpenRouter)
        ↓
4. Opcionalmente adiciona contexto (RAG)
        ↓
5. Descreve o conteúdo desejado
        ↓
6. Clica "Enviar" → Navega para /chat
        ↓
7. IA gera resposta usando contexto selecionado
        ↓
8. Conteúdo é salvo na Biblioteca
        ↓
9. Usuário pode agendar ou publicar diretamente
```

---

## 8. Estrutura de Dados

### Interfaces TypeScript:

```typescript
interface Agent {
  id: string;
  name: string;
  handle: string;        // @estrategista
  description: string;
  icon: string;          // Nome do ícone Lucide
  color: string;         // agent-estrategista
  systemPrompt: string;
}

interface Conversation {
  id: string;
  title: string;
  agentId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  timestamp: Date;
}

interface ChatFolder {
  id: string;
  name: string;
  agentId: string;
  icon: string;
  conversations: Conversation[];
}

interface Content {
  id: string;
  title: string;
  type: 'post' | 'carousel';
  status: 'draft' | 'scheduled' | 'published';
  platform: 'instagram';
  content: string;
  images: string[];
  scheduledAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
}

interface Source {
  id: string;
  title: string;
  type: 'document' | 'youtube' | 'webpage';
  url?: string;
  content: string;
  chunks?: number;
  previewChunks?: SourceChunk[];
  createdAt: Date;
}

interface SourceChunk {
  id: string;
  text: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}
```

---

## 9. Próximos Passos Sugeridos

1. **Backend/Supabase**: Configurar banco de dados e autenticação
2. **Integração OpenRouter**: Implementar chamadas reais à API
3. **Sistema RAG**: Implementar chunking, embeddings e busca semântica
4. **Geração de Imagens**: Integrar ScreenshotOne para converter templates em imagens
5. **API Instagram**: Implementar publicação automática
6. **Persistência Local**: Salvar conversas e preferências em localStorage/IndexedDB

---

Este documento serve como referência completa do estado atual da aplicação ContentHub AI e pode ser usado para onboarding de novos desenvolvedores ou para retomar o desenvolvimento em sessões futuras.
