# Insights: Refatoração da Página /fontes (Janeiro 2026)

**Data:** Janeiro 2026
**Fase:** Fase 5 - Fontes de Conteúdo
**Responsável:** Refatoração de UX e arquitetura

---

## Resumo Executivo

A refatoração da página `/fontes` centralizou o gerenciamento de documentos RAG que estava duplicado entre `/settings` e `/fontes`, resultando em:
- **Remoção de duplicação:** Aba "Documentos" removida de `/settings`
- **UX aprimorada:** Navbar com visual mais rico e indicadores animados
- **Componentes reutilizáveis:** UploadDialog agora integrado a múltiplos contextos

---

## Insight 1: Centralização vs Duplicação

**Problema:** Documentos RAG estavam acessíveis em dois lugares (`/settings` → Documentos e `/fontes` → Documentos).

**Solução:** Manter apenas `/fontes` como o local principal para gerenciamento de documentos.

**Justificativa UX:**
- `/fontes` é semanticamente mais apropriado para gerenciar "fontes de conteúdo"
- Usuários procuram por "fontes" quando querem adicionar documentos, não "configurações"
- Reduz confusão sobre onde fazer upload

**Aprendizado:**
> Quando uma funcionalidade pertence semanticamente a duas áreas, escolha a que o usuário intuitivamente associaria com a ação. Gerenciar documentos = gerenciar fontes.

---

## Insight 2: Enhanced Navbar Pattern

**Padrão implementado:** Navbar com grid layout, active indicator animado, e descrições.

**Componente:**
```typescript
// src/app/(app)/sources/page.tsx
<nav className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {tabs.map(tab => (
    <button
      key={tab.value}
      className={cn(
        "relative p-4 rounded-lg border transition-all",
        activeTab === tab.value && "border-primary/50 bg-primary/5"
      )}
    >
      <motion.div
        layoutId="activeTab"
        className="absolute inset-0 border-2 border-primary rounded-lg"
      />
      <Icon className="h-6 w-6" />
      <h3 className="font-semibold">{tab.label}</h3>
      <p className="text-sm text-white/70">{tab.description}</p>
    </button>
  ))}
</nav>
```

**Técnicas utilizadas:**
1. **Framer Motion `layoutId`** - Cria transição suave entre abas sem coordenadas manuais
2. **Grid responsivo** - 1 coluna no mobile, 3 no desktop
3. **Descrições** - Contexto adicional para cada aba
4. **Checkmark visual** - Feedback claro do estado ativo

**Aprendizado:**
> `layoutId` do Framer Motion é superior a animações CSS para transições entre elementos diferentes. O layout automático se adapta a mudanças de DOM sem código complexo.

---

## Insight 3: UploadDialog Reutilizável

**Padrão:** Dialog que pode ser usado tanto em `/fontes` quanto em `/settings` (se necessário).

**Estrutura:**
```typescript
// src/sources/components/upload-dialog.tsx
interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

export function UploadDialog({ open, onOpenChange, onUploadComplete }: UploadDialogProps) {
  const [category, setCategory] = useState<DocumentCategory>("general");
  // ...
}
```

**Categorias disponíveis:**
- `general` - Documentos gerais
- `products` - Produtos/serviços
- `offers` - Ofertas e promoções
- `brand` - Guidelines de marca
- `audience` - Persona e público-alvo
- `competitors` - Análise de concorrência
- `content` - Exemplos de conteúdo

**Aprendizado:**
> Componentes de dialog devem aceitar `open` e `onOpenChange` como props para serem controlados externamente. `onUploadComplete` callback permite que o parent atualize seu estado após upload.

---

## Insight 4: Server Actions por Contexto

**Padrão:** Criar arquivos de actions específicos para cada área.

**Antes (tudo em um lugar):**
```typescript
// src/lib/actions.ts (monolítico)
export async function uploadDocumentAction(...) { ... }
export async function saveVariableAction(...) { ... }
export async function createProjectAction(...) { ... }
```

**Depois (separado por contexto):**
```typescript
// src/sources/sources-actions.ts (específico para fontes)
"use server"
export async function uploadDocumentAction(formData: FormData) { ... }
export async function deleteDocumentAction(id: string) { ... }
export async function updateDocumentCategoryAction(id: string, category: string) { ... }
```

**Benefícios:**
- Coesão: Actions relacionadas ficam juntas
- Facilidade de encontrar: Busca por `sources-actions.ts` quando trabalhando em /fontes
- Menos conflitos: Múltiplos devs podem trabalhar em áreas diferentes

