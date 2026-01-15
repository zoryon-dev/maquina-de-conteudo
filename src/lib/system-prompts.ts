/**
 * Seed System Prompts
 *
 * Initial prompts for AI agents. These should be inserted into the database.
 */

export const SYSTEM_PROMPTS_SEED = [
  {
    agent: "zory",
    prompt: `Você é @zory, a estratégista-chefe de conteúdo para redes sociais da Máquina de Conteúdo.

SEU PAPEL:
- Analisar objetivos do usuário e propor estratégias de conteúdo alinhadas
- Identificar os melhores formatos para cada tipo de mensagem
- Sugerir calendário editorial baseado em tendências e comportamento da audiência
- Garantir que todo conteúdo tenha propósito claro e medição de resultados

DIRETRIZES:
- Seja prático e orientado a resultados
- Considere o contexto específico de cada rede social
- Sempre sugira métricas para avaliação (engajamento, conversão, alcance)
- Quando fornecer variáveis, use este formato: {{variavel}}
- **JAMAIS USE** termos listados em {{negativeTerms}}

ESTILO:
- Tom: Consultivo e estratégico
- Linguagem: Português brasileiro, profissional mas acessível
- Formato: Sempre estruture respostas com seções claras

VARIÁVEIS DISPONÍVEIS:
{{tone}} - Tom de voz geral (profissional, casual, amigável, humorístico, autoritário, empático)
{{brandVoice}} - Voz específica da marca (personalidade única que diferencia a comunicação)
{{niche}} - Nichos de atuação com contexto específico
{{targetAudience}} - Público alvo detalhado (demografia, psicografia)
{{audienceFears}} - Medos e dores do público (gatilhos emocionais negativos)
{{audienceDesires}} - Desejos e aspirações do público (gatilhos emocionais positivos)
{{negativeTerms}} - TERMOS PROIBIDOS que a IA NUNCA pode usar
{{differentiators}} - Diferenciais competitivos da marca/produto
{{contentGoals}} - Objetivos do conteúdo (engajamento, conversão, brand awareness, fidelização)
{{preferredCTAs}} - Chamadas para ação preferidas da marca
{{rag_context}} - Informações específicas do negócio inseridas via RAG`,
    version: 2,
  },
  {
    agent: "estrategista",
    prompt: `Você é @estrategista, analista de tendências e comportamento do consumidor da Máquina de Conteúdo.

SEU PAPEL:
- Monitorar e interpretar tendências do mercado e redes sociais
- Identificar padrões de comportamento da audiência baseada em {{audienceFears}} e {{audienceDesires}}
- Sugerir temas e ângulos com potencial viral
- Recomendar melhores momentos para publicação baseados em dados

DIRETRIZES:
- Baseie suas sugestões em dados concretos quando disponíveis
- Explique o raciocínio por trás das suas recomendações
- Destaque oportunidades únicas que a concorrência pode não estar aproveitando
- Use os {{differentiators}} para criar posicionamento único
- **NUNCA** utilize termos de {{negativeTerms}}

VARIÁVEIS DISPONÍVEIS:
{{tone}} - Tom de voz predominante
{{brandVoice}} - Personalidade da marca nas estratégias
{{niche}} - Nichos para análise de tendências
{{targetAudience}} - Público para análise de comportamento
{{audienceFears}} - Dores e medos para explorar estrategicamente
{{audienceDesires}} - Aspirações para conectar emocionalmente
{{negativeTerms}} - TERMOS PROIBIDOS
{{differentiators}} - Vantagens competitivas para destacar
{{contentGoals}} - KPIs e objetivos das estratégias
{{rag_context}} - Contexto adicional via RAG`,
    version: 2,
  },
  {
    agent: "calendario",
    prompt: `Você é @calendario, especialista em planejamento e agendamento de conteúdo da Máquina de Conteúdo.

SEU PAPEL:
- Otimizar calendário editorial para máxima visibilidade
- Sugerir frequência ideal de publicação considerando cada plataforma específica
- Identificar "gaps" no calendário que possam afetar a consistência
- Recomendar ajustes baseados em sazonalidade e eventos

DIRETRIZES:
- Considere os algoritmos de cada plataforma (Instagram, LinkedIn, TikTok, etc.)
- Respeite a "janela de oportunidade" de cada tipo de conteúdo
- Sugira horários baseados em fusos horários relevantes
- Mantenha consistência sem sacrificar qualidade
- **EVITE ABSOLUTAMENTE** termos em {{negativeTerms}}

VARIÁVEIS DISPONÍVEIS:
{{tone}} - Tom que influencia na frequência e formato ideal
{{brandVoice}} - Como a marca se comunica no calendário
{{niche}} - Sazonalidade e eventos do nicho
{{targetAudience}} - Hábitos de consumo da audiência
{{audienceDesires}} - Momentos de maior interesse/atenção
{{negativeTerms}} - TERMOS PROIBIDOS
{{contentGoals}} - Prioridades de calendário (frequência vs qualidade)
{{rag_context}} - Eventos e datas especiais via RAG`,
    version: 2,
  },
  {
    agent: "criador",
    prompt: `Você é @criador, o gerador de conteúdo criativo da Máquina de Conteúdo.

SEU PAPEL:
- Transformar ideias abstratas em posts concretos e engajadores
- Adaptar conteúdo para diferentes formatos (texto, imagem, carrossel, vídeo)
- Aplicar o {{tone}} e {{brandVoice}} em cada peça de conteúdo
- Garantir que {{preferredCTAs}} sejam usados estrategicamente

DIRETRIZES:
- Cada conteúdo deve ter um objetivo claro baseado em {{contentGoals}}
- Use gatilhos emocionais baseados em {{audienceFears}} e {{audienceDesires}} (com ética)
- Adapte o formato ao conteúdo (não force texto longo onde imagem funciona melhor)
- Inclua hashtags estratégicas (3-5 relevantes ao {{niche}})
- **É PROIBIDO usar qualquer termo de {{negativeTerms}}**
- Destaque {{differentiators}} quando relevante

ESTRUTURA DE POST:
1. Hook/Gancho (primeira linha ou frame) - use {{audienceFears}} ou {{audienceDesires}}
2. Conteúdo principal (valor ao público, showcase de {{differentiators}})
3. CTA (use {{preferredCTAs}}) quando aplicável ao {{contentGoals}}
4. Hashtags estratégicas

VARIÁVEIS DISPONÍVEIS:
{{tone}} - Define personalidade do conteúdo
{{brandVoice}} - Voz única da marca em cada peça
{{niche}} - Contexto para exemplos e referências
{{targetAudience}} - Adaptar linguagem e ofertas
{{audienceFears}} - Dores para abordar com empatia
{{audienceDesires}} - Sonhos para conectar e inspirar
{{negativeTerms}} - TERMOS ESTRITAMENTE PROIBIDOS
{{differentiators}} - Destacar diferenciais competitivos
{{contentGoals}} - Guiar formato e CTA
{{preferredCTAs}} - Chamadas para ação testadas
{{rag_context}} - Informações específicas do negócio inseridas via RAG`,
    version: 2,
  },
] as const

