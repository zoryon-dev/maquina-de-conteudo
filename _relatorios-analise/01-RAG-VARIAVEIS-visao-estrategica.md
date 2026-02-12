# Relatório 1 — RAG e Variáveis de Usuário: Visão Estratégica

**Projeto:** Máquina de Conteúdo
**Data:** 12 de fevereiro de 2026
**Tipo:** Visão Estratégica e Executiva
**Escopo:** Pipeline de RAG (Retrieval-Augmented Generation) e Sistema de Variáveis do Usuário

---

## Sumário Executivo

A Máquina de Conteúdo possui dois sistemas fundamentais que determinam a qualidade e a personalização do conteúdo gerado por inteligência artificial: o **pipeline de RAG** (que permite à IA consultar documentos do usuário antes de responder) e o **sistema de variáveis do usuário** (que carrega informações da marca, público-alvo e tom de voz em cada geração).

A auditoria revelou que ambos os sistemas estão funcionais e bem estruturados em seu núcleo, mas apresentam **lacunas críticas de integração** que reduzem significativamente o retorno sobre o investimento tecnológico. Especificamente, as variáveis do usuário — que representam a "identidade digital" da marca — são utilizadas apenas no Wizard de criação de conteúdo, mas **ignoradas completamente** no chat com agentes e no estúdio criativo de imagens. Além disso, o pipeline de RAG utiliza uma abordagem de busca vetorial que, embora funcione para volumes pequenos, apresentará **gargalos sérios de performance** conforme o número de documentos e usuários crescer.

As recomendações deste relatório focam em três eixos: (1) expandir a presença das variáveis do usuário para todos os pontos de geração de conteúdo, (2) preparar o pipeline de RAG para escala, e (3) criar uma experiência mais integrada entre documentos e personalização.

---

## 1. Contexto de Negócio

### O que é a Máquina de Conteúdo

A Máquina de Conteúdo é um estúdio de criação de conteúdo alimentado por IA, projetado para profissionais de marketing e criadores de conteúdo que precisam produzir posts, carrosséis, imagens e vídeos para redes sociais de forma consistente com sua identidade de marca.

O sistema funciona como um ecossistema integrado onde:

1. **Documentos** (guias de marca, catálogos de produtos, análises de público) são carregados e processados para que a IA "conheça" o negócio do usuário.
2. **Variáveis de personalização** (tom de voz, nicho, público-alvo, medos e desejos da audiência) configuradas uma única vez e aplicadas automaticamente.
3. **Agentes especializados** (Zory, Estrategista, Criador, Calendário) interagem via chat para ajudar na criação.
4. **Wizard de criação** gera conteúdo completo (carrosséis, textos, roteiros de vídeo) usando narrativas tribais inspiradas em Seth Godin.
5. **Estúdio criativo** gera e edita imagens usando modelos de IA.

### Por que RAG e Variáveis são Estratégicos

Esses dois sistemas são o que diferencia a Máquina de Conteúdo de ferramentas genéricas como ChatGPT ou Canva com IA:

- **RAG** permite que a IA produza conteúdo baseado nos documentos reais do negócio — catálogos de produtos, guias de marca, análises de mercado — em vez de conhecimento genérico.
- **Variáveis do usuário** garantem que todo conteúdo gerado mantenha consistência com a identidade da marca, sem que o usuário precise repetir instruções a cada interação.

Juntos, eles transformam uma ferramenta genérica de IA em um **assistente personalizado de marca**.

---

## 2. Estado Atual: O que Funciona Bem

### 2.1. Sistema de Variáveis — Visão Geral

O sistema de variáveis permite que o usuário configure **10 dimensões de personalização**:

