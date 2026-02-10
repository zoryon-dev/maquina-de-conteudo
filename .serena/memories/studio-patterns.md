# Studio Editor Patterns

Editor Visual para criação de carrosséis, posts e stories com templates profissionais.

## Arquitetura

### Estrutura de Arquivos

```
src/
├── lib/studio-templates/          # Templates HTML
│   ├── types.ts                   # Tipos TypeScript
│   ├── 01-capa.ts                 # Template de capa
│   ├── 201.ts                     # Slide bold início
│   ├── 202.ts                     # Slide padrão
│   ├── 203.ts                     # Slide com swipe
│   ├── renderer.ts                # Renderizador central
│   └── index.ts                   # Exports
├── stores/
│   └── studio-store.ts            # Zustand store
└── app/(app)/studio/
    ├── page.tsx                   # Server Component
    └── components/
        ├── studio-page.tsx        # Client orchestrator
        ├── studio-header.tsx      # Header + ações
        ├── editor/
        │   ├── editor-panel.tsx   # Container
        │   ├── text-editor.tsx    # Campos de texto
        │   ├── color-picker.tsx   # Cores
        │   ├── image-picker.tsx   # Upload imagens
        │   ├── profile-editor.tsx # Perfil (avatar, nome)
        │   └── header-editor.tsx  # Header (categoria, marca)
        ├── canvas/
        │   ├── canvas-panel.tsx   # Preview iframe
        │   └── slide-navigator.tsx# Thumbnails
        └── templates/
            └── template-gallery.tsx
```

## Templates Disponíveis

### Figma Templates (Com Perfil)

| Template | Uso | Layout |
|----------|-----|--------|
| `01_CAPA` | Primeiro slide | Imagem fundo 70% + headline gigante |
| `201` | Conteúdo | Texto bold → texto → imagem |
| `202` | Conteúdo | Texto → texto → imagem → texto bold |
| `203` | Final | Texto bold → imagem + swipe full-width |

### Generic Templates (Headline/Descrição)

| Template | Uso | Layout |
|----------|-----|--------|
| `DARK_MODE` | Qualquer | Fundo escuro + gradiente teal |
| `WHITE_MODE` | Qualquer | Fundo claro minimalista |
| `TWITTER` | Qualquer | Estilo tweet com avatar e badge |
| `SUPER_HEADLINE` | Capa | Headline 115px + grid de fundo |

### Especificações Visuais

```
Dimensões: 1080 x 1440 (Instagram 3:4)

Fontes:
- Nome: Inter Medium, 43px, tracking -2.15px
- Handle: Inter Medium, 39px, #717171
- Texto: Inter Regular/Bold, 39px, tracking -1.17px
- Header: Inter Bold, 14px, uppercase

Cores base:
- Background: #FFFFFF
- Texto: #000000
- Handle: #717171
- Primary (swipe): #FFD700
- Badge: #1DA1F2

Espaçamentos:
- Padding lateral: 62px
- Gap elementos: 50px
- Border radius imagem: 20px
- Avatar: 134px, rotação -15°
```

## Tipos Principais

```typescript
// Template IDs (8 templates disponíveis)
type FigmaTemplate =
  | "01_CAPA" | "201" | "202" | "203"      // Com perfil
  | "DARK_MODE" | "WHITE_MODE" | "TWITTER" | "SUPER_HEADLINE"; // Genéricos

// Conteúdo do slide
interface SlideContent {
  texto1: string;
  texto1Bold: boolean;
  texto2: string;
  texto3?: string;
  texto3Bold: boolean;
  imageUrl?: string;
  backgroundImageUrl?: string; // Apenas 01_CAPA
}

// Estilo visual
interface SlideStyle {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  showSwipeIndicator: boolean;
}

// Slide completo
interface StudioSlide {
  id: string;
  template: FigmaTemplate;
  content: SlideContent;
  style: SlideStyle;
}

// Estado do Studio
interface StudioState {
  contentType: "carousel" | "single" | "story";
  aspectRatio: "3:4" | "1:1" | "9:16";
  slides: StudioSlide[];
  activeSlideIndex: number;
  caption: string;
  hashtags: string[];
  profile: StudioProfile;
  header: StudioHeader;
  projectTitle: string;
  isDirty: boolean;
}
```

