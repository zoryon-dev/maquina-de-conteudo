// Filtro editorial baseado no manual BrandsDecoded.
// Detecção mecânica (regex) — NÃO precisa de LLM. Catch barato e
// determinístico antes do judge semântico em editorial-qa.ts.
//
// Severidade:
//  - "block" → reprova automático, força rewrite
//  - "warn"  → desconta nota mas não reprova; reportado pra rewrite tentar evitar

export type AntiPatternSeverity = "block" | "warn"

export type AntiPatternHit = {
  patternId: string
  severity: AntiPatternSeverity
  description: string
  match: string
  index: number
}

type AntiPatternDef = {
  id: string
  severity: AntiPatternSeverity
  description: string
  pattern: RegExp
}

// IMPORTANTE: regex case-insensitive + global (`gi`) por padrão.
// Boundaries `\b` ou contexto explícito para evitar false positives.

const ANTI_PATTERNS: AntiPatternDef[] = [
  // ── estruturas binárias (block) ──
  {
    id: "binary_nao_e_x_e_y",
    severity: "block",
    description: 'Construção binária "Não é X, é Y" / "Não é sobre X, é sobre Y"',
    pattern: /\bnão é\s+(?:sobre\s+)?[^.,;:!?\n]{1,80}?,\s*(?:é|e\s+sim)\b/gi,
  },
  {
    id: "binary_menos_x_mais_y",
    severity: "block",
    description: 'Paralelismo "Menos X. Mais Y." ou "Menos X, mais Y"',
    pattern: /\bmenos\s+\w+[.,]\s*mais\s+\w+/gi,
  },
  {
    id: "binary_sem_x_sem_y",
    severity: "block",
    description: 'Paralelismo "Sem X. Sem Y."',
    pattern: /\bsem\s+\w+[.,]\s*sem\s+\w+/gi,
  },
  {
    id: "binary_antes_agora",
    severity: "block",
    description: 'Estrutura "Antes: X. Agora: Y."',
    pattern: /\bantes\s*:\s*[^.\n]{1,60}\.\s*agora\s*:/gi,
  },
  {
    id: "binary_deixa_de_ser",
    severity: "block",
    description: '"Deixa de ser X para ser Y"',
    pattern: /\bdeixa de ser\s+\w+\s+para ser\b/gi,
  },

  // ── cacoetes de IA (block) ──
  {
    id: "cliche_no_fim_das_contas",
    severity: "block",
    description: '"No fim das contas" / "Ao final do dia"',
    pattern: /\b(no fim das contas|ao final do dia|no final do dia)\b/gi,
  },
  {
    id: "cliche_pergunta_que_fica",
    severity: "block",
    description: '"A pergunta que fica" / "A questão é" / "O ponto é"',
    pattern: /\b(a pergunta que fica|a questão é\b|o ponto é\b)/gi,
  },
  {
    id: "cliche_isso_muda_tudo",
    severity: "block",
    description: '"E isso muda tudo" — hipérbole vazia',
    pattern: /\be isso muda tudo\b/gi,
  },
  {
    id: "cliche_logica_funciona",
    severity: "block",
    description: '"A lógica funciona assim" / "O mecanismo funciona assim"',
    pattern: /\b(a lógica|o mecanismo) funciona assim\b/gi,
  },

  // ── aberturas escolares (block) ──
  {
    id: "opening_em_um_mundo",
    severity: "block",
    description: '"Em um mundo onde" — abertura escolar',
    pattern: /\bem um mundo\s+(em\s+que|onde)\b/gi,
  },
  {
    id: "opening_vivemos_em_uma_era",
    severity: "block",
    description: '"Vivemos em uma era" — abertura genérica',
    pattern: /\bvivemos em (uma|um)\s+(era|tempo|momento|mundo)\b/gi,
  },
  {
    id: "opening_hoje_vamos_falar",
    severity: "block",
    description: '"Hoje vamos falar" / "Neste carrossel você vai aprender"',
    pattern: /\b(hoje (vamos|vou) falar|neste carrossel você vai|antes de começar)\b/gi,
  },

  // ── headlines proibidas (block) ──
  {
    id: "headline_quando_x_vira_y",
    severity: "block",
    description: '"Quando X vira Y"',
    pattern: /^quando\s+\S.{2,40}\bvira\b/im,
  },
  {
    id: "headline_ascensao_de",
    severity: "block",
    description: '"A ascensão de X"',
    pattern: /^a?\s*ascensão de\b/im,
  },
  {
    id: "headline_mudou_para_sempre",
    severity: "block",
    description: '"X mudou para sempre"',
    pattern: /\bmudou para sempre\b/gi,
  },
  {
    id: "headline_descubra_saiba_conheca",
    severity: "block",
    description: 'Headlines começando com "Descubra/Saiba/Conheça"',
    pattern: /^(descubra|saiba|conheça)\b/im,
  },
  {
    id: "headline_guia_definitivo",
    severity: "block",
    description: '"O guia definitivo" / "Tudo que você precisa saber"',
    pattern: /\b(o guia definitivo|tudo que você precisa saber)\b/gi,
  },

  // ── fechamentos meta (warn) ──
  {
    id: "closing_swipe",
    severity: "warn",
    description: '"Continue no próximo slide" / "Swipe para ver mais"',
    pattern: /\b(continue no próximo slide|swipe para ver|deslize para)\b/gi,
  },
  {
    id: "cta_agradecimento",
    severity: "warn",
    description: 'Fechamento cordial em CTA',
    pattern: /\b(espero que (tenha )?gostad[oa]|obrigado por (acompanhar|ler)|não esqueça de seguir)\b/gi,
  },

  // ── 2ª pessoa imperativa (warn — pode ser legítima em CTA) ──
  {
    id: "second_person_voce_precisa",
    severity: "warn",
    description: '"Você precisa" / "Você deve" — tom de coach',
    pattern: /\bvocê (precisa|deve)\b/gi,
  },

  // ── construções vagas (warn) ──
  {
    id: "vague_de_forma_x",
    severity: "warn",
    description: '"De forma clara/consistente/natural"',
    pattern: /\bde forma\s+(clara|consistente|natural|simples|eficaz|eficiente)/gi,
  },
  {
    id: "vague_simplesmente",
    severity: "warn",
    description: '"Simplesmente"',
    pattern: /\bsimplesmente\b/gi,
  },
  {
    id: "vague_basicamente",
    severity: "warn",
    description: '"Basicamente"',
    pattern: /\bbasicamente\b/gi,
  },
  {
    id: "vague_cada_vez_mais",
    severity: "warn",
    description: '"Cada vez mais"',
    pattern: /\bcada vez mais\b/gi,
  },

  // ── jargão corporativo (warn) ──
  {
    id: "jargon_sinergia",
    severity: "warn",
    description: '"Sinergia"',
    pattern: /\bsinergia/gi,
  },
  {
    id: "jargon_disruptivo",
    severity: "warn",
    description: '"Disruptivo"',
    pattern: /\bdisruptivo/gi,
  },
  {
    id: "jargon_stakeholders",
    severity: "warn",
    description: '"Stakeholders"',
    pattern: /\bstakeholders\b/gi,
  },
  {
    id: "jargon_mindset",
    severity: "warn",
    description: '"Mindset"',
    pattern: /\bmindset\b/gi,
  },
  {
    id: "jargon_storytelling",
    severity: "warn",
    description: '"Storytelling"',
    pattern: /\bstorytelling\b/gi,
  },

  // ── anglicismos numéricos (warn) ──
  {
    id: "anglicism_x_plus_anos",
    severity: "warn",
    description: '"10+ anos" — usar "mais de 10 anos"',
    pattern: /\b\d+\+\s*anos?\b/gi,
  },
  {
    id: "anglicism_x_vezes_maior",
    severity: "warn",
    description: '"5x maior" — usar "cinco vezes maior"',
    pattern: /\b\d+x\s*(maior|menor|mais|menos)\b/gi,
  },

  // ── dados sem fonte (warn) ──
  {
    id: "vague_data_estudos_mostram",
    severity: "warn",
    description: '"Estudos mostram que" sem nomear',
    pattern: /\bestudos? mostram?\b/gi,
  },
  {
    id: "vague_data_especialistas",
    severity: "warn",
    description: '"Especialistas dizem" sem nomear',
    pattern: /\bespecialistas dizem\b/gi,
  },
  {
    id: "vague_data_recentemente",
    severity: "warn",
    description: '"Recentemente" sem data',
    pattern: /(?:^|[.\n]\s*)recentemente,?\s/gi,
  },
]

