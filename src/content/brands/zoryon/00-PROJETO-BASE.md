# Zoryon V2 — Documento Base do Projeto

> Última atualização: 2026-04-11
> Status: Em construção — Fase de Discovery concluída

---

## 1. Contexto e Motivação

A Zoryon V1 operou como um negócio disperso: gestão de tráfego, co-produção, automações, consultoria e desenvolvimento de SaaS — tudo ao mesmo tempo, sem posicionamento claro. O resultado foi paralisia operacional por ~6 meses, sem execução relevante, sem presença digital, sem identidade de mercado definida.

A Zoryon V2 nasce da decisão consciente de recomeçar do zero com foco, simplicidade e um posicionamento claro.

**Problema central da V1:** dispersão. Tentar fazer tudo resultou em não fazer nada. O mercado nunca entendeu o que a Zoryon é porque a Zoryon nunca disse quem é.

**Risco atual:** dependência financeira de um único cliente (Prof. Salomão via co-produção). Se esse contrato encerra sem alternativa, a operação para.

---

## 2. Visão da Zoryon V2

**Em uma frase:**
Agência de Inteligência Artificial para negócios, com braço de educação próprio.

**Visão expandida:**
A Zoryon desenvolve soluções personalizadas de IA para negócios que faturam entre R$100K e R$500K/mês — empresas que já têm maturidade operacional mas precisam escalar sem depender de mais equipe ou mais investimento. Paralelamente, opera um braço educacional que ensina empreendedores a implementar IA nos seus negócios, funcionando como canal de aquisição e linha de receita independente.

**Princípio central:** simplicidade. Poucos movimentos, bem executados.

---

## 3. Identidade

| Item | Definição |
|---|---|
| **Marca** | Zoryon |
| **Razão social** | L&L Cursos e Treinamentos LTDA |
| **CNPJ** | 54.911.340/0001-01 |
| **Braço de educação** | Zoryon Education (ou variação — mesmo guarda-chuva) |
| **Fundador** | Jonas Silva |
| **Operação** | Solo + agentes de IA (Claude Code, automações) |
| **Localização** | Campina Grande, PB — Brasil |
| **Fuso** | BRT (UTC-3) |

---

## 4. Modelo de Negócio

### 4.1 Motores de Receita

A Zoryon V2 opera com **dois motores principais** e um **produto paralelo**:

**Motor 1 — Serviços de IA (receita por projeto/recorrência)**
Implementação de soluções de IA personalizadas para negócios:
- Agentes conversacionais (WhatsApp, chat, atendimento)
- Automação de processos com IA
- Análise de dados com IA
- Análise de tráfego/campanhas com IA
- Organização e tratamento de dados com IA

Público: negócios que faturam 100-500K/mês, sem restrição de nicho inicial. Autoridade principal vem do mercado de infoprodutos.

**Motor 2 — Educação / Zoryon Education (receita por venda de curso)**
Cursos e treinamentos de IA para empreendedores:
- Foco: empreendedores querendo implementar IA no negócio (agências, lojas, serviços, etc.)
- Funciona como canal de aquisição para serviços E como linha de receita independente
- Formato e primeiro curso: a definir (Fase 2)
- Plataforma de venda: a definir (Hotmart é o ecossistema já dominado)

**Produto paralelo — TrackGo**
SaaS de tracking para infoprodutores. Está quase pronto, falta ajustes finais. Roda em paralelo sem competir por atenção com os motores principais.

### 4.2 O Que Morre

| Item | Status | Timeline |
|---|---|---|
| Gestão de tráfego pago (clientes) | Encerrar contratos | Próximos 12 meses |
| Co-produção (exceto Salomão) | Não aceitar novos | Imediato |
| AdInsights como produto | Vira ferramenta interna | Imediato |
| MailFlow AI como produto | Vira ferramenta interna | Imediato |

### 4.3 O Que Sustenta a Transição

| Fonte | Papel |
|---|---|
| Co-produção com Prof. Salomão | Renda principal durante transição |
| Contratos de tráfego ativos | Renda complementar (encerra em até 12 meses) |
| Serviços pontuais | Receita variável |

### 4.4 Prioridade de Geração de Receita V2

1. **Cursos** — mais rápido de vender, ticket mais baixo, escala digital
2. **Serviços de IA** — ticket mais alto, precisa de processo comercial definido
3. **TrackGo** — receita recorrente (SaaS), roda em paralelo

---

## 5. Público-Alvo (visão inicial)

### Para Serviços
- Negócios que faturam R$100K-500K/mês
- Já têm maturidade operacional
- Precisam escalar sem aumentar equipe
- Sem restrição de nicho, mas autoridade inicial no mercado de infoprodutos
- Exemplos: infoprodutores, agências, e-commerces, prestadores de serviço

### Para Educação
- Empreendedores querendo implementar IA no negócio
- Profissionais querendo evoluir dentro da empresa
- Sem restrição de nicho — pode ser dono de agência, loja, consultoria
- Ticket mais acessível, volume maior

> **Nota:** avatares detalhados serão construídos na Fase 1, Documento 3.

---

## 6. Presença Digital (estado atual e plano)

### Estado Atual
- Site: inexistente
- Redes sociais: sem atividade
- Blog: inexistente
- YouTube: sem canal ativo
- Base de leads: zero

### Plano de Presença

| Canal | Papel | Frequência/Modelo |
|---|---|---|
| **Site institucional** | Hub central — serviços, educação, diagnóstico, blog | Páginas fixas + blog |
| **YouTube** | Conteúdo educacional, autoridade, SEO | 1 vídeo/semana |
| **Instagram** | Presença social, carrossel automatizado | Automação de conteúdo |
| **Blog** | SEO, conteúdo automatizado, atração orgânica | Conteúdo automatizado com IA |
| **Páginas de captura** | Conversão de leads para educação e diagnóstico | Sob demanda por campanha |

---

## 7. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend/Site | Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui |
| Banco de dados | Neon (PostgreSQL serverless) |
| Auth | Clerk |
| Automação | n8n |
| WhatsApp | WAHA |
| IA | Claude API (Anthropic) |
| Email marketing | Brevo |
| Produto digital | Hotmart |
| Deploy | Vercel, DigitalOcean (servidor `zory`) |
| Design | Figma |
| Produtividade | TickTick, Google Calendar, Notion |

---

## 8. Operação

- **Equipe:** solo + agentes de IA (Claude Code, automações n8n, WAHA)
- **Equipe humana:** plano futuro, não imediato
- **Primeiro perfil a contratar (quando for hora):** a definir
- **Processos automatizados:** conteúdo para blog, carrossel Instagram, análises recorrentes

---

## 9. Competidores e Referências

| Nome | Relação |
|---|---|
| Viver de IA | Concorrente direto no braço educacional |
| Agências de IA genéricas | Concorrentes no braço de serviços |

> **Nota:** análise competitiva detalhada será feita na Fase 1 ou 2.

---

## 10. Decisões Já Tomadas

1. Marca Zoryon permanece. Razão social L&L permanece.
2. Braço de educação roda sob "Zoryon Education" (mesmo guarda-chuva).
3. Gestão de tráfego será encerrada nos próximos 12 meses.
4. Co-produção com Salomão é mantida como sustento da transição.
5. TrackGo segue em paralelo (quase pronto).
6. AdInsights e MailFlow AI viram ferramentas internas.
7. Operação solo + IA. Equipe humana é futuro.
8. Presença digital começa do zero.
9. Simplicidade é princípio — poucos movimentos, bem executados.
10. Cursos são a primeira via de receita da V2.
