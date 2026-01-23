# Trending Discovery Feature

Feature de descoberta de temas trending para criar conteúdo relevante baseado em tópicos em alta nas redes sociais.

## 📋 Índice

- [Overview](#overview)
- [Arquitetura](#arquitetura)
- [Serviços](#serviços)
- [API Routes](#api-routes)
- [Frontend](#frontend)
- [Database](#database)
- [Configuração](#configuração)
- [Fluxo de Uso](#fluxo-de-uso)

## Overview

O sistema **Trending Discovery** permite descobrir temas em alta no YouTube, Instagram e Google Search, enriquecê-los com briefings gerados por IA, e salvar para criação de conteúdo futuro.

### Funcionalidades

- Busca trending topics por palavra-chave
- Integração com YouTube Data API v3
- Integração com Instagram via Apify (FREE)
- Integração com Google Search via Apify (FREE)
- Briefings gerados por Gemini Flash via OpenRouter
- Ranking semântico com Voyage AI embeddings
- Biblioteca de temas salvos
- Criação direta de Wizard a partir de temas

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  /discover  │────▶│  /api/discovery│────▶│  YouTube    │
│   (UI)      │     │     (route)    │     │   Service   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                     │                    │
       │                     ▼                    ▼
       │              ┌──────────────┐     ┌─────────────┐
       └─────────────▶│  /api/themes  │◀────│ Instagram   │
                      │    (CRUD)     │     │   Service   │
                      └──────────────┘     └─────────────┘
                               │                    │
                               ▼                    ▼
                        ┌──────────────┐     ┌─────────────┐
                        │   Database    │◀────│  Google     │
                        │   (themes)    │     │   Service   │
                        └──────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Similarity  │
                        │   Service    │
                        └──────────────┘
```

## Serviços

### Discovery Services (`src/lib/discovery-services/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | Tipos centrais (`TrendingTopic`, `TrendingTopicWithBriefing`, etc.) |
| `youtube/youtube-discovery.service.ts` | Integração YouTube Data API v3 |
| `instagram/search-scraper.service.ts` | Apify Instagram Hashtag Search (FREE) |
| `instagram/instagram-discovery.service.ts` | Instagram Discovery Service (usa apenas search-scraper) |
| `google/google-serp.service.ts` | Apify Google Search SERP (FREE) |
| `google/google-discovery.service.ts` | Google Discovery Service (usa google-search-scraper) |
| `briefing.service.ts` | Vercel AI SDK + Gemini Flash |
| `discovery.service.ts` | Orquestrador principal |
| `similarity.service.ts` | Voyage AI embeddings e ranking |

### Padrão ServiceResult

Todos os serviços retornam `ServiceResult<T>`:

```typescript
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

Permite error handling type-safe sem lançar exceções.

## API Routes

### POST `/api/discovery`

Busca trending topics por palavra-chave.

**Request:**
```json
{
  "keyword": "marketing digital",
  "platforms": ["youtube", "instagram", "google"],
  "maxResults": 10
}
```

**Response:**
```json
{
  "topics": [
    {
      "id": "yt-123",
      "title": "Como fazer marketing digital",
      "theme": "marketing digital",
      "source": { "type": "youtube", "url": "...", "rawData": {} },
      "metrics": { "engagementScore": 85000, "views": 100000 },
      "briefing": "...",
      "keyPoints": ["...", "..."],
      "suggestedAngles": ["...", "..."]
    }
  ]
}
```

### GET `/api/themes`

Lista temas salvos com filtros opcionais.

**Query Params:**
- `status`: `active` | `draft` | `archived`
- `search`: string para busca textual

### POST `/api/themes`

Salva um novo tema.

**Request:**
```json
{
  "title": "Como fazer marketing digital",
  "theme": "marketing digital",
  "context": "...",
  "targetAudience": "...",
  "briefing": "...",
  "keyPoints": ["...", "..."],
  "angles": ["...", "..."],
  "sourceType": "youtube",
  "sourceUrl": "...",
  "engagementScore": 85000
}
```

### GET/PATCH/DELETE `/api/themes/:id`

Operações CRUD em tema específico.

### POST `/api/themes/:id/wizard`

Cria um Wizard a partir de um tema salvo.

**Response:**
```json
{
  "wizardId": 123
}
```

## Frontend

### Página Discovery (`/discover`)

**Arquivos:**
- `src/app/(app)/discover/page.tsx` - Server Component
- `src/app/(app)/discover/components/discover-page.tsx` - Client Component

**Componentes:**
- `FilterBar` - Busca e toggle de plataformas
- `DiscoveryResults` - Lista de resultados
- `TopicCard` - Card individual com ações

### Página Themes (`/themes`)

**Arquivos:**
- `src/app/(app)/themes/page.tsx` - Server Component
- `src/app/(app)/themes/components/themes-page.tsx` - Client Component

**Componentes:**
- `FilterBar` - Busca e filtro de status
- `ThemeCard` - Card de tema salvo
- `EmptyState` - Estado vazio
- `DeleteConfirmDialog` - Confirmação de exclusão

## Database

### Tabela `themes`

```sql
CREATE TABLE themes (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  context TEXT,
  target_audience TEXT,
  briefing TEXT,
  key_points JSONB,
  angles JSONB,
  source_type theme_source_type NOT NULL DEFAULT 'manual',
  source_url TEXT,
  source_data JSONB,
  engagement_score INTEGER,
  trending_at TIMESTAMP,
  category TEXT,
  tags JSONB,
  status theme_status DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX themes_user_id_idx ON themes(user_id);
CREATE INDEX themes_status_idx ON themes(status);
CREATE INDEX themes_created_at_idx ON themes(created_at);
CREATE INDEX themes_trending_at_idx ON themes(trending_at);
CREATE INDEX themes_deleted_at_idx ON themes(deleted_at);
```

### Tabela `theme_tags`

Junção many-to-many entre themes e tags.

```sql
CREATE TABLE theme_tags (
  theme_id INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, tag_id)
);
```

### Enums

```sql
CREATE TYPE theme_source_type AS ENUM (
  'manual', 'youtube', 'instagram', 'tiktok', 'aggregated'
);

CREATE TYPE theme_status AS ENUM (
  'draft', 'active', 'archived'
);
```

## Configuração

### Variáveis de Ambiente

```env
# YouTube Data API v3
YOUTUBE_DATA_API_KEY=AIzaSy...
# ou
GOOGLE_API_KEY=AIzaSy...

# Apify (Instagram)
APIFY_API_TOKEN=apify_...
# ou
APIFY_API_KEY=apify_...

# OpenRouter (para briefings)
OPENROUTER_API_KEY=sk-or-...

# Voyage AI (embeddings semânticas)
VOYAGE_API_KEY=voyage-...
```

### Funcionamento Independente

Cada plataforma funciona de forma independente:

- **YouTube apenas**: Configure `YOUTUBE_DATA_API_KEY` ou `GOOGLE_API_KEY`
- **Instagram apenas**: Configure `APIFY_API_TOKEN` ou `APIFY_API_KEY`
- **Ambos**: Configure todas as variáveis acima

O sistema usa "graceful degradation" - se uma API não estiver configurada, a busca continua funcionando apenas com as APIs disponíveis.

### Graceful Degradation

Os serviços verificam presença de API keys e retornam arrays vazios se não configurados:

```typescript
// YouTube
if (!this.apiKey) {
  return { success: true, data: [] }
}

// Instagram (apenas search-scraper gratuito)
if (!this.client) {
  return { success: true, data: [] }
}

// Briefing
if (!this.model) {
  return topics.map(t => ({ ...t, briefing: '', keyPoints: [], suggestedAngles: [] }))
}
```

## Fluxo de Uso

### 1. Descobrir Temas

```
Usuário acessa /discover
→ Digita palavra-chave
→ Seleciona plataformas (YouTube/Instagram)
→ Clica em "Buscar"
→ Sistema busca nas APIs
→ Resultados são enriquecidos com IA
→ Exibe cards com briefing, pontos-chave e ângulos
```

### 2. Salvar Tema

```
Usuário clica "Salvar" em um resultado
→ POST /api/themes
→ Tema salvo na biblioteca
→ Toast de sucesso
```

### 3. Criar Wizard

```
Usuário clica "Criar no Wizard"
→ POST /api/themes (primeiro salva)
→ POST /api/themes/:id/wizard (depois cria wizard)
→ Redireciona para /wizard?edit=ID
```

### 4. Gerenciar Biblioteca

```
Usuário acessa /themes
→ Lista todos os temas salvos
→ Filtra por status ou busca textual
→ Ações: Editar, Excluir, Criar Wizard
```

## Server Actions

`src/actions/themes-actions.ts`

| Action | Descrição |
|--------|-----------|
| `getThemesAction(filters)` | Lista temas com filtros |
| `getThemeAction(id)` | Busca tema específico |
| `createThemeAction(data)` | Cria novo tema |
| `createThemesFromDiscoveryAction(topics)` | Cria múltiplos temas |
| `updateThemeAction(data)` | Atualiza tema |
| `updateThemeStatusAction(id, status)` | Atualiza status |
| `deleteThemeAction(id)` | Soft delete |
| `getThemeCategoriesAction()` | Lista categorias |
| `getThemeStatsAction()` | Estatísticas |

## Navegação

A feature está integrada no menu principal:

```
Descoberta ▼
├── Discovery (/discover)
└── Temas (/themes)
```
