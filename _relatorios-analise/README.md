# Auditoria Técnica — Máquina de Conteúdo

**Data:** 12 de fevereiro de 2026
**Escopo:** Pipeline de RAG, variáveis de usuário, editores visuais e geradores de imagem

---

## Sumário Executivo Geral

Esta auditoria analisou dois eixos fundamentais da Máquina de Conteúdo:

**Eixo A — RAG e Variáveis de Usuário:** O sistema possui um pipeline de RAG funcional (Voyage AI → chunking → busca semântica → montagem de contexto) e um sistema de variáveis de personalização com 10 dimensões (tom, marca, público, etc.). A principal lacuna é que as variáveis são utilizadas **apenas no Wizard**, ficando ausentes no chat com agentes e no Creative Studio. Além disso, a busca vetorial é feita em JavaScript (O(n)), o que limita a escalabilidade.

**Eixo B — Editores e Geradores de Imagem:** O ecossistema de criação inclui Wizard (narrativas tribais), Creative Studio (geração de imagem) e Editor Visual (carrosséis). Cada componente funciona bem individualmente, mas a **integração entre eles é fraca** — conteúdo do Wizard não flui para o Editor, imagens não incorporam identidade visual da marca, e agentes operam desconectados dos editores.

**Achados transversais:**
- Variáveis do usuário precisam estar presentes em **todos** os pontos de geração de conteúdo
- A busca vetorial precisa migrar para pgvector para sustentar crescimento
- O fluxo criativo precisa de "pontes" entre Wizard, Creative Studio e Editor Visual
- Os prompts dos agentes perdem personalidade quando Zep não está configurado

---

## Índice de Relatórios

### Tema A — RAG e Variáveis de Usuário

| # | Relatório | Tipo | Público | Arquivo |
|---|-----------|------|---------|---------|
| 1 | [Visão Estratégica](./01-RAG-VARIAVEIS-visao-estrategica.md) | Executivo | Stakeholders, PMs, Founders | `01-RAG-VARIAVEIS-visao-estrategica.md` |
| 2 | [Análise Técnica](./02-RAG-VARIAVEIS-analise-tecnica.md) | Técnico | Devs Seniores, Tech Leads | `02-RAG-VARIAVEIS-analise-tecnica.md` |

**Relatório 1** explica em linguagem acessível o que são RAG e variáveis de usuário, como funcionam hoje, quais lacunas estratégicas existem, e propõe uma priorização de investimentos com foco em impacto de produto.

**Relatório 2** mergulha nos detalhes de implementação: fluxo de dados completo do pipeline de RAG, ciclo de vida das variáveis, análise de complexidade algorítmica (busca O(n) em JS), mapa de arquivos com referências de linha, problemas específicos com severity rating, e recomendações técnicas com code snippets.

### Tema B — Editores e Geradores de Imagem

| # | Relatório | Tipo | Público | Arquivo |
|---|-----------|------|---------|---------|
| 3 | [Visão Estratégica](./03-EDITORES-IMAGEM-visao-estrategica.md) | Executivo | Stakeholders, PMs, Founders | `03-EDITORES-IMAGEM-visao-estrategica.md` |
| 4 | [Análise Técnica](./04-EDITORES-IMAGEM-analise-tecnica.md) | Técnico | Devs Seniores, Tech Leads | `04-EDITORES-IMAGEM-analise-tecnica.md` |

**Relatório 3** mapeia o ecossistema de criação (Wizard, Creative Studio, Editor Visual, Agentes) sob uma perspectiva de jornada do usuário. Identifica a desconexão entre os pilares e propõe uma visão de "fluxo criativo unificado" com roadmap em 3 fases.

**Relatório 4** analisa a implementação de cada componente: geração de narrativas tribais, composição de prompts de imagem, gerenciamento de estado Zustand, sistema de agentes, streaming com Vercel AI SDK. Inclui análise de type safety, patterns de retry, problemas de integração, e recomendações técnicas priorizadas.

---

## Achados Principais por Prioridade

### P0 — Ação Imediata (alto impacto, esforço baixo-médio)

1. **Injetar variáveis do usuário no Chat API route**
   - Arquivo: `src/app/api/chat/route.ts`
   - Relatórios: [1](./01-RAG-VARIAVEIS-visao-estrategica.md#31), [2](./02-RAG-VARIAVEIS-analise-tecnica.md#24)

2. **Injetar variáveis do usuário no Creative Studio**
   - Arquivo: `src/lib/creative-studio/prompt-builder.ts`
   - Relatórios: [1](./01-RAG-VARIAVEIS-visao-estrategica.md#32), [4](./04-EDITORES-IMAGEM-analise-tecnica.md#33)

3. **Preservar personalidade do agente sem Zep**
   - Arquivo: `src/app/api/chat/route.ts`
   - Relatório: [4](./04-EDITORES-IMAGEM-analise-tecnica.md#63)

### P1 — Próximo Trimestre (alto impacto futuro, esforço médio-alto)

4. **Migrar busca vetorial para pgvector**
   - Arquivos: `src/lib/voyage/search.ts`, `src/db/schema.ts`
   - Relatórios: [1](./01-RAG-VARIAVEIS-visao-estrategica.md#33), [2](./02-RAG-VARIAVEIS-analise-tecnica.md#41)

5. **Criar bridge Wizard → Studio**
   - Relatórios: [3](./03-EDITORES-IMAGEM-visao-estrategica.md#43), [4](./04-EDITORES-IMAGEM-analise-tecnica.md#61)

6. **Migrar embeddings de JSON para tipo vector**
   - Relatórios: [1](./01-RAG-VARIAVEIS-visao-estrategica.md#35), [2](./02-RAG-VARIAVEIS-analise-tecnica.md#41)

### P2 — Evolução (impacto médio, esforço variável)

7. Melhorar estimativa de tokens para PT-BR
8. Unificar lista de modelos do Wizard com config central
9. Adicionar persistência ao Creative Studio Store
10. Geração de imagem inline no Editor Visual
11. Integrar agentes com editores via tool calling

---

## Metodologia

A auditoria foi realizada exclusivamente via análise estática do código-fonte, sem execução da aplicação. Foram examinados:

- **Arquivos de configuração:** `package.json`, `CLAUDE.md`, configurações de build
- **Schema do banco de dados:** `src/db/schema.ts` — todas as tabelas e relações
- **Pipeline de RAG:** 8 arquivos em `src/lib/voyage/` e `src/lib/rag/`
- **Sistema de variáveis:** 3 arquivos em `src/lib/wizard-services/` e `src/app/(app)/settings/`
- **Geradores de conteúdo:** 6 arquivos em `src/lib/creative-studio/` e `src/lib/wizard-services/`
- **Editores visuais:** 2 stores Zustand em `src/stores/`
- **Sistema de agentes:** 2 arquivos em `src/lib/agents/` e `src/app/api/chat/`
- **Configuração de IA:** 2 arquivos em `src/lib/ai/`

Total: ~40 arquivos analisados, ~8000+ linhas de código revisadas.

---

## Restrição

**Esta auditoria é estritamente de leitura.** Nenhum arquivo do código-fonte foi modificado. Apenas arquivos de relatório foram criados neste diretório (`_relatorios-analise/`).