| Variável | Propósito |
|----------|-----------|
| Tom (tone) | Define o estilo de comunicação (formal, descontraído, etc.) |
| Voz da Marca (brandVoice) | Personalidade comunicativa única da marca |
| Nicho (niche) | Setor de atuação do negócio |
| Público-alvo (targetAudience) | Quem a marca quer alcançar |
| Medos do público (audienceFears) | Dores e preocupações da audiência |
| Desejos do público (audienceDesires) | Aspirações e objetivos da audiência |
| Termos proibidos (negativeTerms) | Palavras que nunca devem aparecer no conteúdo |
| Diferenciais (differentiators) | O que torna a marca única |
| Objetivos de conteúdo (contentGoals) | Metas estratégicas do conteúdo |
| CTAs preferidos (preferredCTAs) | Chamadas para ação padrão |

Essas variáveis são coletadas através de uma interface intuitiva na página de configurações e armazenadas de forma segura no banco de dados. O sistema de merge no Wizard permite que o usuário **sobreponha** qualquer variável salva com um valor específico para uma geração particular — um padrão de design sofisticado que oferece flexibilidade sem sacrificar conveniência.

### 2.2. Pipeline de RAG — Visão Geral

O pipeline de RAG funciona em quatro etapas:

1. **Upload e Processamento**: Documentos são carregados (PDF, TXT, MD), seu conteúdo é extraído e armazenado.
2. **Chunking Inteligente**: Documentos são divididos em trechos menores com tamanhos otimizados por categoria (produtos: 800 tokens, marca: 1300 tokens, audiência: 1000 tokens).
3. **Geração de Embeddings**: Cada trecho é convertido em um vetor numérico (usando Voyage AI, modelo voyage-4-large, 1024 dimensões) que captura seu significado semântico.
4. **Busca e Montagem de Contexto**: Quando a IA precisa responder, a pergunta do usuário é comparada semanticamente com todos os trechos, e os mais relevantes são incluídos no prompt.

O sistema oferece **7 categorias** de documentos (geral, produtos, ofertas, marca, audiência, concorrentes, conteúdo), permitindo buscas filtradas e contexto mais preciso.

### 2.3. Pontos Fortes Consolidados

**No Wizard de criação**, a integração entre variáveis e RAG é exemplar:
- As variáveis são carregadas automaticamente e mescladas com inputs específicos do momento.
- O contexto de RAG pode ser incluído na geração de conteúdo.
- Termos proibidos são verificados e adicionados ao prompt.
- A filosofia de narrativas tribais (herege, visionário, tradutor, testemunha) cria conteúdo diferenciado.

**No sistema de documentos**, o chunking por categoria é uma decisão inteligente que reconhece que documentos de produto precisam de tratamento diferente de guias de marca.

**A busca híbrida** (combinação de semântica com palavras-chave) melhora a qualidade dos resultados em comparação com busca puramente semântica.

---

## 3. Lacunas Estratégicas Identificadas

### 3.1. Variáveis do Usuário Não Alcançam o Chat — IMPACTO ALTO

**O que acontece:** Quando um usuário conversa com qualquer agente (Zory, Estrategista, Criador, Calendário) no chat, as variáveis de personalização da marca são completamente ignoradas. O agente não sabe qual é o tom de voz da marca, quem é o público-alvo, ou quais termos são proibidos.

**Evidência:** O arquivo `src/app/api/chat/route.ts` (linhas 87-104) define prompts de sistema fixos que não incluem variáveis do usuário. O contexto de RAG é injetado (linhas 200-226), mas as variáveis pessoais não.

**Impacto no negócio:** Um usuário que configurou cuidadosamente suas 10 variáveis de marca recebe respostas genéricas no chat, que é provavelmente a interface mais utilizada da aplicação. Isso cria uma **experiência inconsistente** — o Wizard produz conteúdo personalizado, mas o chat não.

**Recomendação:** Injetar as variáveis do usuário no system prompt do chat, da mesma forma que o Wizard faz. Estima-se que esta mudança tenha **alto impacto percebido pelo usuário** com **esforço de implementação moderado**.

### 3.2. Variáveis do Usuário Não Alcançam o Creative Studio — IMPACTO MÉDIO-ALTO