export function findAntiPatterns(text: string): AntiPatternHit[] {
  const hits: AntiPatternHit[] = []
  for (const def of ANTI_PATTERNS) {
    if (def.pattern.global) {
      const matches = text.matchAll(def.pattern)
      for (const m of matches) {
        hits.push({
          patternId: def.id,
          severity: def.severity,
          description: def.description,
          match: m[0],
          index: m.index ?? 0,
        })
      }
    } else {
      const m = text.match(def.pattern)
      if (m) {
        hits.push({
          patternId: def.id,
          severity: def.severity,
          description: def.description,
          match: m[0],
          index: m.index ?? 0,
        })
      }
    }
  }
  return hits
}

export function hasBlockingAntiPattern(text: string): boolean {
  return findAntiPatterns(text).some((h) => h.severity === "block")
}

export function summarizeHits(hits: AntiPatternHit[]): string {
  if (hits.length === 0) return "Nenhum anti-pattern detectado."
  const blocks = hits.filter((h) => h.severity === "block")
  const warns = hits.filter((h) => h.severity === "warn")
  const lines: string[] = []
  if (blocks.length > 0) {
    lines.push(`${blocks.length} BLOCK:`)
    for (const h of blocks) lines.push(`  - ${h.patternId}: "${h.match}"`)
  }
  if (warns.length > 0) {
    lines.push(`${warns.length} WARN:`)
    for (const h of warns) lines.push(`  - ${h.patternId}: "${h.match}"`)
  }
  return lines.join("\n")
}

export function listAllPatternIds(): string[] {
  return ANTI_PATTERNS.map((p) => p.id)
}
