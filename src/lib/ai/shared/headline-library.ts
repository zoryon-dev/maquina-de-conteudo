export type HeadlinePattern = {
  /** Identificador estável (snake_case) — usar em referências cross-motor. */
  id: string
  /** Nome amigável, exibível em UI. */
  name: string
  /** Descrição curta (1-2 linhas) do padrão e por que ele funciona. */
  description: string
  /**
   * Template estrutural com placeholders {chave}. Serve como guia — LLM pode
   * adaptar desde que a estrutura narrativa seja preservada.
   */
  structure: string
  /** Média de likes observada nos exemplos do banco BrandsDecoded. */
  avgLikes?: number
  /** 3-5 exemplos REAIS extraídos do banco-de-headlines. */
  examples: string[]
  /**
   * Instrução em PT-BR pronta para ser injetada em prompt de LLM quando se
   * deseja gerar headlines usando este padrão específico.
   */
  generatorInstruction: string
}

const HEADLINE_PATTERNS: HeadlinePattern[] = [
  {
    id: "morte_de_x",
    name: "A Morte / O Fim de X",
    description:
      "Anuncia o colapso de algo que parecia estável. Ativa Fim/Morte/Crise (+119% lift) + curiosidade pela revelação que vem depois dos dois-pontos. Padrão mais forte do banco.",
    structure: "A Morte do {X}: Como {mecanismo} Nos Tornou {consequência}",
    avgLikes: 57000,
    examples: [
      "A Morte do Gosto Pessoal: Como a Dopamina Digital Nos Tornou Indiferentes",
      "A Morte dos Influencers de Lifestyle: Bem-vindos à Nova Era da Criação de Conteúdo no Instagram",
      "O Novo Algoritmo do Instagram em 2026 e o Fim do Criador de Conteúdo",
      "O Fim do Conteúdo Fast Food: Por que Posts Inteligentes estão Voltando a Dominar o Instagram?",
      "A Morte da Rede Social 3.0: Como as Marcas estão Copiando a Netflix para Viralizar na Nova Internet",
    ],
    generatorInstruction:
      "Gere uma headline que anuncia o fim/morte/colapso de algo consolidado, seguida de dois-pontos e uma revelação concreta sobre o mecanismo ou consequência. Evite metáfora vazia — o 'X' que morre precisa ser reconhecível e a segunda parte precisa abrir uma lacuna de curiosidade (como/por que/quem).",
  },
  {
    id: "por_que_geracao_x",
    name: "Por que [Geração] está [Comportamento Inesperado]",
    description:
      "Pergunta que ativa identidade geracional + curiosidade. Funciona por dissonância: geração nomeada agindo contra expectativa comum.",
    structure: "Por que {Geração} Está {Comportamento contraintuitivo}?",
    avgLikes: 28000,
    examples: [
      "Por que os Millennials Estão Sofrendo com Crises de Meia-Idade aos 30 Anos?",
      "Por que a Gen Z Parou de Vestir a Camisa e Começou a Tratar Emprego Como Contrato",
      "A Geração Z encaretou o Brasil: por que os jovens vivem vidas mais chatas que seus pais?",
      "Por que os Millennials se Tornaram Adultos Sem Casa, Tempo ou Propósito?",
      "Investigando a Geração que Transformou Wellness Num Símbolo de Status",
    ],
    generatorInstruction:
      "Nomeie uma geração (Gen Z, Millennials, Boomers, Gen Alpha) e descreva um comportamento que contradiga o estereótipo ou a expectativa. A pergunta precisa deixar implícito que há um mecanismo cultural por trás — não é curiosidade superficial, é diagnóstico geracional.",
  },
  {
    id: "investigando_x",
    name: "Investigando [Fenômeno]",
    description:
      "Tom jornalístico/documental. Posiciona o autor como repórter cultural, não como influenciador. Gera curiosidade por profundidade e legitimidade.",
    structure: "Investigando {fenômeno específico e observável}",
    avgLikes: 18000,
    examples: [
      "Investigando a Ascensão das Festas Diurnas em Coffee Shops",
      "Investigando o Grupo de Pais que Está Criando Seus Filhos com Telefone Fixo",
      "Investigando o Fenômeno Social por Trás dos Graffitis de Banheiro",
      "Investigando Ascensão das Academias de Luxo Como Símbolo de Status",
      "Investigando o Plano Geopolítico da FIFA por Trás do Mundial de Clubes",
    ],
    generatorInstruction:
      "Comece com 'Investigando' e nomeie um fenômeno social/cultural observável com especificidade (local, grupo, prática). Evite abstrações amplas como 'o futuro do trabalho'. O leitor precisa sentir que você vai trazer campo, dado, bastidor — não opinião.",
  },
  {
    id: "nome_marca_revelacao",
    name: "[Nome/Marca] + Revelação Inesperada",
    description:
      "Usa uma referência pop (marca, pessoa, obra) como âncora de atenção e revela algo contraintuitivo que subverte a percepção comum sobre ela.",
    structure: "{Nome/Marca} {ação ou revelação inesperada}: {contexto que aprofunda}",
    avgLikes: 18000,
    examples: [
      "Jaden Smith abriu um restaurante onde ninguém paga: Conheça o novo modelo de negócios que confronta o capitalismo com comida gratuita",
      "Como a Adidas Virou Símbolo da Juventude Soviética no Pós-Comunismo?",
      "O tênis de pai que virou febre entre os jovens: como a New Balance voltou",
      "A Cazé TV, Afinal, é Comandada pela Rede Globo?",
      "Como o Batman Influencia Nossas Escolhas Morais Sem que Percebamos",
    ],
    generatorInstruction:
      "Ancore em uma referência pop específica e reconhecível (marca, celebridade, franquia). A revelação precisa ser surpreendente — algo que contradiga o que o leitor assume sobre aquela referência. Evite referências genéricas ('uma big tech', 'um artista brasileiro').",
  },
  {
    id: "contraste_antitese",
    name: "Contraste / Antítese",
    description:
      "Dois pólos em tensão direta. O cérebro é forçado a resolver a contradição. Funciona com par Velho×Novo, Ideologia×Realidade, Expectativa×Resultado.",
    structure: "{Elemento A} vs. {Elemento B antagônico}: {síntese ou consequência}",
    avgLikes: 22000,
    examples: [
      "Jaden Smith abriu um restaurante onde ninguém paga: o novo modelo que confronta o capitalismo com comida gratuita",
      "Por que a Gen Z Parou de Vestir a Camisa e Começou a Tratar Emprego Como Contrato",
      "O tênis de pai que virou febre entre os jovens brasileiros",
      "Por que livros de ficção ensinam lições melhor do que clássicos da autoajuda?",
      "Faz Sentido Trabalharmos Sem Propósito em um Planeta que Está Derretendo?",
    ],
    generatorInstruction:
      "Construa a headline em torno de dois elementos em oposição explícita. O contraste tem que ser concreto — nada de 'tradição vs. inovação' genérico. Prefira pares onde um dos lados é inesperado dado o outro (ex: 'casamento moderno matou o almoço de domingo').",
  },
  {
    id: "dois_pontos_enquadramento",
    name: "Dois-Pontos: [Enquadramento]: [Hook]",
    description:
      "Fórmula mais versátil do banco. Primeira parte enquadra/rotula, dois-pontos, segunda parte expande com curiosidade concreta. Combina bem com outros padrões (morte, investigando, contraste).",
    structure: "{Enquadramento provocativo}: {Hook que abre lacuna de curiosidade}",
    avgLikes: 40000,
    examples: [
      "A Morte do Gosto Pessoal: Como a Dopamina Digital Nos Tornou Indiferentes",
      "Jaden Smith abriu um restaurante onde ninguém paga: Conheça o novo modelo de negócios que confronta o capitalismo",
      "O Fim do Conteúdo Fast Food: Por que Posts Inteligentes estão Voltando a Dominar o Instagram?",
      "A Morte da Rede Social 3.0: Como as Marcas estão Copiando a Netflix para Viralizar",
      "O fenômeno brasileiro que quebrou o algoritmo: um frei às 4h da manhã virou o streamer mais assistido do país",
    ],
    generatorInstruction:
      "Estruture OBRIGATORIAMENTE com dois-pontos. Parte 1 precisa ter força de manchete independente (reenquadramento, diagnóstico, nomeação). Parte 2 entra como expansão jornalística que promete mecanismo, dado ou caso. Nunca use dois-pontos só decorativo — ele tem que separar duas ideias em tensão.",
  },
  {
    id: "por_que_x_tendencia",
    name: "Por que [X] está [Tendência Surpreendente]",
    description:
      "Pergunta aberta sobre fenômeno emergente. Ativa curiosidade + novidade (+99% lift). Funciona melhor quando a tendência tem especificidade estranha.",
    structure: "Por que {sujeito específico} Está {verbo de movimento/mudança} {desdobramento}?",
    avgLikes: 16000,
    examples: [
      "Por que o Mundo Está (Finalmente) Voltando a Escutar Rock N' Roll?",
      "Por que Empresários Estão Obcecados com o Ironman e Provas de Resistência?",
      "Por que o Jiu-Jitsu Está se Tornando o Esporte Favorito das Celebridades?",
      "Por que os Corredores Estão se Tornando os Creators Mais Influentes do Brasil?",
      "Por que a Filosofia Clássica Será o Grande Diferencial na Era da Inteligência Artificial?",
    ],
    generatorInstruction:
      "Comece com 'Por que' e descreva uma mudança de comportamento/preferência em andamento. O sujeito tem que ser concreto (um grupo, uma prática, um produto). Evite previsões óbvias — o leitor só para se a tendência for contraintuitiva ou recém-nomeada.",
  },
  {
    id: "provocacao_existencial",
    name: "Provocação Existencial",
    description:
      "Pergunta retórica que força pausa reflexiva. Ativa indignação ou inconformismo. Menor média de likes, mas alto share entre público crítico.",
    structure: "{Pergunta que questiona um pressuposto amplamente aceito}?",
    avgLikes: 14000,
    examples: [
      "Por que livros de ficção ensinam lições melhor do que clássicos da autoajuda?",
      "Faz Sentido Trabalharmos Sem Propósito em um Planeta que Está Derretendo?",
      "Os problemas de uma sociedade que idolatra os influencers errados",
      "O que o Orkut Pode Nos Ensinar Sobre a Internet Antes da Era da Performance",
      "Por que a Filosofia Clássica Será o Grande Diferencial na Era da Inteligência Artificial?",
    ],
    generatorInstruction:
      "Formule uma pergunta que confronte um valor, hábito ou narrativa que o público toma como dado. O tom é de colunista provocador — não é pergunta didática, é provocação com carga filosófica. Precisa soar inevitável, não retórica fácil.",
  },
]