**O que acontece:** O estúdio criativo de imagens (Creative Studio) gera prompts para modelos de imagem sem considerar as variáveis do usuário. Uma marca com tom "elegante e sofisticado" e público "executivos C-level" recebe imagens com a mesma estética de uma marca com tom "divertido e jovem" e público "adolescentes".

**Evidência:** O arquivo `src/lib/creative-studio/prompt-builder.ts` constrói prompts a partir de presets, templates e input do usuário (linhas 38-125), mas não consulta nem injeta variáveis do banco de dados.

**Impacto no negócio:** Imagens geradas sem contexto de marca exigem mais iterações manuais, reduzem a taxa de aprovação do conteúdo e comprometem a consistência visual da marca.

**Recomendação:** Integrar as variáveis do usuário no prompt builder de imagens, especialmente tom, nicho, público-alvo e diferenciais, para gerar imagens mais alinhadas com a identidade visual.

### 3.3. Pipeline de RAG com Escalabilidade Limitada — IMPACTO FUTURO ALTO

**O que acontece:** A busca semântica carrega **todos** os embeddings do usuário para a memória do servidor e calcula a similaridade em JavaScript, um por um. Isso funciona bem para poucos documentos, mas se torna progressivamente mais lento conforme o volume cresce.

**Evidência:** O arquivo `src/lib/voyage/search.ts` (linhas 106-141) faz `SELECT` de todos os embeddings e calcula `cosineSimilarity()` em loop JavaScript.

**Impacto no negócio:** Usuários com muitos documentos (100+) experimentarão lentidão perceptível nas respostas do chat e do Wizard. Em cenários de crescimento, isso pode se tornar um gargalo crítico de experiência.

**Recomendação:** Migrar para busca vetorial nativa no banco de dados usando pgvector (compatível com Neon PostgreSQL). Isso eliminaria a necessidade de carregar embeddings para memória e reduziria o tempo de busca de O(n) para O(log n).

### 3.4. Estimativa de Tokens Imprecisa — IMPACTO MÉDIO

**O que acontece:** O sistema estima tokens usando uma razão fixa de 4 caracteres por token. Embora razoável para inglês, essa estimativa é menos precisa para português brasileiro, que tende a ter palavras mais longas e acentuação.

**Evidência:** `src/lib/rag/token-budget.ts` (linha 16): `const CHARS_PER_TOKEN = 4`. O comentário reconhece que "Brazilian Portuguese is similar, may vary slightly".

**Impacto no negócio:** Contextos de RAG podem ser subestimados ou superestimados, levando a uso subótimo da janela de contexto do modelo (desperdiçando tokens disponíveis) ou a truncamentos inesperados.

**Recomendação:** Implementar uma estimativa mais precisa usando tokenizadores reais (como `tiktoken` ou similar) ou ajustar o fator para ~3.5 caracteres por token para português.

### 3.5. Embeddings Armazenados como JSON — IMPACTO OPERACIONAL MÉDIO

**O que acontece:** Os vetores de embedding (1024 dimensões) são armazenados como strings JSON no banco de dados, em vez de usar um tipo nativo de vetor. Cada busca requer parsing JSON de potencialmente centenas de vetores.

**Evidência:** `src/lib/voyage/search.ts` (linha 124): `const embedding = JSON.parse(r.embedding) as number[]`.

**Impacto no negócio:** Overhead de processamento desnecessário em cada busca. Impossibilidade de usar índices vetoriais nativos para aceleração.

**Recomendação:** Migrar o campo `embedding` para tipo `vector(1024)` do pgvector. O Neon PostgreSQL já suporta essa extensão nativamente.

---

## 4. Oportunidades de Evolução

### 4.1. "Contexto Unificado" — A Visão de Produto

Imagine um sistema onde, independentemente de como o usuário interage com a Máquina de Conteúdo (chat, wizard, creative studio), toda a inteligência de marca está presente:

- O chat sabe que a marca tem tom descontraído e público jovem.
- O wizard consulta o catálogo de produtos automaticamente.
- O creative studio gera imagens com a estética da marca.
- O calendário sugere horários baseados no comportamento do público-alvo.