## Zustand Store

```typescript
import { useStudioStore, useActiveSlide } from "@/stores/studio-store";

// Selectors otimizados
const activeSlide = useActiveSlide();
const slides = useStudioStore((state) => state.slides);

// Actions
const addSlide = useStudioStore((state) => state.addSlide);
const updateSlideContent = useStudioStore((state) => state.updateSlideContent);
const setSlideTemplate = useStudioStore((state) => state.setSlideTemplate);

// Exemplo de uso
addSlide("202"); // Adiciona slide com template 202
updateSlideContent(slideId, { texto1: "Novo texto" });
```

### Actions Disponíveis

| Action | Descrição |
|--------|-----------|
| `addSlide(template?, index?)` | Adiciona slide |
| `removeSlide(slideId)` | Remove slide |
| `duplicateSlide(slideId)` | Duplica slide |
| `moveSlide(from, to)` | Reordena |
| `setActiveSlide(index)` | Ativa slide |
| `setSlideTemplate(id, template)` | Muda template |
| `updateSlideContent(id, content)` | Atualiza conteúdo |
| `updateSlideStyle(id, style)` | Atualiza estilo |
| `applyStyleToAllSlides(style)` | Estilo global |
| `updateProfile(profile)` | Atualiza perfil |
| `updateHeader(header)` | Atualiza header |

## Renderização

```typescript
import { renderSlideToHtml, generatePreviewDataUrl } from "@/lib/studio-templates";

// Render para HTML
const result = renderSlideToHtml({
  slide,
  profile,
  header,
  slideIndex: 0,
  totalSlides: 5,
});

// Para preview em iframe
const dataUrl = generatePreviewDataUrl(slide, profile, header, {
  scale: 0.4,
});

// Uso no componente
<iframe src={dataUrl} />
```

## Preview em Tempo Real

O Canvas Panel renderiza o slide atual em um iframe usando data URL:

```tsx
// canvas-panel.tsx
const previewHtml = useMemo(() => {
  return renderSlideToHtml({ slide, profile, header, slideIndex, totalSlides });
}, [slide, profile, header, slideIndex, totalSlides]);

const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml.html)}`;

