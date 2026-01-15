# Settings Page Implementation

## Overview

The Settings page (`/settings`) is fully functional with **4 main sections** using a tabbed interface.

> **Janeiro 2026:** A aba "Documentos" foi movida para `/fontes` para melhor UX.

## File Structure

```
src/app/(app)/settings/
├── page.tsx                          # Main page with tabs
├── layout.tsx                        # Settings layout (optional)
└── components/
    └── sections/
        ├── api-keys-section.tsx      # API key management with encryption
        ├── prompts-section.tsx       # System prompt customization
        ├── variables-section.tsx     # User variables for prompt expansion
        ├── models-section.tsx         # Model selection (fallback)
        # └── preferences-section.tsx   # TODO: Future feature
    └── actions/
        └── save-settings.ts          # Server actions for all sections
```

## Tabs Structure

```typescript
const SETTINGS_TABS = [
  { value: "api-keys", label: "API Keys", icon: Key },
  { value: "models", label: "Modelos", icon: Cpu },
  { value: "prompts", label: "Prompts", icon: MessageSquare },
  { value: "variables", label: "Variáveis", icon: Sliders },
]
// NOTA: "Documentos" foi movido para /fontes
```
```

## 1. API Keys Section

### Features
- Add/remove API keys for external services
- Client-side AES-256-GCM encryption
- Real-time validation with debouncing (500ms)
- Services: OpenRouter, Tavily, Firecrawl, Apify

### Encryption Flow
```typescript
// Client: Encrypt before sending
const encrypted = encryptApiKey(apiKey, ENCRYPTION_KEY)

// Server: Store encrypted
await db.insert(apiKeys).values({ encryptedKey: encrypted })

// Server: Decrypt when needed
const decrypted = decryptApiKey(encryptedKey, ENCRYPTION_KEY)
```

### Code Locations
- Encryption: `src/lib/encryption.ts`
- UI: `api-keys-section.tsx`
- Actions: `save-settings.ts` (saveApiKeyAction, deleteApiKeyAction)

## 2. Prompts Section

See: `prompt-system.md` memory for details.

### Features
- View system prompts (read-only)
- Create custom prompts per agent
- Edit/delete custom prompts
- 4-layer architecture visualization

## 3. Variables Section

### Standard Variables (10 total)
```typescript
interface UserVariables {
  tone?: string              // "Profissional e acessível", "Casual e descontraído"
  brandVoice?: string         // "Autêntica e sem filtro", "Jovem e conectada"
  niche?: string              // User's business niche with context
  targetAudience?: string     // Target audience with demographics + psychographics
  audienceFears?: string      // "Envelhecer, perder dinheiro, ficar para trás" (use ethically)
  audienceDesires?: string    // "Se sentir única, pertencer a comunidade exclusiva"
  negativeTerms?: string      // TERMOS PROIBIDOS that AI must NEVER use
  differentiators?: string    // What the brand offers that no one else does
  contentGoals?: string       // "Engajamento e conversão", "Brand awareness e alcance"
  preferredCTAs?: string      // "Compre agora", "Saiba mais", "Garanta seu desconto"
}
```

### Features
- Edit 10 global variables organized in 4 groups:
  - **Identidade da Marca**: tone, brandVoice, niche
  - **Público-Alvo**: targetAudience, audienceFears, audienceDesires
  - **Estratégia de Conteúdo**: differentiators, contentGoals, preferredCTAs
  - **Restrições**: negativeTerms (ethical use warning)
- Progress indicator (filled/total count)
- Example suggestions for each field
- Variables are expanded via AI (Gemini Flash)
- Applied to all agents' prompts
- Used in {{variable}} placeholders

### UI Component
- **Location**: `variables-section.tsx`
- **Features**:
  - Grouped variable cards with icons
  - Warning badges for ethical fields (audienceFears, negativeTerms)
  - Examples toggle button
  - Reset all button
## 4. Models Section (formerly "Documents" - moved to /fontes)

> **NOTA:** O gerenciamento de documentos foi movido para `/fontes`. Veja `sources-page-refactor.md` memory para detalhes.

### Categories
```typescript
const DOCUMENT_CATEGORIES = [
  { value: "general", label: "Geral", icon: "Folder", description: "Documentos gerais sobre o negócio" },
  { value: "products", label: "Catálogo de Produtos", icon: "Package", description: "Lista completa de produtos/serviços" },
  { value: "offers", label: "Ofertas e Promoções", icon: "Tag", description: "Promoções, descontos, lançamentos" },
  { value: "brand", label: "Marca e Identidade", icon: "Palette", description: "Tom de voz, valores, missão, visão" },
  { value: "audience", label: "Público-Alvo", icon: "Users", description: "Personas, pesquisas, dados demográficos" },
  { value: "competitors", label: "Concorrentes", icon: "Target", description: "Análise competitiva" },
  { value: "content", label: "Conteúdo Prévio", icon: "FileText", description: "Posts que funcionaram, calendário anterior" },
]
```

### Features
- Drag & drop file upload
- File type validation (PDF, TXT, MD)
- File size validation (max 10MB)
- Category selection
- Embedding status tracking
- Delete documents

### Database Schema
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT,
  category TEXT DEFAULT 'general',
  embedded BOOLEAN DEFAULT FALSE NOT NULL,
  embedding_model TEXT DEFAULT 'voyage-large-2',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)
```

## 5. Preferences Section

### Features
- Theme selection (dark only for now)
- Notification preferences
- Language selection (pt-BR default)

## Server Actions

All server actions are in `save-settings.ts`:

```typescript
// API Keys
saveApiKeyAction(service: string, apiKey: string)
deleteApiKeyAction(service: string)
validateApiKeyAction(service: string, apiKey: string)

// Prompts
seedSystemPromptsAction()
getSystemPromptsAction()
getUserPromptsAction()
savePromptAction(agent: string, prompt: string)
deletePromptAction(agent: string)

// Variables
saveVariablesAction(variables: Record<string, string>)
getVariablesAction()

// Documents
uploadDocumentAction(metadata: DocumentMetadata)
getDocumentsAction()
deleteDocumentAction(documentId: number)
```

## UI Patterns

### Section Component Pattern
```typescript
export interface XxxSectionProps {
  onChange?: () => void   // Callback when data changes
  className?: string
}

export function XxxSection({ onChange, className }: XxxSectionProps) {
  // Fetch data on mount
  // Render UI
  // Call onChange() after mutations
}
```

### Toast Notifications
All user feedback uses `sonner` toast:
```typescript
import { toast } from "sonner"

toast.success("Documento enviado com sucesso!")
toast.error("Falha ao enviar documento")
```

## Design Tokens

### Colors
- Primary: `hsl(84 76% 55%)` (Lime Green)
- Backgrounds: `#0a0a0f` (primary), `#1a1a2e` (cards)
- Borders: `rgba(255,255,255,0.05)` default, `rgba(255,255,255,0.1)` hover
- Text: White with opacity variants (90, 70, 40, 20)

### Glassmorphism
```css
backdrop-blur-xl bg-white/[0.02] border-white/[0.05]
```

## Page Route

```
/settings              # Default tab: api-keys
/settings?tab=prompts  # Prompts tab
/settings?tab=variables
/settings?tab=documents
/settings?tab=preferences
```

## Related Documentation

- `.context/docs/estruturas-tecnicas/fluxo-prompts-user.md` - Prompt flow details
- `.serena/memories/prompt-system.md` - Prompt system architecture
- `.context/docs/development-plan/page-config.md` - Settings page blueprint