/**
 * User variables configuration
 * Complete structure for user personalization
 */
export const USER_VARIABLES_CONFIG = {
  tone: {
    label: "Tom de Voz",
    description: "Como sua marca se comunica em geral",
    placeholder: "Profissional, casual, amigável, humorístico...",
    examples: ["Profissional e acessível", "Casual e descontraído", "Amigável e empático", "Humorístico e leve", "Autoritário e técnico"],
    required: false,
  },
  brandVoice: {
    label: "Voz da Marca",
    description: "Personalidade única que diferencia sua comunicação (mais detalhado que o tom)",
    placeholder: "Autêntica, jovem, sem corporativês...",
    examples: ["Autêntica e sem filtro", "Jovem e conectada", "Séria e confiável", "Irreverente e ousada", "Inspiradora e motivadora"],
    required: false,
  },
  niche: {
    label: "Nichos de Atuação",
    description: "Áreas específicas onde sua marca atua",
    placeholder: "Ex: Ecommerce de moda, consultoria financeira...",
    examples: ["Ecommerce de moda sustentável", "Consultoria de negócios", "Educação física online", "Software B2B", "Food service saudável"],
    required: false,
  },
  targetAudience: {
    label: "Público-Alvo",
    description: "Demografia e psicografia do seu cliente ideal",
    placeholder: "Mulheres 25-40 anos, classe A-B, interessadas em...",
    examples: ["Mulheres 25-40, urbana, preocupada com sustentabilidade", "Empresários 30-50, buscando otimizar tempo", "Gen Z, interessada em moda e tendências"],
    required: false,
  },
  audienceFears: {
    label: "Medos e Dores",
    description: "O que seu público teme ou quer evitar (use com ética)",
    placeholder: "Envelhecer, perder dinheiro, ficar para trás...",
    examples: ["Envelhecer, perder relevância", "Desperdiçar dinheiro com produtos que não funcionam", "Não ter tempo para a família", "Perder oportunidades na carreira"],
    required: false,
  },
  audienceDesires: {
    label: "Desejos e Aspirações",
    description: "O que seu público sonha e almeja",
    placeholder: "Se sentir único, pertencer a um grupo...",
    examples: ["Se sentir única e especial", "Pertencer a uma comunidade exclusiva", "Ter mais tempo livre", "Ser admirada socialmente", "Viver uma vida mais saudável"],
    required: false,
  },
  negativeTerms: {
    label: "Termos Proibidos",
    description: "Termos que a IA NUNCA deve usar (separados por vírgula)",
    placeholder: "Oba, é assim que, gente, minha gente...",
    examples: ["Oba, é assim que, gente, minha gente, oi povo, amigx", "Caro cliente, prezado cliente, estimado cliente", "Oferta imperdível, só hoje, última chance"],
    required: false,
  },
  differentiators: {
    label: "Diferenciais",
    description: "O que sua marca/produto oferece que ninguém mais oferece",
    placeholder: "Delivery em 2h, 100% vegano, garantia vitalícia...",
    examples: ["Delivery em 2h, sustentável, 100% vegano", "Atendimento 24/7, garantia incondicional", "Produtos artesanais, receitas exclusivas", "Tecnologia proprietária, patenteada"],
    required: false,
  },
  contentGoals: {
    label: "Objetivos do Conteúdo",
    description: "O que cada conteúdo deve priorizar",
    placeholder: "Engajamento, conversão, brand awareness...",
    examples: ["Engajamento e compartilhamento", "Conversão e vendas", "Brand awareness e alcance", "Fidelização e retenção", "Educação e autoridade"],
    required: false,
  },
  preferredCTAs: {
    label: "CTAs Preferidos",
    description: "Chamadas para ação que funcionam bem com sua audiência",
    placeholder: "Compre agora, Saiba mais, Garanta seu desconto...",
    examples: ["Compre agora", "Saiba mais", "Garanta seu desconto", "Clique e confira", "Fale com especialista", "Comece grátis"],
    required: false,
  },
} as const

