# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Synthesizer v3.1**: Intermediate LLM processing for structured research (throughlines, tensions, frameworks)
- **Image Generation System**: Dual-method image generation (AI via OpenRouter + HTML Templates via ScreenshotOne)
- `wizard_image_gen` job type for generating images for wizard slides
- Step 5 - Image Generation UI component with AI/HTML template options
- SynthesisSummary component: displays structured research from Synthesizer
- ImageGenerationOptions component: visual mode and template selection
- 18 HTML templates for image generation (gradients, typography, patterns, styles, themes)
- 4 AI image models support (Gemini 3 Pro Image, GPT-5 Image, Seedream 4.5, Flux 2 Max)
- Prompts v4.1 for Carousel, v2.0 for Image Post, v2.0 for Video Script
- `triggerWorker()` helper function in `src/lib/queue/client.ts` for manual worker triggering
- Auto-trigger pattern for development environment (worker called after job creation)
- Worker authentication bypass for `/api/workers` route (uses `WORKER_SECRET` instead of Clerk)
- `vercel.json` with cron job configuration for production worker triggering
- DocumentViewDialog: view document content with syntax highlighting
- EmbeddingsViewDialog: view embedding chunks for a document
- MoveToCollectionDialog: move documents between collections

### Changed
- **Wizard Templates**: Migrated from dynamic JS/JSON to static HTML templates
- 4 new HTML templates for image generation (dark-mode, white-mode, superheadline, twitter)
- Improved content dialog with better media handling and preview
- Enhanced image generation options UI with better organization
- Wizard flow updated: Inputs → Processing → **Synthesizer** → Narratives → Generation → **Image Gen**
- RAG chunking: changed from fixed 4000 tokens to category-specific (800-1300 tokens)
- RAG threshold: unified to 0.5 across entire pipeline (was 0.6-0.7)
- Voyage API: updated `encoding_format` parameter to `output_dtype`
- Wizard submit route: auto-triggers worker in development mode after job creation
- Wizard narratives job now includes Synthesizer v3.1 research synthesis step
- `WORKER_SECRET` default value updated to `dev-secret-change-in-production`
- `.env.example`: Added ScreenshotOne configuration section (Access Key vs Secret Key)

### Removed
- Legacy JS/JSON prompt generation files (prompt-carrosel.js, prompt-sintetizer.js, etc.)
- Obsolete template model files (model-carrossel.json, model-post-simples.json)
- Old wizard prompt documentation files

### Fixed
- **Critical**: Wizard worker not processing jobs in development (Vercel Cron only works in production)
- **Critical**: JSONB parsing error in Step 4 - `[object Object] is not valid JSON`
  - Added type check before `JSON.parse()`: `typeof value === 'string' ? JSON.parse(value) : value`
- Fixed infinite loop in AnimatedAIChat caused by non-memoized computed values
- Fixed `sendMessage` format - now uses `{ parts: [{ type: "text", text }] }` instead of deprecated `{ text }`
- Fixed TypeError: "Cannot read properties of undefined (reading 'state')" in chat streaming

### Documentation
- Added insight: 014-wizard-phase2-synthesizer-image-gen-jan2026.md
- Updated `wizard-patterns.md` with Synthesizer v3.1, Image Generation, and Prompt versions
- Updated `dev-wizard.md` with Phase 2 complete documentation
- Updated `architecture.md` with Phase 2 architecture and Image Generation flow
- Added error documentation: 032-json-parse-object-error.md
- Added insights: 013-wizard-worker-debugging-jan2026.md
- Added error documentation: 027-infinite-loop-useeffect-usememo.md, 028-usechat-sendmessage-format.md
- Added insights: 010-rag-optimization-jan-2026.md, 011-usechat-streaming-patterns.md
- Updated `queue-patterns.md` with triggerWorker() helper and troubleshooting section
- Updated `database-patterns.md` with JSONB Parsing Pattern
- Updated vercel-ai-sdk-patterns.md with sendMessage format and memoization patterns
- Updated react-hooks-patterns.md with useMemo + useCallback for streaming

**Commit**: `78ceb11` - 2026-01-19

---

## [0.8.0] - 2026-01-17

### Added
- Multi-agent chat system integration with Zep Cloud
- Agent context persistence via Zep threads
- Agent-specific system prompts

**Commit**: `ace45b3` - 2026-01-17

---

## [0.7.0] - 2026-01-16

### Added
- Vercel AI SDK migration documentation
- Error documentation for known issues during migration
- Insights documentation for SDK patterns

**Commit**: `4b42ac4` - 2026-01-16

---

## [0.6.0] - 2026-01-16

### Added
- Model list update with specified AI models
- Support for: GPT-5.x, Claude 4.5.x, Gemini 3.x, Grok 4.x

**Commit**: `c5459d7` - 2026-01-16

---

## [0.5.0] - 2026-01-16

### Changed
- Updated `.env.example` to reflect system-controlled API keys
- Removed user-controlled API key management references

**Commit**: `51f7ad9` - 2026-01-16

---

## [0.4.0] - 2026-01-16

### Removed
- Legacy API key management code from settings