export function getAllHeadlinePatterns(): HeadlinePattern[] {
  return HEADLINE_PATTERNS
}

export function getHeadlinePattern(id: string): HeadlinePattern | undefined {
  return HEADLINE_PATTERNS.find((p) => p.id === id)
}

export type HeadlinePatternId = (typeof HEADLINE_PATTERNS)[number]["id"]

// Bloco focado em padrões específicos. Usado quando o caller já escolheu
// um subset (ex: Tribal v4 com bdHeadlinePatterns=["morte_de_x", "investigando_x"]).
// Se nenhum id for passado, cai em buildHeadlineLibraryPromptBlock (todos).
export function buildHeadlinePatternsBlock(ids?: HeadlinePatternId[]): string {
  const selected = ids && ids.length > 0
    ? HEADLINE_PATTERNS.filter((p) => ids.includes(p.id as HeadlinePatternId))
    : HEADLINE_PATTERNS

  if (selected.length === 0) return ""

  const lines: string[] = [
    `# PADRÕES DE HEADLINE SELECIONADOS (${selected.length})`,
    "",
    "Use os padrões abaixo como referência estrutural. Não copie literal — adapte ao tema do conteúdo gerado.",
    "",
  ]
  for (const pattern of selected) {
    lines.push(`## ${pattern.name}`)
    lines.push(`Estrutura: ${pattern.structure}`)
    lines.push(`Como gerar: ${pattern.generatorInstruction}`)
    lines.push("Exemplos:")
    for (const ex of pattern.examples.slice(0, 2)) lines.push(`  - ${ex}`)
    lines.push("")
  }
  return lines.join("\n")
}

export function buildHeadlineLibraryPromptBlock(): string {
  const lines: string[] = [
    "# BANCO DE PADRÕES DE HEADLINE (BrandsDecoded — 56 hooks +10k likes)",
    "",
    "Use estes padrões como referência comprovada. Cada um tem lift específico e gatilhos emocionais embutidos.",
    "",
  ]

  for (const pattern of HEADLINE_PATTERNS) {
    lines.push(`## ${pattern.name} (id: ${pattern.id})`)
    if (pattern.avgLikes) {
      lines.push(`Média de performance: ~${(pattern.avgLikes / 1000).toFixed(0)}k likes`)
    }
    lines.push(`Descrição: ${pattern.description}`)
    lines.push(`Estrutura: ${pattern.structure}`)
    lines.push("Exemplos reais:")
    for (const ex of pattern.examples) {
      lines.push(`  - ${ex}`)
    }
    lines.push(`Como gerar: ${pattern.generatorInstruction}`)
    lines.push("")
  }

  return lines.join("\n")
}