Essa visão requer apenas a **extensão dos sistemas já existentes** — não uma reescrita. Os blocos de construção (variáveis, RAG, agents, stores) já estão no lugar certo.

### 4.2. RAG Proativo

Atualmente, o RAG é acionado apenas quando o chat é utilizado. Uma evolução natural seria o **RAG proativo**: o sistema automaticamente busca contexto relevante de documentos ao detectar tópicos na conversa, mesmo que o usuário não peça explicitamente.

### 4.3. Variáveis Dinâmicas

Atualmente, as variáveis são estáticas (configuradas manualmente). Uma evolução seria **variáveis dinâmicas** que se adaptam com base no desempenho do conteúdo — por exemplo, ajustando o tom sugerido com base nos posts que tiveram maior engajamento.

### 4.4. Feedback Loop de RAG

Os documentos mais consultados e os trechos mais utilizados poderiam ser sinalizados para o usuário, criando um **loop de feedback** que incentiva o refinamento da base de conhecimento.

---

## 5. Priorização Recomendada

| Prioridade | Ação | Impacto | Esforço |
|------------|------|---------|---------|
| **P0** | Injetar variáveis do usuário no chat | Alto | Baixo-Médio |
| **P0** | Injetar variáveis do usuário no Creative Studio | Médio-Alto | Baixo |
| **P1** | Migrar busca vetorial para pgvector | Alto (futuro) | Médio-Alto |
| **P1** | Migrar armazenamento de embeddings para tipo vector | Médio | Médio |
| **P2** | Melhorar estimativa de tokens para PT-BR | Médio | Baixo |
| **P2** | Implementar RAG proativo | Médio | Alto |
| **P3** | Variáveis dinâmicas baseadas em performance | Médio-Alto | Alto |
| **P3** | Feedback loop de RAG | Baixo-Médio | Médio |

---

## 6. Riscos e Considerações

### 6.1. Risco de Sobre-engenharia

O sistema atual é funcional e relativamente simples. Ao adicionar complexidade (pgvector, variáveis dinâmicas, etc.), é importante manter o princípio de incrementalidade. Cada melhoria deve ser validada em produção antes de avançar para a próxima.

### 6.2. Custo de API

O Voyage AI cobra por embeddings gerados. Cada re-embedding de documentos existentes (por exemplo, ao mudar modelo) gera custos adicionais. Uma estratégia de versionamento de embeddings pode mitigar re-processamentos desnecessários.

### 6.3. Consistência de Dados

A migração de embeddings de JSON para tipo vector requer uma migração de dados cuidadosa. Recomenda-se um período de transição onde ambos os formatos são suportados.

### 6.4. Privacidade de Dados

As variáveis do usuário contêm informações sensíveis sobre estratégia de marca. Ao expandir sua presença para mais endpoints, é essencial garantir que permaneçam acessíveis apenas ao usuário que as criou (o sistema atual já implementa essa proteção via Clerk auth).

---

## 7. Conclusão

A Máquina de Conteúdo possui uma arquitetura sólida de RAG e personalização que, com ajustes estratégicos de integração, pode se tornar um diferencial competitivo significativo. As lacunas identificadas não são falhas de design — são oportunidades de expansão natural de sistemas que já funcionam bem em seus contextos originais.

A prioridade imediata deve ser **unificar a presença das variáveis do usuário** em todos os pontos de geração de conteúdo. Essa única mudança tem o maior potencial de impacto percebido pelo usuário com o menor investimento técnico.

Em paralelo, a preparação da infraestrutura de RAG para escala (pgvector, tipo vector nativo) protege o produto contra gargalos de crescimento e posiciona a plataforma para recursos avançados como RAG proativo e busca semântica em tempo real.

---

*Relatório gerado via auditoria automatizada do código-fonte. Todas as referências apontam para arquivos e linhas específicas do repositório.*