<iframe src={dataUrl} style={{ transform: `scale(${scale})` }} />
```

## Persistência

O store usa middleware `persist` do Zustand:

```typescript
persist(
  (set) => ({ ... }),
  {
    name: "studio-store",
    partialize: (state) => ({
      // Persiste tudo exceto flags de loading
      contentType, aspectRatio, slides, activeSlideIndex,
      caption, hashtags, profile, header, projectTitle
    }),
  }
)
```

## Layout Split View

```
┌──────────────────────────────────────────────────────────┐
│  Studio Header (título, tipo, salvar, publicar)          │
├─────────────────────────┬────────────────────────────────┤
│  Editor Panel (40%)     │  Canvas Panel (60%)            │
│  ┌───────────────────┐  │  ┌────────────────────────┐    │
│  │ Template Gallery  │  │  │                        │    │
│  └───────────────────┘  │  │    Preview iframe      │    │
│  ┌───────────────────┐  │  │    1080 x 1440         │    │
│  │ Text Editor       │  │  │    (escala 0.4)        │    │
│  └───────────────────┘  │  │                        │    │
│  ┌───────────────────┐  │  └────────────────────────┘    │
│  │ Image Picker      │  │  ┌────────────────────────┐    │
│  └───────────────────┘  │  │ Slide Navigator        │    │
│  ┌───────────────────┐  │  │ [1] [2] [3] [+]        │    │
│  │ Color Picker      │  │  └────────────────────────┘    │
│  └───────────────────┘  │                                │
└─────────────────────────┴────────────────────────────────┘
```

## Navegação

Adicionado ao menu "Criar" em `app-layout.tsx`:

```typescript
{
  name: "Criar",
  url: "/wizard",
  icon: Wand2,
  children: [
    { name: "Wizard", url: "/wizard", icon: Wand2 },
    { name: "Studio", url: "/studio", icon: Palette },
    { name: "ZoryAI", url: "/chat", icon: Sparkles },
  ],
}
```

## Fases de Implementação

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 | ✅ | Templates HTML (types, 01-capa, 201, 202, 203) |
| 2 | ✅ | Renderer e exports |
| 3 | ✅ | Store Zustand |
| 4 | ✅ | Página /studio e layout split view |
| 5 | ✅ | Componentes de edição |
| 6 | ✅ | Upload real para storage (R2/local) |
| 7 | ✅ | Drag & drop para reordenar slides (@dnd-kit) |
| 8 | ✅ | Keyboard shortcuts (Ctrl+S, Ctrl+D, setas, etc.) |
| 9 | ✅ | Sugestões IA para textos |
| 10 | ✅ | APIs save/publish + renderização ScreenshotOne |

## Keyboard Shortcuts

| Atalho | Ação |
|--------|------|
| `Ctrl/⌘ + S` | Salvar projeto |
| `Ctrl/⌘ + D` | Duplicar slide atual |
| `← →` | Navegar entre slides |
| `1-9` | Ir para slide específico |
| `Delete` | Remover slide atual |
| `Escape` | Sair do campo de texto |

### Hook de Keyboard

```typescript
import { useStudioKeyboard } from "../hooks/use-studio-keyboard";

// No componente StudioPage
useStudioKeyboard({ onSave: handleSave });
```

## Drag & Drop

Implementado com `@dnd-kit/core` e `@dnd-kit/sortable`:

```typescript
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";

// SlideNavigator usa DndContext + SortableContext
// SortableSlideThumbnail usa useSortable hook
```

## APIs Implementadas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/studio/upload-image` | POST | Upload de imagem para storage |
| `/api/studio/ai-suggestions` | POST | Gera sugestões de texto com IA |
| `/api/studio/generate-image` | POST | Gera imagem com IA (múltiplos modelos) |
| `/api/studio/save` | POST/GET | Salva/carrega projeto como rascunho |
| `/api/studio/publish` | POST | Publica gerando imagens finais |

### Sugestões IA

Tipos disponíveis:
- `headline`: Título para capa
- `hook`: Texto de abertura/gancho
- `context`: Texto de desenvolvimento
- `conclusion`: Conclusão/CTA
- `hashtags`: Tags relevantes

```typescript
// Uso
const response = await fetch("/api/studio/ai-suggestions", {
  method: "POST",
  body: JSON.stringify({
    type: "headline",
    context: { topic: "produtividade" },
    count: 3,
  }),
});
```

### Publicação

O fluxo de publicação:
1. Valida estado (slides não vazios)
2. Renderiza cada slide via ScreenshotOne
3. Faz upload das imagens para storage
4. Salva na tabela `libraryItems`
5. Redireciona para `/library/[id]`

## Geração de Imagem com IA

### Modelos Disponíveis

| Modelo | Provider | Descrição |
|--------|----------|-----------|
| `google/gemini-3-pro-image-preview` | Google | Rápido e versátil (default) |
| `openai/gpt-5-image` | OpenAI | Alta qualidade |
| `bytedance-seed/seedream-4.5` | ByteDance | Artístico |
| `black-forest-labs/flux.2-max` | Black Forest | Fotorrealista |

### Fluxo de Geração

