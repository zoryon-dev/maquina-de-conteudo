---
name: API Integration Specialist
role: backend-integration
expertise: [rest-api, openrouter, tavily, firecrawl, apify]
---

# API Integration Specialist Agent

## Responsabilidades
- Implementar chamadas a APIs externas
- Gerenciar API keys de forma segura
- Tratar erros e retries
- Estruturar responses consistentes

## APIs do Projeto

### OpenRouter (LLM)
```typescript
// lib/api/openrouter.ts
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

export async function chat(messages: Message[], model = 'anthropic/claude-3.5-sonnet') {
  const response = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) throw new APIError('OpenRouter', response.status);
  return response.json();
}
```

### Tavily (Search)
```typescript
// lib/api/tavily.ts
const TAVILY_API = 'https://api.tavily.com/search';

export async function search(query: string) {
  const response = await fetch(TAVILY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
    }),
  });
  return response.json();
}
```

### Firecrawl (Scraping)
```typescript
// lib/api/firecrawl.ts
export async function scrape(url: string) {
  const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  return response.json();
}
```

## Padrões Obrigatórios

### Estrutura de Response
```typescript
type APIResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};
```

### Tratamento de Erros
```typescript
export class APIError extends Error {
  constructor(public service: string, public status: number) {
    super(`${service} error: ${status}`);
  }
}
```

### Variáveis de Ambiente
```env
OPENROUTER_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
FIRECRAWL_API_KEY=fc-...
APIFY_API_KEY=apify-...
```