### Fixed
- Cleaned up unused imports and components related to API key management

**Commit**: `98dbdc0` - 2026-01-16

---

## [0.3.0] - 2026-01-16

### Added
- System Status section in settings
- Real-time status monitoring for OpenRouter, Voyage, Firecrawl, Tavily
- Service health indicators with source tracking (env/database)

**Commit**: `8e7f691` - 2026-01-16

---

## [0.2.5] - 2026-01-16

### Added
- AiChatSdk component with Vercel AI SDK `useChat` hook
- Streaming responses with Server-Sent Events
- DefaultChatTransport for custom body fields

**Commit**: `f4643f2` - 2026-01-16

---

## [0.2.4] - 2026-01-16

### Added
- Streaming chat API endpoint using `streamText` from Vercel AI SDK
- RAG context integration in chat responses
- Multi-model support via OpenRouter

**Commit**: `5e13ae1` - 2026-01-16

---

## [0.2.3] - 2026-01-16

### Changed
- Migrated Voyage AI client to use environment variables
- Added fallback support for database-stored keys (hybrid approach)

**Commit**: `a9fd93a` - 2026-01-16

---

## [0.2.2] - 2026-01-16

### Added
- Vercel AI SDK central configuration module
- `createOpenAI` client for OpenRouter integration
- Model metadata and type definitions

**Commit**: `94ff11d` - 2026-01-16

---

## [0.2.1] - 2026-01-16

### Added
- Vercel AI SDK dependencies (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)
- Prepare for streaming chat migration

**Commit**: `41543c9` - 2026-01-16

---

## [0.2.0] - 2026-01-16

### Fixed
- **Critical**: Separated RAG module server/client exports
- Prevented `DATABASE_URL` from being accessed in browser (Client Component import issue)

### Changed
- Created barrier in `lib/rag/index.ts` - only exports types/constants
- Server-only functions like `assembleRagContext` moved to separate files

**Tag**: `20260116-133511-0300-rag-estrutura`

**Commit**: `fba084e` - 2026-01-16

---

## [0.1.0] - 2026-01-16

### Added
- MCP (Model Context Protocol) servers configuration
- Claude Code integration for development workflow

**Commit**: `7d5beda` - 2026-01-16

---

## [0.0.3] - 2026-01-15

### Added
- Calendar Editorial page with month/week/day views
- Content Library page with grid/list views
- Drag & drop for rescheduling posts
- Batch operations for content management
- Category and tag management

**Pull Request**: #1 - Merge feat/start-dev into main

**Commit**: `8ab259c` (merge) | `3e7e955` (feat) - 2026-01-15

---

## [0.0.2] - 2026-01-15

### Added
- Prompt System implementation
- Sources Page refactor with document management
- PDF/TXT/MD file upload with text extraction
- Document categories for RAG

**Commit**: `314b723` - 2026-01-15

---

## [0.0.1] - 2026-01-15

### Added
- Frontend Foundation: AppLayout, navigation, design system
- Glassmorphism UI components
- Framer Motion animations
- Responsive design patterns

**Commit**: `fd267ec` - 2026-01-15

---

## [0.0.0] - 2026-01-14

### Added
- Initial project setup
- Database schema (Neon PostgreSQL + Drizzle ORM)
- Authentication with Clerk
- Queue system with Upstash Redis
- Basic project structure

**Commit**: `9e5eafb` - 2026-01-14

---

## [0.0.0-alpha] - 2026-01-14

### Added
- shadcn/ui component library integration
- Tubelight navbar with animations
- Design tokens and global styles

**Commit**: `2ccf5dd` - 2026-01-14

---

## [0.0.0-init] - 2026-01-14

### Added
- Project initialization
- Next.js 16.1.1 with App Router
- TypeScript configuration
- Tailwind CSS v4 setup

**Commit**: `7bd0bc6` - 2026-01-14

---

## Tags Summary

| Tag | Date | Description |
|-----|------|-------------|
| `20260116-133511-0300-rag-estrutura` | 2026-01-16 | RAG module structure fix |
| `backup-20260116-094634` | 2026-01-16 | Pre-merge backup |

---

## Branches

| Branch | Status | Description |
|--------|--------|-------------|
| `main` | ✅ Protected | Production branch |
| `feat/database-embedding` | Active | Database embedding features |
| `feat/start-dev` | Merged | Initial development (merged to main) |

---

## Contributors

- **Jonas Silva** (@zoryon-dev) - Project owner and primary developer

---

## Notes

- **Phase 1** (Jan 14): Initial setup and infrastructure
- **Phase 2** (Jan 14): UI components and design system
- **Phase 3** (Jan 14): Database, auth, and queue
- **Phase 4** (Jan 15): Frontend foundation
- **Phase 5** (Jan 15): Prompt system and sources page
- **Phase 6** (Jan 15): Calendar editorial
- **Phase 7** (Jan 15): Content library
- **Phase 8** (Jan 16): Vercel AI SDK migration
- **Phase 9** (Jan 16): Zep Cloud multi-agent integration
- **Phase 10** (Jan 17): RAG optimization and streaming fixes
