# 10 — Stack e Ferramentas

> Versão: 1.0 (rascunho)
> Data: 2026-04-12
> Status: Validado

---

## Visão Geral

Este documento define toda a infraestrutura tecnológica e operacional da Zoryon V2. Cada ferramenta tem uma função clara. Nada entra no stack "pra testar" — entra porque resolve um problema específico.

**Princípio:** menos ferramentas, mais domínio. A tentação de testar coisas novas é real, mas a Zoryon opera com o que funciona, não com o que é novidade.

---

## Desenvolvimento e Infraestrutura

A stack de desenvolvimento é usada para construir soluções dos clientes, ferramentas internas e o site da Zoryon.

| Ferramenta | Função |
|---|---|
| Next.js | Framework principal (frontend + backend) |
| TypeScript | Linguagem padrão — tipagem em tudo |
| Tailwind CSS | Estilização |
| Neon | Banco de dados PostgreSQL serverless (projetos principais) |
| Supabase | Banco de dados + auth + storage (projetos que pedem) |
| Clerk | Autenticação (quando não usa Supabase Auth) |
| Vercel | Deploy principal (projetos Next.js) |
| DigitalOcean | Infraestrutura de servidores (projetos que exigem) |
| Railway | Deploy alternativo (serviços auxiliares, workers) |

### Editor e terminal

| Ferramenta | Função |
|---|---|
| Cursor | Editor de código principal (com IA integrada) |
| Terminal nativo + Maestri | Linha de comando |

---

## IA e Automação

O core da operação da Zoryon — as ferramentas que permitem entregar setorização por IA.

| Ferramenta | Função |
|---|---|
| Claude (Desktop + Cowork) | Assistente principal de trabalho — planejamento, escrita, análise, produção de conteúdo |
| Claude API | Inteligência dentro das soluções dos clientes (agentes, análise, processamento) |
| n8n | Automação de workflows (casos específicos, mantendo uso reduzido) |
| D-API | API de WhatsApp — comunicação automatizada via WhatsApp para clientes |

---

## Email Marketing e Inbound

| Ferramenta | Função |
|---|---|
| ActiveCampaign | Email marketing da Zoryon: esteiras de nutrição, segmentação, automação, lead scoring |
| Brevo | Mantido para clientes existentes (não para a Zoryon internamente) |

**Por que ActiveCampaign:** melhor automação de esteiras e segmentação do mercado. Essencial para o inbound marketing que a Zoryon V2 precisa — nutrição inteligente, lead scoring, sequências segmentadas por comportamento.

---

## CRM e Gestão de Clientes

| Ferramenta | Função | Estágio |
|---|---|---|
| Notion | CRM simples — pipeline de leads, acompanhamento de clientes, base de informações | Agora |
| CRM sob medida | Dashboard próprio com as métricas e fluxos que a Zoryon precisa | Futuro (após 3-4 clientes ativos) |

**Decisão:** começar com Notion como CRM. É simples, flexível, e resolve o problema de 0 a 5 clientes sem complexidade. Quando a carteira crescer e as limitações aparecerem, Jonas constrói um CRM sob medida com a stack que já domina.

---

## Produção de Conteúdo

| Ferramenta | Função |
|---|---|
| Claude (Desktop + Cowork) | Roteiros, textos, adaptação de formato, brainstorming, SEO |
| Figma | Design de carrosséis, materiais visuais, identidade |
| Canva | Design rápido, templates, formatos que não precisam de Figma |
| Whisper | Transcrição de fala em texto — Jonas fala, a IA transcreve, o conteúdo nasce |

### Fluxo de produção

```
Jonas fala (Whisper) → Texto bruto → Claude refina → Figma/Canva formata → Publica
```

A produção de conteúdo diária (1 carrossel/dia + 2 reels/semana + blog) é viável porque IA faz o trabalho operacional. Jonas foca na visão, tom e gravação.

---

## Gestão e Produtividade

| Ferramenta | Função |
|---|---|
| Todoist | Gestão de tarefas diárias e projetos |
| Notion | Base de conhecimento, CRM, documentação de clientes, wiki interna |
| Obsidian | Second brain — notas pessoais, conexões de ideias, pensamento de longo prazo |
| Google Workspace | Email, calendário, documentos compartilhados com clientes |

### Divisão clara

- **Todoist** = o que fazer (tarefas, deadlines, execução)
- **Notion** = o que saber (clientes, processos, documentação, CRM)
- **Obsidian** = o que pensar (ideias, conexões, second brain pessoal)

---

## Reuniões e Comunicação

| Ferramenta | Função |
|---|---|
| Google Meet | Reuniões com clientes (via Google Workspace) |
| Fireflies | Gravação e transcrição automática de reuniões |
| WhatsApp | Comunicação direta com clientes e leads |

---

## Plataforma de Educação

| Ferramenta | Função |
|---|---|
| Hotmart | Vendas e área de membros dos cursos da Zoryon Education |
| Ferramentas sob medida | Eventuais complementos desenvolvidos para o curso (calculadoras, templates, ferramentas práticas) |

---

## Resumo por Categoria

| Categoria | Ferramentas |
|---|---|
| Desenvolvimento | Next.js, TypeScript, Tailwind, Neon, Supabase, Clerk, Vercel, DigitalOcean, Railway |
| Editor | Cursor, Terminal, Maestri |
| IA e Automação | Claude (Desktop/Cowork/API), n8n, D-API |
| Email Marketing | ActiveCampaign (Zoryon), Brevo (clientes) |
| CRM | Notion (agora) → CRM sob medida (futuro) |
| Conteúdo | Claude, Figma, Canva, Whisper |
| Gestão | Todoist, Notion, Obsidian, Google Workspace |
| Comunicação | Google Meet, Fireflies, WhatsApp |
| Educação | Hotmart + ferramentas sob medida |

---

## Regra de Ouro

**Antes de adicionar qualquer ferramenta nova ao stack, responder:**

1. Qual problema específico ela resolve?
2. Alguma ferramenta que já tenho resolve isso?
3. A complexidade que ela adiciona vale o benefício?

Se a resposta do item 2 for "sim" ou do item 3 for "não" — não entra. Simplicidade acima de novidade.
