# Tutorial Completo — Zoryon Blog (Astro 5)

Guia de referencia para IA e humanos operarem o Zoryon Blog.

---

## Arquitetura do Projeto

```
zoryon-blog/
├── apps/blog/                          # Astro 5 (site estatico)
│   ├── astro.config.ts                 # Config: MDX, sitemap, partytown, expressive-code, icon
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/                         # Assets estaticos (servidos em /)
│   └── src/
│       ├── content.config.ts           # Schemas Zod das collections
│       ├── content/
│       │   ├── articles/               # Artigos em MDX
│       │   │   ├── *.mdx
│       │   │   └── images/             # Imagens de capa dos artigos
│       │   ├── authors/                # Autores em JSON
│       │   │   ├── *.json
│       │   │   └── images/             # Avatares dos autores
│       │   ├── categories/             # Categorias em JSON
│       │   └── ctas/                   # CTAs em JSON
│       ├── components/
│       │   ├── mdx/                    # Componentes para uso dentro do MDX
│       │   │   ├── ImageBlock.astro
│       │   │   └── CTABlock.astro
│       │   ├── ui/                     # Primitivos (Button, Input, etc.)
│       │   └── *.astro                 # Componentes do site
│       ├── layouts/
│       │   ├── BaseLayout.astro        # Shell HTML (head, header, footer)
│       │   └── ArticleLayout.astro     # Wrapper de artigos
│       ├── lib/
│       │   ├── content.ts              # Helpers de acesso a colecoes
│       │   ├── format-date.ts          # Formatacao manual de datas
│       │   ├── tracking.ts             # GTM helpers
│       │   └── utils.ts               # cn() utility
│       ├── pages/                      # Roteamento por arquivo
│       └── styles/
│           ├── globals.css             # Tema Zoryon (CSS vars, Tailwind v4)
│           └── mdx-prose.css           # Estilos tipograficos para MDX
├── packages/
│   ├── shared-config/                  # Tipos, schemas, tokens
│   └── shared-ui/                      # Componentes compartilhados (futuro)
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Comandos

```bash
pnpm --filter @zoryon/blog dev          # Dev local (localhost:4321)
pnpm --filter @zoryon/blog build        # Build estatico (dist/)
pnpm --filter @zoryon/blog preview      # Preview do build
pnpm --filter @zoryon/blog check        # Type check
```

---

## 1. Como Criar um Artigo

### 1.1 Criar o arquivo MDX

Crie um arquivo `.mdx` em:

```
apps/blog/src/content/articles/<slug>.mdx
```

O nome do arquivo se torna o slug da URL:

```
meu-artigo.mdx  →  /artigo/meu-artigo
```

### 1.2 Escrever o frontmatter

```mdx
---
title: "Titulo do Artigo"
excerpt: "Resumo curto de 1-2 frases. Aparece nos cards e no Google."
coverImage: "./images/meu-artigo.jpg"
category: "ia-negocios"
author: "jonas-kessler"
publishedAt: "2025-06-15"
readingTime: "7 min"
featured: false
draft: false
---
```

### 1.3 Campos do frontmatter

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `title` | string | Sim | Titulo do artigo |
| `excerpt` | string | Sim | Resumo (120-160 caracteres ideal para SEO) |
| `coverImage` | image path | Sim | Caminho relativo para imagem local (ver secao 2) |
| `category` | string | Sim | Slug da categoria (ver tabela abaixo) |
| `author` | string | Sim | ID do autor (nome do arquivo JSON sem extensao) |
| `publishedAt` | string | Sim | Data no formato `YYYY-MM-DD` |
| `readingTime` | string | Sim | Tempo estimado (ex: `"8 min"`) |
| `featured` | boolean | Nao | Se `true`, aparece no hero da home. Default: `false` |
| `draft` | boolean | Nao | Se `true`, artigo oculto do site. Default: `false` |

### 1.4 Conteudo em Markdown

Apos o frontmatter, escreva em Markdown padrao:

```mdx
---
title: "Meu Artigo"
# ...
---

Paragrafo introdutorio.

## Subtitulo (H2)

