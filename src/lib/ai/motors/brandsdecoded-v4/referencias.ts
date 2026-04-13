// Few-shots dos 2 carrosseis exemplares da BrandsDecoded — extraídos
// literalmente de `temporaria/brandformat/brandsdecoded-referencias.md`.
//
// Servem como âncora de qualidade editorial para o motor BD v4: triagem,
// espinha dorsal e copy dos slides. Usar via `buildReferenciasPromptBlock`
// ao montar prompts de geração (copy-blocks, legenda, etc).

export type CarrosselReferencia = {
  id: string
  tema: string
  espinha: {
    headline: string
    hook: string
    mecanismo: string
    prova: string
    aplicacao: string
    direcao: string
  }
  // Lista de blocos de copy dos slides na ordem em que aparecem no exemplo.
  // Para o Exemplo 1 (9 slides / 2 blocos por slide) são 18 entradas.
  // Para o Exemplo 2 (7 slides) são menos — extração literal, sem invenção.
  blocks: string[]
  legenda: string
}

export const REFERENCIAS_EXEMPLARES: CarrosselReferencia[] = [
  {
    id: "exemplo-1-tema-nicho-viralizacao",
    tema:
      "Análise de 1.168 posts — marketing/branding tem 7,1% de hit rate, enquanto gerações tem 1 a cada 3",
    espinha: {
      headline:
        "Por que o tema que você mais domina / é o que menos viraliza no Instagram.",
      hook:
        "Você estudou anos o seu assunto. Tem case, tem resultado, tem autoridade. E mesmo assim: 13 likes, 2 comentários, zero alcance. O problema não é o conteúdo — é o tema.",
      mecanismo:
        'O Instagram não distribui conteúdo por qualidade técnica. Distribui por velocidade de engajamento nas primeiras horas. E engajamento vem de identificação emocional — não de expertise. Quem se identifica com "Gen Z parou de ir à festa"? Metade do Brasil. Quem se identifica com "4 estratégias de CAC para SaaS B2B"? Duzentas pessoas.',
      prova:
        "A) Em 1.168 posts analisados, marketing e branding tiveram 7.1% de hit rate — o pior de todos os temas. B) Posts sobre gerações viralizaram 1 a cada 3 — sem nenhum expertise técnico necessário. C) Nostalgia e comportamento: ~28% de hit rate, acessíveis a qualquer nicho.",
      aplicacao:
        'Isso não significa abandonar o seu nicho. Significa usá-lo como destino, não como ponto de partida. A capa surfa o tema em alta. O miolo entrega a sua especialidade. O nutricionista que faz carrossel sobre "por que todo mundo está correndo" e termina com nutrição para corredores tem alcance e autoridade ao mesmo tempo.',
      direcao:
        "O próximo carrossel que você criar: comece pelo tema, não pelo conteúdo. Escolha um assunto em alta no Brasil — geracional, cultural, comportamental — e encontre o ângulo que conecta com o que você faz. A ponte entre o tema e o seu nicho é o post.",
    },
    blocks: [
      // Slide 1 — Capa (chapéu + headline)
      "POR QUE O TEMA",
      "QUE VOCÊ MAIS DOMINA É O QUE MENOS VIRALIZA",
      // Slide 2 — Hook (Dark)
      "Você estudou anos o seu assunto. Tem case, tem resultado, tem autoridade de verdade.",
      "E mesmo assim: 13 likes. 4 comentários. Zero alcance. O problema não é o conteúdo — é o tema.",
      // Slide 3 — Contexto (Light)
      "Analisamos 1.168 carrosséis reais e encontramos um padrão que contradiz tudo que o senso comum diz sobre criação de conteúdo.",
      "O tema que você mais evita performa 4 vezes melhor do que o que você mais escolhe.",
      // Slide 4 — Mecanismo (Dark)
      "O Instagram não distribui conteúdo por qualidade técnica. Distribui por velocidade de engajamento nas primeiras horas.",
      'E engajamento vem de identificação emocional — não de expertise. Quem se identifica com "Gen Z parou de ir à festa"? Metade do Brasil. Quem se identifica com "4 estratégias de CAC para SaaS B2B"? Duzentas pessoas.',
      // Slide 5 — Prova (Light) — 2 blocos sintéticos a partir da tabela
      "Em 1.168 posts reais: marketing e branding fecharam em 7,1% de hit rate — o pior de todos os temas analisados.",
      "Na mesma base, gerações e comportamento viralizaram 1 a cada 3. Nostalgia e cultura: ~28%. Urgência e ameaça: alta performance.",
      // Slide 6 — Expansão (Dark)
      "Não significa abandonar o seu nicho. Significa usá-lo como destino, não como ponto de partida.",
      "A capa surfa o tema em alta. O miolo entrega a sua especialidade. Alcance e autoridade ao mesmo tempo — sem escolher um ou outro.",
      // Slide 7 — Aplicação (Light)
      'Nutricionista + "por que todo mundo está correndo" → termina com nutrição para corredores. Advogado + "o que a nova lei muda pra criadores" → termina com consultoria jurídica.',
      "Qualquer nicho acoplado a um tema cultural em alta encontra um ângulo que conecta com a especialidade da casa.",
      // Slide 8 — Direção (Gradient)
      "Tema amplo, ponto de vista seu — essa é a regra que separa carrossel que cresce de carrossel que fala pra própria bolha.",
      "Comece pelo tema, não pelo conteúdo. Escolha um assunto em alta — geracional, cultural, comportamental — e encontre o ângulo que conecta.",
      // Slide 9 — CTA / Fechamento (Light)
      "Os 1.168 posts provam que distribuição e qualidade não competem entre si — mas a distribuição vem primeiro, sempre.",
      'Quem ignora essa ordem produz para a bolha. Comenta "MANUAL" e a gente manda o guia com os 5 frameworks direto na DM.',
    ],
    legenda:
      'Você domina seu assunto há anos — e mesmo assim o alcance some no zero. Analisamos 1.168 posts reais e o padrão é brutal: marketing e branding fecharam em 7,1% de hit rate, enquanto gerações viralizaram 1 a cada 3 publicações. O Instagram não distribui por expertise técnica; distribui por identificação emocional nas primeiras horas. A leitura é direta: nicho como destino, não como ponto de partida. A capa surfa o tema em alta, o miolo entrega a especialidade da casa — e o alcance volta a conversar com a autoridade que você já construiu. Comenta "MANUAL" que a gente manda o guia com os cinco frameworks direto na DM.',
  },
  {
    id: "exemplo-2-corrida-tribo-urbana",
    tema: "Corrida como tema de posts virais — fenômeno cultural urbano",
    espinha: {
      headline:
        "Investigando por que a corrida se tornou / a droga favorita dos adultos ansiosos.",
      hook:
        "Em 2020, academias fecharam e todo mundo foi correr. Só que as academias abriram — e as pessoas não pararam. Hoje, 34% mais brasileiros correm do que há dois anos. Não é tendência fitness. É um fenômeno cultural que precisa de explicação.",
      mecanismo:
        "A corrida entrega em um produto três coisas que a modernidade tirou: solidão produtiva (tempo sem notificação), comunidade sem obrigação (clube de corrida — aparece se quiser) e resultado visível e mensurável (você literalmente vê onde chegou). Num mundo de métricas abstratas e trabalho invisível, a corrida é uma das poucas atividades onde o esforço e o resultado são proporcionais e imediatos.",
      prova:
        "A) Mercado de tênis de corrida no Brasil: crescimento de 34% em 2024. B) Clubes de corrida em São Paulo: de ~40 para mais de 200 nos últimos 3 anos. C) Posts sobre corrida têm hit rate 3x maior que posts sobre fitness genérico — nossa própria análise de 1.168 posts.",
      aplicacao:
        "Toda tribo que cresce rápido precisa de conteúdo que a nomeie e explique. O criador que nomeia o fenômeno — antes de virar mainstream — captura a atenção da tribo inteira. É o mesmo mecanismo do Tiny Desk, do jiu-jítsu das celebridades, dos clubes de leitura. Aparece cedo, nomeie, explique.",
      direcao:
        "A pergunta não é se você vai falar sobre corrida. É qual ângulo conecta corrida com o que você faz. Nutrição para corredor. Advocacia trabalhista para quem quer trabalhar menos e correr mais. Branding de clubes. O tema está disponível — o ângulo é seu.",
    },
    blocks: [
      // Slide 1 — Capa
      "INVESTIGANDO POR QUE A CORRIDA VIROU A DROGA FAVORITA DOS ADULTOS ANSIOSOS",
      // Slide 2 — Hook (Dark)
      "Em 2020, as academias fecharam e todo mundo foi correr. Só que as academias abriram de novo — e as pessoas não pararam.",
      "34% mais brasileiros correm do que há dois anos. Não é tendência fitness. É um fenômeno cultural que precisa de explicação.",
      // Slide 3 — Mecanismo (Gradient)
      "Três coisas que a modernidade tirou — e a corrida devolveu. Solidão produtiva: tempo sem notificação, sem reunião, sem entrega.",
      "Comunidade sem obrigação: clube de corrida — aparece se quiser. Resultado visível: você literalmente vê onde chegou hoje vs. ontem.",
      // Slide 4 — Prova (Dark)
      "Não é impressão. Os dados confirmam o que qualquer um que mora em cidade grande já está sentindo.",
      "Mercado de tênis de corrida no Brasil: +34% em 2024. Clubes em São Paulo: de 40 para mais de 200. Posts sobre corrida: hit rate 3x maior que fitness genérico.",
      // Slide 5 — Expansão (Light)
      "Toda tribo que cresce rápido precisa de conteúdo que a nomeie e explique. O criador que chega cedo captura a atenção da tribo inteira.",
      "É o mesmo mecanismo do Tiny Desk, do jiu-jítsu das celebridades, dos clubes de leitura. Aparece cedo. Nomeie. Explique.",
      // Slide 6 — Direção (Dark)
      "A pergunta não é se você vai falar sobre corrida. É qual ângulo conecta corrida com o que você faz.",
      "Nutricionista → alimentação para corredor. Advogado → trabalho menos, corra mais. Designer → identidade visual de clubes. O tema está disponível — o ângulo é seu.",
      // Slide 7 — CTA
      'Comenta "CORRIDA" e a gente manda um guia com 10 ângulos para qualquer nicho usar esse tema na próxima semana.',
    ],
    legenda:
      "Em 2020 as academias fecharam e todo mundo foi correr — mas quando elas reabriram, as pessoas não pararam. Hoje 34% mais brasileiros correm do que há dois anos, o mercado de tênis cresceu 34% em 2024 e os clubes em São Paulo passaram de 40 para mais de 200 em três anos. A corrida devolveu três coisas que a modernidade tirou: solidão produtiva, comunidade sem obrigação e resultado visível. Toda tribo que cresce rápido precisa de conteúdo que a nomeie e explique — e o criador que aparece cedo captura a atenção da tribo inteira. A pergunta não é se você vai falar de corrida; é qual ângulo conecta corrida com o que você faz. Comenta \"CORRIDA\" que a gente manda um guia com 10 ângulos para qualquer nicho usar na próxima semana.",
  },
]