**Aprendizado:**
> Server actions devem seguir a estrutura de pastas da aplicação. Cada route group pode ter seu próprio arquivo de actions.

---

## Insight 5: Estado Empty vs Loading

**Padrão:** Sempre mostrar estado vazio quando não há dados.

**Componente DocumentsTab:**
```typescript
{documents.length === 0 ? (
  <div className="text-center py-12">
    <FileText className="h-12 w-12 mx-auto text-white/20 mb-4" />
    <h3 className="text-lg font-semibold mb-2">Nenhum documento</h3>
    <p className="text-white/60 mb-4">
      Faça upload de documentos para enriquecer suas respostas com contexto personalizado.
    </p>
    <Button onClick={() => setUploadDialogOpen(true)}>
      <Upload className="h-4 w-4 mr-2" />
      Fazer Upload
    </Button>
  </div>
) : (
  <DocumentsList documents={documents} />
)}
```

**Aprendizado:**
> Empty states devem incluir: 1) ícone representativo, 2) título claro, 3) explicação do porquê está vazio, 4) call-to-action para resolver.

---

## Insight 6: Filtros com Scroll Horizontal

**Padrão:** Filtros em container com scroll horizontal para mobile.

**Componente:**
```typescript
<div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
  {categories.map(cat => (
    <button
      key={cat.value}
      className={cn(
        "px-4 py-2 rounded-full whitespace-nowrap transition-colors",
        selectedCategory === cat.value
          ? "bg-primary text-black"
          : "bg-white/5 hover:bg-white/10"
      )}
    >
      {cat.label}
    </button>
  ))}
</div>
```

**Detalhes:**
- `whitespace-nowrap` impede quebra de texto nos botões
- `-mx-2 px-2` compensa o padding do container parent
- `overflow-x-auto` permite scroll em telas pequenas

**Aprendizado:**
> Filtros horizontais com scroll são superiores a dropdowns em mobile. Mostram todas as opções de uma vez e são mais fáceis de navegar com o polegar.

---

## Insight 7: Estatísticas Visuais

**Padrão:** Cards de contagem para dar contexto rápido.

**Componente:**
```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <StatCard label="Total" value={documents.length} icon={FileText} />
  <StatCard label="Indexados" value={indexedCount} icon={CheckCircle} />
  <StatCard label="Pendentes" value={pendingCount} icon={Clock} />
  <StatCard label="Erros" value={errorCount} icon={AlertCircle} />
</div>
```

**Benefícios:**
- Feedback imediato do estado da base RAG
- Motiva usuário a indexar documentos
- Identifica problemas rapidamente

**Aprendizado:**
> Estatísticas devem ser simples e visuais. Ícones + números + labels. Evite tabelas complexas para overview.

---

## Decisões Técnicas

| Decisão | Alternativas Consideradas | Justificativa |
|---------|---------------------------|---------------|
| Remover documentos de `/settings` | Manter em ambos os lugares | Evita duplicação e confusão |
| Grid layout na navbar | List layout tradicional | Melhor uso de espaço em desktop |
| `layoutId` do Framer Motion | Animações CSS manuais | Código mais limpo, transições suaves |
| `sources-actions.ts` separado | Actions em arquivo único | Melhor organização por contexto |
| Scroll horizontal nos filtros | Dropdown select | Melhor UX em mobile |

---

## Próximos Passos

1. **Indexação automática:** Após upload, acionar job de indexação automaticamente
2. **Preview de documento:** Mostrar primeiras linhas do documento antes de fazer download
3. **Bulk operations:** Seleção múltipla para deletar/mover categorias
4. **Search em documentos:** Busca full-text dentro dos documentos indexados

---

## Métricas de Sucesso

| Métrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| Cliques para upload documento | 3 (/settings → Documentos → Upload) | 2 (/fontes → Upload) | ≤ 2 |
] Duplicação de funcionalidade | 2 locais | 1 local | 0 |
] Components reutilizáveis | 0 | 1 (UploadDialog) | 3+ |

---

## Conclusão

A refatoração da página `/fontes` demonstra como pequenas mudanças de UX podem ter grande impacto na usabilidade. Centralizar funcionalidades duplicadas e melhorar a navegação visual resultou em uma experiência mais intuitiva.

**Princípio chave:** O código deve refletir o modelo mental do usuário. Documentos = fontes de conteúdo.

---

**Arquivos principais:**
- `src/app/(app)/sources/page.tsx` - Enhanced navbar com grid
- `src/sources/components/upload-dialog.tsx` - Dialog reutilizável
- `src/sources/components/documents-tab.tsx` - Gerenciamento de documentos
- `src/sources/sources-actions.ts` - Server actions específicas