```typescript
// 1. Usuário preenche prompt + estilo + modelo
const response = await fetch("/api/studio/generate-image", {
  method: "POST",
  body: JSON.stringify({
    prompt: "Uma xícara de café em uma mesa de madeira",
    style: "minimal", // minimal | realistic | artistic | vibrant
    model: "google/gemini-3-pro-image-preview"
  }),
});

// 2. API usa IMAGE_PROMPT_SYSTEM v4.4 (tribal) para otimizar prompt
// 3. Envia para modelo selecionado via OpenRouter
// 4. Faz upload da imagem para storage
// 5. Retorna URL da imagem
```

### Prompt System (v4.4)

O sistema usa prompts **tribais** otimizados para Instagram:
- Aplica ângulos: Herege, Visionário, Tradutor, Testemunha
- Adapta para tipo de slide: Hook, Desenvolvimento, CTA
- Formato 3:4 otimizado para mobile

### Estilos de Imagem

| Estilo | VisualStyle | ColorOption |
|--------|-------------|-------------|
| `minimal` | minimalista | claro |
| `realistic` | realista | vibrante |
| `artistic` | abstrato | vibrante |
| `vibrant` | moderno | neon |

## Preview Fullscreen

### Funcionalidades

- Botão "Ampliar" com ícone Maximize2
- Dialog fullscreen com fundo escuro
- Navegação entre slides com setas (← →)
- Keyboard shortcuts: `ESC` para fechar, `← →` para navegar
- Indicador "Slide X de Y"
- Zoom automático para caber na tela

### Implementação

```typescript
// canvas-panel.tsx
const [fullscreenOpen, setFullscreenOpen] = useState(false);

// FullscreenPreviewDialog
<Dialog open={fullscreenOpen}>
  <DialogContent className="max-w-none w-screen h-screen">
    {/* Navegação com ChevronLeft/ChevronRight */}
    {/* Preview com scale calculado */}
    {/* Keyboard listener para arrows e ESC */}
  </DialogContent>
</Dialog>
```

## Integração com Sistema

### Banco de Dados

**Não requer migrações.** O Studio reutiliza a tabela `libraryItems`:

```typescript
// Estrutura salva
{
  userId: string,           // Clerk userId
  type: "carousel" | "image" | "story",
  status: "draft",          // Sempre draft, usuário agenda pela Library
  title: string,
  content: JSON.stringify({
    studio: { slides, profile, header, aspectRatio },
    caption: string,
    hashtags: string[]
  }),
  mediaUrl: JSON.stringify(imageUrls), // URLs das imagens renderizadas
  metadata: JSON.stringify({
    source: "studio",       // Identifica origem
    version: "1.0",
    slideCount: number,
    publishedAt?: string
  })
}
```

### Fluxo Completo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Studio    │ --> │   Publicar  │ --> │   Library   │ --> │  Agendar/    │
│   Editor    │     │   (draft)   │     │   (/[id])   │     │  Publicar    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────────────┘
```

### Integrações

| Sistema | Status | Detalhes |
|---------|--------|----------|
| Usuários (Clerk) | ✅ | userId em todas as operações |
| Storage (R2/Local) | ✅ | Upload de imagens |
| Library | ✅ | Salva como libraryItem |
| Agendamento | ⚠️ Indireto | Via Library após publicar |
| Redes Sociais | ⚠️ Indireto | Via Library → Social Publishing |

## Error Handling & Segurança (Feb 2026)

### Padrão toAppError() nas APIs

Todas as API routes do Studio usam o padrão de error handling do projeto:

```typescript
import { toAppError, getErrorMessage, ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    // ... operações
  } catch (error) {
    const appError = toAppError(error, "STUDIO_SAVE_FAILED")
    console.error("[StudioSave]", appError.code, ":", appError.message)
    return NextResponse.json(
      { success: false, error: getErrorMessage(appError), code: appError.code },
      { status: appError.statusCode }
    )
  }
}
```

### Validações Implementadas

| API | Validação | Erro |
|-----|-----------|------|
| `/api/studio/ai-suggestions` | Enum type válido | ValidationError 400 |
| `/api/studio/ai-suggestions` | Count clamp (1-5) | Silently clamped |
| `/api/studio/save` | projectId parseInt válido | ValidationError 400 |
| `/api/studio/save` | MAX_SLIDES (10) | ValidationError 400 |
| `/api/studio/generate-image` | Model/style fallback | Warning log |

### Atomic Updates (Race Condition Prevention)

```typescript
// Padrão: WHERE id=X AND userId=Y em única query
const result = await db
  .update(libraryItems)
  .set({ title, content, updatedAt: new Date() })
  .where(and(
    eq(libraryItems.id, projectId),
    eq(libraryItems.userId, userId)
  ))
  .returning({ id: libraryItems.id })