/**
 * Formata as referências como bloco de few-shots para injeção em prompt.
 *
 * Cada referência vira uma seção com espinha dorsal + copy dos slides, no
 * formato que o modelo deve imitar na escrita do carrossel atual.
 */
export function buildReferenciasPromptBlock(maxRefs?: number): string {
  const refs = REFERENCIAS_EXEMPLARES.slice(
    0,
    Math.max(1, Math.min(maxRefs ?? 2, REFERENCIAS_EXEMPLARES.length))
  )

  const sections = refs.map((ref, idx) => {
    const n = idx + 1
    const blocksFormatted = ref.blocks
      .map((b, i) => `  texto ${i + 1} — ${b}`)
      .join("\n")

    return [
      `### EXEMPLO ${n} — ${ref.tema}`,
      ``,
      `**Headline:** ${ref.espinha.headline}`,
      `**Hook:** ${ref.espinha.hook}`,
      `**Mecanismo:** ${ref.espinha.mecanismo}`,
      `**Prova:** ${ref.espinha.prova}`,
      `**Aplicação:** ${ref.espinha.aplicacao}`,
      `**Direção:** ${ref.espinha.direcao}`,
      ``,
      `**Copy dos slides:**`,
      blocksFormatted,
      ``,
      `**Legenda Instagram:**`,
      ref.legenda,
    ].join("\n")
  })

  return [
    `## REFERÊNCIAS EXEMPLARES — QUALIDADE EDITORIAL BRANDSDECODED`,
    ``,
    `Carrosséis reais usados como âncora de estilo. Imite o tom jornalístico,`,
    `a densidade de dados e o ritmo narrativo — NÃO copie frases literalmente.`,
    ``,
    sections.join("\n\n---\n\n"),
  ].join("\n")
}