Texto com **negrito**, *italico* e [links](https://exemplo.com).

### Sub-subtitulo (H3)

- Item de lista
- Outro item

> Citacao em bloco

1. Lista numerada
2. Segundo item
```

### 1.5 Blocos de codigo

O **Expressive Code** gera syntax highlight automaticamente:

````mdx
```python title="exemplo.py"
def hello():
    print("Hello, World!")
```
````

Recursos do Expressive Code:

| Recurso | Sintaxe | Exemplo |
|---------|---------|---------|
| Titulo do arquivo | ` ```js title="app.js" ` | Mostra "app.js" no header |
| Destacar linhas | ` ```js {3-5} ` | Linhas 3-5 em destaque |
| Marcar insercoes | ` ```js ins={2} ` | Linha 2 verde |
| Marcar remocoes | ` ```js del={4} ` | Linha 4 vermelha |
| Combinados | ` ```js title="diff.ts" ins={2} del={1} ` | Tudo junto |

---

## 2. Como Usar Imagens

### 2.1 Sistema de imagens otimizadas

O Astro otimiza todas as imagens locais automaticamente no build:

- **Converte para WebP** (30-90% menor que JPEG)
- **Gera `srcset` responsivo** (multiplas resolucoes)
- **Adiciona `width`/`height`** automaticamente (zero CLS)
- **Lazy loading** nativo

### 2.2 Imagem de capa do artigo

**Passo 1:** Coloque a imagem na pasta de imagens dos artigos:

```
apps/blog/src/content/articles/images/meu-artigo.jpg
```

**Passo 2:** Referencie no frontmatter com caminho relativo:

```yaml
coverImage: "./images/meu-artigo.jpg"
```

**Dimensoes recomendadas:** 1200x600px (proporcao 2:1)

O Astro gera automaticamente versoes de 600px, 900px e 1200px em WebP.

### 2.3 Imagens dentro do conteudo (ImageBlock)

Para imagens com legenda e controle de tamanho:

```mdx
---
title: "Meu Artigo"
# ...
---

import ImageBlock from '@/components/mdx/ImageBlock.astro'

Texto do artigo...

<ImageBlock
  src="./images/grafico.jpg"
  alt="Descricao do grafico"
  caption="Legenda que aparece abaixo da imagem"
  size="large"
/>
```

**IMPORTANTE:** Para usar imagens locais no ImageBlock dentro de MDX, a imagem precisa ser importada primeiro:

```mdx
import ImageBlock from '@/components/mdx/ImageBlock.astro'
import grafico from './images/grafico.jpg'

<ImageBlock
  src={grafico}
  alt="Descricao"
  caption="Legenda"
  size="medium"
/>
```

O ImageBlock tambem aceita URLs externas como fallback:

```mdx
<ImageBlock
  src="https://images.unsplash.com/photo-xxx"
  alt="Descricao"
  size="large"
/>
```

### 2.4 Tamanhos do ImageBlock

| Valor | Largura maxima | Quando usar |
|-------|---------------|-------------|
| `small` | 448px | Icones, diagramas pequenos |
| `medium` | 672px | Graficos, screenshots parciais |
| `large` | 896px | Fotos, screenshots completos (**padrao**) |
| `full` | 100% | Imagens que ocupam toda largura |

### 2.5 Imagem Markdown simples

Para imagens sem legenda nem controle de tamanho:

```mdx
![Descricao da imagem](https://url-externa.com/foto.jpg)
```

> Nota: imagens em Markdown puro nao passam pela otimizacao do Astro. Prefira o ImageBlock para imagens importantes.

### 2.6 Onde ficam as imagens

| Tipo | Localizacao | Referencia |
|------|------------|------------|
| Covers de artigos | `src/content/articles/images/` | `coverImage: "./images/nome.jpg"` |
| Imagens internas de artigos | `src/content/articles/images/` | `import img from './images/nome.jpg'` |
| Avatares de autores | `src/content/authors/images/` | `"avatar": "./images/nome.jpg"` |
| Assets estaticos do site | `public/` | `/nome-do-arquivo.svg` |
| Logo, favicon | `public/` | Editavel em `BaseLayout.astro` |

### 2.7 Dimensoes recomendadas

| Uso | Dimensao | Proporcao |
|-----|----------|-----------|
| Cover de artigo | 1200x600px | 2:1 |
| Open Graph | 1200x630px | ~1.91:1 |
| Avatar de autor | 400x400px | 1:1 |
| Imagens internas | 1200px largura | Livre |

---

## 3. CTAs Dentro dos Artigos

CTAs (Call-to-Action) sao banners inseridos no meio dos artigos.

### 3.1 CTAs disponiveis

| ID (`type`) | Titulo | Link |
|-------------|--------|------|
| `diagnostico` | "Sua empresa esta pronta para IA?" | /diagnostico |
| `carreira` | "Quer virar Arquiteto de IA?" | /carreira |
| `roi` | "Calcule o ROI da IA na sua empresa" | /calculadora |
| `newsletter` | "Receba insights exclusivos" | /newsletter |
| `consultoria` | "Precisa de ajuda personalizada?" | /consultoria |

### 3.2 Como inserir

```mdx
---
title: "Meu Artigo"
# ...
---

import CTABlock from '@/components/mdx/CTABlock.astro'

## Secao do artigo

Texto...

<CTABlock type="diagnostico" variant="banner" />

## Outra secao

Mais texto...

<CTABlock type="newsletter" variant="strip" />
```

### 3.3 Variantes visuais

| Variante | Visual | Quando usar |
|----------|--------|-------------|
| `banner` | Card grande com gradiente, badge, botao centralizado | Antes da conclusao, momentos de alta intencao |
| `strip` | Faixa horizontal compacta | Entre secoes, menos intrusivo |

### 3.4 Criar um novo CTA

Crie um arquivo JSON em `apps/blog/src/content/ctas/`:

```json
{
  "headline": "Titulo do CTA",
  "description": "Descricao curta explicando o valor.",
  "buttonText": "Texto do Botao →",
  "link": "/pagina-destino",
  "emoji": "🎯",
  "badge": "Gratuito",
  "trackingType": "meu_cta_tracking"
}
```

O nome do arquivo (sem `.json`) e o ID usado no `type`:

```
webinar.json  →  <CTABlock type="webinar" />
```

### 3.5 Campos do CTA

| Campo | Descricao |
|-------|-----------|
| `headline` | Titulo principal do CTA |
| `description` | Texto de apoio (1-2 frases) |
| `buttonText` | Texto do botao (inclua → no final) |
| `link` | URL de destino (relativa ou absoluta) |
| `emoji` | Emoji exibido antes do headline na variante strip |
| `badge` | Tag exibida no canto superior direito (variante banner) |
| `trackingType` | Identificador para GTM/analytics |

---

## 4. Categorias

### 4.1 Categorias existentes

| Slug | Nome exibido | Icone |
|------|-------------|-------|
| `ia-negocios` | IA & Negocios | briefcase |
| `carreira-formacao` | Carreira & Formacao | graduation-cap |
| `mercado-tendencias` | Mercado & Tendencias | trending-up |
| `agentes-automacao` | Agentes & Automacao | bot |

### 4.2 Criar nova categoria

Crie um JSON em `apps/blog/src/content/categories/`:

```json
{
  "slug": "dados-analytics",
  "name": "Dados & Analytics",
  "description": "Analise de dados e business intelligence com IA",
  "articleCount": 0,
  "icon": "bar-chart"
}
```

O slug do arquivo deve coincidir com o campo `slug` interno.

### 4.3 Icones disponiveis

Mapeamento em `ArticleCard.astro`:

| Valor do `icon` | Icone Lucide |
|-----------------|-------------|
| `briefcase` | Maleta |
| `graduation-cap` | Chapeu de formatura |
| `trending-up` | Grafico subindo |
| `bot` | Robo |

Para adicionar novos icones, edite o `iconMap` em `ArticleCard.astro`.

---

## 5. Autores

### 5.1 Autor existente

| ID | Nome |
|----|------|
| `jonas-kessler` | Jonas S. Kessler |

### 5.2 Criar novo autor

**Passo 1:** Coloque o avatar em `apps/blog/src/content/authors/images/`:

```
apps/blog/src/content/authors/images/maria-silva.jpg   (400x400px)
```

**Passo 2:** Crie o JSON em `apps/blog/src/content/authors/`:

```json
{
  "name": "Maria Silva",
  "role": "Head de IA, Zoryon",
  "bio": "Especialista em automacao com 10 anos de experiencia.",
  "avatar": "./images/maria-silva.jpg",
  "linkedin": "https://linkedin.com/in/maria-silva"
}
```

**Passo 3:** Use no artigo:

```yaml
author: "maria-silva"
```

---

## 6. SEO (Automatico)

### 6.1 O que funciona automaticamente

| Recurso | Componente | Descricao |
|---------|-----------|-----------|
| Meta tags | `SEO.astro` | title, description, robots, canonical |
| Open Graph | `SEO.astro` | og:title, og:description, og:image, og:url |
| Twitter Card | `SEO.astro` | summary_large_image |
| JSON-LD Article | `JsonLd.astro` | Schema Article (titulo, autor, data, imagem) |
| JSON-LD Breadcrumb | `JsonLd.astro` | Home > Categoria > Artigo |
| Sitemap | `@astrojs/sitemap` | Gera sitemap-index.xml automaticamente |
| robots.txt | `pages/robots.txt.ts` | Allow all + link para sitemap |
| Canonical URL | `SEO.astro` | Baseada no path da pagina |

### 6.2 O que depende de voce (frontmatter)

| Campo | Impacto SEO |
|-------|-------------|
| `title` | Aparece no `<title>` e `og:title` do Google |
| `excerpt` | Aparece no `<meta description>` e `og:description` |
| `coverImage` | Usada no `og:image` (compartilhamento social) |
| `publishedAt` | Google prioriza conteudo recente |
| Nome do arquivo | Vira o slug da URL (permanente e indexado) |

### 6.3 Boas praticas

1. **Titulo**: 50-60 caracteres com keyword principal
2. **Excerpt**: 120-160 caracteres, funciona como meta description
3. **Slug**: Palavras-chave separadas por hifen (`como-implementar-ia-financeiro`)
4. **Headings**: Use `##` (H2) e `###` (H3) hierarquicamente
5. **Alt text**: Descreva a imagem com contexto real
6. **Links internos**: Linke para outros artigos do blog quando relevante

### 6.4 Imagens otimizadas (impacto direto no SEO)

O sistema de imagens gera automaticamente:

- **WebP**: formato 30-90% menor que JPEG (melhor LCP)
- **srcset responsivo**: navegador escolhe o tamanho ideal
- **width/height**: previne CLS (Cumulative Layout Shift)
- **lazy loading**: imagens fora da viewport carregam sob demanda

Tudo isso melhora Core Web Vitals, que o Google usa como fator de ranking.

### 6.5 Verificacao

- **Rich Results**: https://search.google.com/test/rich-results
- **OG Debugger**: https://developers.facebook.com/tools/debug/
- **Sitemap**: acesse `/sitemap-index.xml` apos build

---

## 7. Todas as Rotas

### 7.1 Paginas

| Rota | Arquivo | Descricao |
|------|---------|-----------|
| `/` | `pages/index.astro` | Home: hero + rails por categoria + mais lidos |
| `/blog` | `pages/blog/[...page].astro` | Todos os artigos com paginacao |
| `/blog/2` | (mesmo) | Paginas subsequentes (geradas automaticamente) |
| `/artigo/[slug]` | `pages/artigo/[slug].astro` | Artigo individual (MDX renderizado) |
| `/categorias` | `pages/categorias/index.astro` | Grid de todas as categorias |
| `/categorias/[slug]` | `pages/categorias/[slug].astro` | Artigos de uma categoria |
| `/sobre` | `pages/sobre.astro` | Pagina institucional |
| `/contato` | `pages/contato.astro` | Formulario de contato |

### 7.2 Arquivos gerados

| Rota | Descricao |
|------|-----------|
| `/sitemap-index.xml` | Sitemap para Google |
| `/robots.txt` | Regras de crawling |

### 7.3 Criar nova pagina

Crie um `.astro` em `apps/blog/src/pages/`:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro'
import PageHero from '@/components/PageHero.astro'
---

<BaseLayout title="Servicos | Zoryon" description="Nossos servicos" path="/servicos">
  <PageHero title="Servicos" subtitle="O que fazemos" />
  <div class="max-w-4xl mx-auto px-6 py-16">
    <p>Conteudo...</p>
  </div>
</BaseLayout>
```

Rota gerada: `/servicos`

---

## 8. Exemplo Completo de Artigo

```mdx
---
title: "Como a IA pode transformar o financeiro da sua empresa"
excerpt: "Descubra como automatizar processos financeiros e reduzir custos operacionais em ate 60%."
coverImage: "./images/ia-financeiro-transformacao.jpg"
category: "ia-negocios"
author: "jonas-kessler"
publishedAt: "2025-07-01"
readingTime: "10 min"
featured: false
---

import ImageBlock from '@/components/mdx/ImageBlock.astro'
import CTABlock from '@/components/mdx/CTABlock.astro'
import grafico from './images/grafico-custos.jpg'

A automacao financeira com IA nao e mais futuro — e presente.

## O cenario atual

Empresas brasileiras gastam em media 40% do tempo em tarefas financeiras manuais.
Isso inclui conciliacao bancaria, classificacao de despesas e previsao de fluxo de caixa.

<ImageBlock
  src={grafico}
  alt="Grafico mostrando reducao de custos com IA"
  caption="Reducao media de custos apos automacao (Fonte: McKinsey 2024)"
  size="medium"
/>

## Solucoes praticas

Tres areas com impacto imediato:

1. **Conciliacao bancaria** — Reducao de 80% no tempo
2. **Previsao de fluxo de caixa** — Acuracia de 95%
3. **Deteccao de fraudes** — Monitoramento em tempo real

<CTABlock type="diagnostico" variant="strip" />

## Caso real

Implementamos agentes de IA no financeiro de uma empresa de logistica:

```python title="agente-conciliacao.py" {3-5}
from agentes import ConciliacaoAgent

agent = ConciliacaoAgent(
    banco="itau",
    erp="totvs"
)
resultado = agent.executar()
print(f"Conciliados: {resultado.total}")
```

O resultado: **R$380 mil** em discrepancias identificadas no primeiro mes.

## Conclusao

A transformacao financeira com IA comeca com diagnostico, nao com ferramenta.

<CTABlock type="consultoria" variant="banner" />
```

---

## 9. Checklist para Publicar

- [ ] Arquivo `.mdx` criado em `src/content/articles/`
- [ ] Imagem de capa em `src/content/articles/images/` (1200x600px)
- [ ] Todos os campos do frontmatter preenchidos
- [ ] `category` e `author` correspondem a IDs existentes
- [ ] Data no formato `YYYY-MM-DD`
- [ ] `draft: false` (ou omitido)
- [ ] `pnpm --filter @zoryon/blog dev` — verificacao visual ok
- [ ] `pnpm --filter @zoryon/blog build` — build sem erros
- [ ] Commit e push

---

## 10. Referencia Rapida de Colecoes

### Schemas (content.config.ts)

**Articles** (MDX):
```
title, excerpt, coverImage (image), category, author,
publishedAt (YYYY-MM-DD), readingTime, featured?, draft?
```

**Categories** (JSON):
```
slug, name, description, articleCount, icon
```

**Authors** (JSON):
```
name, role, bio, avatar (image), linkedin
```

**CTAs** (JSON):
```
headline, description, buttonText, link, emoji, badge, trackingType
```

### Helpers disponiveis (lib/content.ts)

| Funcao | Retorno |
|--------|---------|
| `getArticles()` | Todos artigos (nao-draft), ordenados por data |
| `getArticleBySlug(slug)` | Artigo unico por slug |
| `getFeaturedArticle()` | Artigo com `featured: true` (ou mais recente) |
| `getArticlesByCategory(slug)` | Artigos de uma categoria |
| `getCategories()` | Todas categorias |
| `getCategoryBySlug(slug)` | Categoria unica |
| `getAuthorById(id)` | Autor unico |
| `getCtaById(id)` | CTA unico |
| `getRelatedArticles(catSlug, articleId, limit?)` | Artigos relacionados |
| `getMostRead()` | Top 5 artigos (por data, simulado) |