if (result.length === 0) {
  // Verificar se existe para diferenciar 404 de 403
  const [exists] = await db.select({ id: libraryItems.id }).from(libraryItems).where(eq(libraryItems.id, projectId))
  if (!exists) throw new NotFoundError("Projeto", String(projectId))
  throw new ForbiddenError("Sem permissão para editar este projeto")
}
```

### response.ok Pattern (Client Components)

Todos os componentes cliente verificam HTTP status ANTES de parsear JSON:

```typescript
const response = await fetch(url, options)

// Verificar HTTP status ANTES de parsear JSON
if (!response.ok) {
  const error = await response.json().catch(() => ({}))
  throw new Error(error.error || `Erro do servidor: ${response.status}`)
}

const result = await response.json()
if (!result.success) {
  throw new Error(result.error || "Erro desconhecido")
}
```

### Network Error Detection

```typescript
try {
  const response = await fetch(url, options)
  // ...
} catch (error) {
  // Detectar erro de rede (sem resposta do servidor)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    toast.error("Erro de conexão. Verifique sua internet.")
    return
  }
  toast.error(error instanceof Error ? error.message : "Erro desconhecido")
}
```

### XSS Prevention (CSS URL Escape)

```typescript
// types.ts
export function escapeCssUrl(url: string): string {
  return url.replace(/['"()\\]/g, (char) => `\\${char}`).replace(/[\n\r]/g, "")
}

// 01-capa.ts
const backgroundStyle = content.backgroundImageUrl
  ? `background-image: url('${escapeCssUrl(content.backgroundImageUrl)}'); ...`
  : `background-color: ${style.primaryColor};`
```

### MAX_SLIDES Constant

```typescript
// types.ts
export const MAX_SLIDES = 10

// studio-store.ts - Enforçado em addSlide
if (state.slides.length >= MAX_SLIDES) {
  console.warn(`[StudioStore] Cannot add slide: max ${MAX_SLIDES} reached`)
  return state
}

// save/route.ts - Validado na API
if (state.slides.length > MAX_SLIDES) {
  throw new ValidationError(`Máximo de ${MAX_SLIDES} slides permitido`)
}
```

### loadProject Validation

```typescript
loadProject: (projectState) => {
  // Validar campos essenciais
  if (projectState.slides && !Array.isArray(projectState.slides)) {
    console.error("[StudioStore] Invalid slides in loadProject")
    return
  }
  if (projectState.slides?.length === 0) {
    console.error("[StudioStore] Cannot load project with empty slides")
    return
  }

  set((state) => ({
    ...state,
    ...projectState,
    // Garantir activeSlideIndex válido
    activeSlideIndex: Math.min(
      projectState.activeSlideIndex ?? state.activeSlideIndex,
      (projectState.slides?.length ?? state.slides.length) - 1
    ),
    isDirty: false,
  }))
}
```

## Próximos Passos (Opcionais)

### Melhorias Futuras
- Undo/redo com histórico (temporal middleware para Zustand)
- Mais templates de slide
- Exportar como PDF
- Compartilhamento de templates entre usuários
- Animações de transição entre slides no preview