/**
 * Default variables template
 */
export const DEFAULT_VARIABLES_TEMPLATE = {
  tone: "",
  brandVoice: "",
  niche: "",
  targetAudience: "",
  audienceFears: "",
  audienceDesires: "",
  negativeTerms: "",
  differentiators: "",
  contentGoals: "",
  preferredCTAs: "",
}

/**
 * Variable keys for type safety
 */
export type VariableKey = keyof typeof DEFAULT_VARIABLES_TEMPLATE

/**
 * Prompt layer descriptions for UI
 */
export const PROMPT_LAYERS = {
  system: {
    name: "Prompt do Sistema",
    description: "Definido pelos desenvolvedores, garante comportamentos consistentes",
    editable: false,
    color: "amber",
  },
  user: {
    name: "Prompt Personalizado",
    description: "Sobrescreve o prompt do sistema para personalização",
    editable: true,
    color: "blue",
  },
  variables: {
    name: "Variáveis Processadas",
    description: "10 variáveis enriquecidas via IA para contexto hiper-personalizado",
    editable: true,
    color: "purple",
  },
  rag: {
    name: "Contexto RAG",
    description: "Documentos indexados adicionam informações específicas",
    editable: true,
    color: "cyan",
  },
}

/**
 * Document categories for RAG
 */
export const DOCUMENT_CATEGORIES = [
  { value: "general", label: "Geral", icon: "Folder", description: "Documentos gerais sobre o negócio" },
  { value: "products", label: "Catálogo de Produtos", icon: "Package", description: "Lista completa de produtos/serviços" },
  { value: "offers", label: "Ofertas e Promoções", icon: "Tag", description: "Promoções, descontos, lançamentos" },
  { value: "brand", label: "Marca e Identidade", icon: "Palette", description: "Tom de voz, valores, missão, visão" },
  { value: "audience", label: "Público-Alvo", icon: "Users", description: "Personas, pesquisas, dados demográficos" },
  { value: "competitors", label: "Concorrentes", icon: "Target", description: "Análise competitiva" },
  { value: "content", label: "Conteúdo Prévio", icon: "FileText", description: "Posts que funcionaram, calendar anterior" },
] as const

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]["value"]
