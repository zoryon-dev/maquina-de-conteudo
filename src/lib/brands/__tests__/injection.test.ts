import { describe, it, expect, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mocks: injection.ts importa "server-only" (não carrega fora de RSC) e
// "./context" (que puxa db/drizzle). Para testar lógica pura dos builders,
// neutralizamos ambos antes de importar o módulo sob teste.
// ---------------------------------------------------------------------------
vi.mock("server-only", () => ({}))
vi.mock("../context", () => ({
  getActiveBrandConfig: vi.fn(async () => null),
}))

import {
  brandConfigToPromptVariables,
  buildTone,
  buildBrandVoice,
  buildNiche,
  buildTargetAudience,
  buildAudienceFears,
  buildAudienceDesires,
  buildNegativeTerms,
  buildDifferentiators,
  buildContentGoals,
  buildPreferredCTAs,
} from "../injection"
import { createEmptyBrandConfig, type BrandConfig } from "../schema"

// ---------------------------------------------------------------------------
// Fixture helper — marca totalmente populada com variações estratégicas:
// - atributos de tom em torno do threshold (59/60/61/etc)
// - avatar parcial (campos vazios) junto com avatar completo
// - pilar de conteúdo com CTA para cobrir buildPreferredCTAs
// ---------------------------------------------------------------------------
function fullFixture(): BrandConfig {
  const c = createEmptyBrandConfig()
  c.identity.positioning = "Consultoria tribal B2B"
  c.identity.beliefs = ["crença A", "crença B"]
  c.voice.tom = "direto e provocador"
  c.voice.atributos = {
    direto: 80,
    acessivel: 59,
    firme: 60,
    humano: 40,
    tecnico: 70,
  }
  c.voice.vocabulario = {
    use: ["tribo", "ritual"],
    avoid: ["hack", "growth"],
  }
  c.audience.avatares = [
    {
      nome: "Ana CMO",
      faixaSalarial: "R$20k",
      estagio: "consciente",
      dores: ["não escala", "burn out"],
      busca: "previsibilidade",
      onde: "LinkedIn",
      transformacao: "time sênior",
    },
    {
      nome: "Bruno",
      faixaSalarial: "",
      estagio: "",
      dores: ["tempo"],
      busca: "",
      onde: "",
      transformacao: "",
    },
  ]
  c.content.pilares = [
    {
      nome: "Autoridade",
      objetivo: "MQL",
      cta: "Agende call",
      exemplos: [],
      logica: "",
      papelFunil: "meio",
    },
  ]
  return c
}

// ===========================================================================
// 1. brandConfigToPromptVariables(createEmptyBrandConfig())
// ===========================================================================
describe("brandConfigToPromptVariables", () => {
  it("retorna todas as 10 chaves undefined para marca não configurada (sem atributos, sem textos)", () => {
    // createEmptyBrandConfig() define atributos default (80/70/75/75/30) via schema,
    // o que faz buildTone retornar string. Para representar uma marca totalmente
    // "não configurada" (garantindo que nada lixo é injetado nos prompts), zeramos
    // os atributos — conteúdo textual já é "" por default.
    const c = createEmptyBrandConfig()
    c.voice.atributos = { direto: 0, acessivel: 0, firme: 0, humano: 0, tecnico: 0 }
    const result = brandConfigToPromptVariables(c)

    expect(result).toEqual({
      tone: undefined,
      brandVoice: undefined,
      niche: undefined,
      targetAudience: undefined,
      audienceFears: undefined,
      audienceDesires: undefined,
      negativeTerms: undefined,
      differentiators: undefined,
      contentGoals: undefined,
      preferredCTAs: undefined,
    })
  })

  it("para createEmptyBrandConfig() puro, apenas 'tone' é preenchido (defaults do schema)", () => {
    // Proteção de regressão: documenta que os defaults do schema produzem tone
    // não-vazio mesmo sem input do usuário. Se os defaults mudarem, este teste
    // avisa explicitamente.
    const result = brandConfigToPromptVariables(createEmptyBrandConfig())
    expect(result.tone).toBeTruthy()
    expect(result.brandVoice).toBeUndefined()
    expect(result.niche).toBeUndefined()
    expect(result.targetAudience).toBeUndefined()
    expect(result.audienceFears).toBeUndefined()
    expect(result.audienceDesires).toBeUndefined()
    expect(result.negativeTerms).toBeUndefined()
    expect(result.differentiators).toBeUndefined()
    expect(result.contentGoals).toBeUndefined()
    expect(result.preferredCTAs).toBeUndefined()
  })

  it("popula todas as chaves com fixture completo", () => {
    const result = brandConfigToPromptVariables(fullFixture())

    expect(result.tone).toBeDefined()
    expect(result.brandVoice).toBeDefined()
    expect(result.niche).toBeDefined()
    expect(result.targetAudience).toBeDefined()
    expect(result.audienceFears).toBeDefined()
    expect(result.audienceDesires).toBeDefined()
    expect(result.negativeTerms).toBeDefined()
    expect(result.differentiators).toBeDefined()
    expect(result.contentGoals).toBeDefined()
    expect(result.preferredCTAs).toBeDefined()
  })
})

// ===========================================================================
// 2. buildTone — threshold de atributos
// ===========================================================================
describe("buildTone", () => {
  it("exclui atributo com score 59 (abaixo do threshold)", () => {
    const c = createEmptyBrandConfig()
    c.voice.tom = ""
    c.voice.atributos = {
      direto: 59,
      acessivel: 0,
      firme: 0,
      humano: 0,
      tecnico: 0,
    }
    expect(buildTone(c)).toBeUndefined()
  })

  it("inclui atributo exatamente no threshold (60)", () => {
    const c = createEmptyBrandConfig()
    c.voice.tom = ""
    c.voice.atributos = {
      direto: 60,
      acessivel: 0,
      firme: 0,
      humano: 0,
      tecnico: 0,
    }
    expect(buildTone(c)).toBe("direto")
  })

  it("inclui atributo acima do threshold (61)", () => {
    const c = createEmptyBrandConfig()
    c.voice.tom = ""
    c.voice.atributos = {
      direto: 61,
      acessivel: 0,
      firme: 0,
      humano: 0,
      tecnico: 0,
    }
    expect(buildTone(c)).toBe("direto")
  })

  it("preserva ordem estável: direto → acessível → firme → humano → técnico", () => {
    const c = createEmptyBrandConfig()
    c.voice.tom = ""
    c.voice.atributos = {
      direto: 80,
      acessivel: 80,
      firme: 80,
      humano: 80,
      tecnico: 80,
    }
    expect(buildTone(c)).toBe("direto, acessível, firme, humano, técnico")
  })

  it("retorna undefined quando tom vazio e todos os atributos abaixo do threshold", () => {
    const c = createEmptyBrandConfig()
    c.voice.tom = ""
    c.voice.atributos = {
      direto: 10,
      acessivel: 20,
      firme: 30,
      humano: 40,
      tecnico: 50,
    }
    expect(buildTone(c)).toBeUndefined()
  })

  it("retorna só o tom sem separator pendurado quando tom preenchido mas sem atributos acima do threshold", () => {
    const c = createEmptyBrandConfig()
    c.voice.tom = "x"
    c.voice.atributos = {
      direto: 10,
      acessivel: 20,
      firme: 30,
      humano: 40,
      tecnico: 50,
    }
    // Sem "x |" trailing nem pipe órfão.
    expect(buildTone(c)).toBe("x")
  })

  it("combina tom + atributos usando separator padrão ' | '", () => {
    const c = createEmptyBrandConfig()
    c.voice.tom = "provocador"
    c.voice.atributos = {
      direto: 80,
      acessivel: 0,
      firme: 60,
      humano: 0,
      tecnico: 0,
    }
    expect(buildTone(c)).toBe("provocador | direto, firme")
  })
})

// ===========================================================================
// 3. buildTargetAudience com avatar parcial
// ===========================================================================
describe("buildTargetAudience", () => {
  it("retorna só o nome quando avatar tem apenas nome (sem — trailing)", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "X",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "",
        onde: "",
        transformacao: "",
      },
    ]
    const result = buildTargetAudience(c)
    expect(result).toBe("X")
    expect(result).not.toContain("—")
  })

  it("separa múltiplos avatares com ' | '", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "Ana",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "",
        onde: "",
        transformacao: "",
      },
      {
        nome: "Bruno",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "",
        onde: "",
        transformacao: "",
      },
    ]
    expect(buildTargetAudience(c)).toBe("Ana | Bruno")
  })

  it("retorna undefined para array vazio", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = []
    expect(buildTargetAudience(c)).toBeUndefined()
  })

  it("junta nome/faixa/estágio com ' — ' quando todos preenchidos", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "Ana",
        faixaSalarial: "R$20k",
        estagio: "consciente",
        dores: [],
        busca: "",
        onde: "",
        transformacao: "",
      },
    ]
    expect(buildTargetAudience(c)).toBe("Ana — R$20k — consciente")
  })
})

// ===========================================================================
// 4. buildAudienceFears / buildAudienceDesires — separator correto (", ")
// ===========================================================================
describe("buildAudienceFears", () => {
  it("concatena dores de múltiplos avatares usando ', ' (não '; ')", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "Ana",
        faixaSalarial: "",
        estagio: "",
        dores: ["não escala", "burn out"],
        busca: "",
        onde: "",
        transformacao: "",
      },
      {
        nome: "Bruno",
        faixaSalarial: "",
        estagio: "",
        dores: ["tempo"],
        busca: "",
        onde: "",
        transformacao: "",
      },
    ]
    const result = buildAudienceFears(c)
    expect(result).toBe("não escala, burn out, tempo")
    expect(result).not.toContain("; ")
  })

  it("retorna undefined quando nenhum avatar tem dores", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "Ana",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "",
        onde: "",
        transformacao: "",
      },
    ]
    expect(buildAudienceFears(c)).toBeUndefined()
  })

  it("retorna undefined quando não há avatares", () => {
    const c = createEmptyBrandConfig()
    expect(buildAudienceFears(c)).toBeUndefined()
  })
})

describe("buildAudienceDesires", () => {
  it("concatena busca+transformacao de múltiplos avatares usando ', '", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "Ana",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "previsibilidade",
        onde: "",
        transformacao: "time sênior",
      },
      {
        nome: "Bruno",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "tempo livre",
        onde: "",
        transformacao: "",
      },
    ]
    const result = buildAudienceDesires(c)
    expect(result).toBe("previsibilidade, time sênior, tempo livre")
    expect(result).not.toContain("; ")
  })

  it("filtra strings vazias e só-espaço", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "Ana",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "   ",
        onde: "",
        transformacao: "time sênior",
      },
      {
        nome: "Bruno",
        faixaSalarial: "",
        estagio: "",
        dores: [],
        busca: "",
        onde: "",
        transformacao: "",
      },
    ]
    expect(buildAudienceDesires(c)).toBe("time sênior")
  })

  it("retorna undefined quando não há desejos preenchidos", () => {
    const c = createEmptyBrandConfig()
    c.audience.avatares = [
      {
        nome: "Ana",
        faixaSalarial: "",
        estagio: "",
        dores: ["x"],
        busca: "",
        onde: "",
        transformacao: "",
      },
    ]
    expect(buildAudienceDesires(c)).toBeUndefined()
  })
})

// ===========================================================================
// 5. buildPreferredCTAs / buildDifferentiators — estruturas parciais
// ===========================================================================
describe("buildPreferredCTAs", () => {
  it("retorna undefined quando pilares não têm CTA (não string vazia)", () => {
    const c = createEmptyBrandConfig()
    c.content.pilares = [
      {
        nome: "Autoridade",
        objetivo: "MQL",
        cta: "",
        exemplos: [],
        logica: "",
        papelFunil: "",
      },
      {
        nome: "Comunidade",
        objetivo: "",
        cta: "   ",
        exemplos: [],
        logica: "",
        papelFunil: "",
      },
    ]
    expect(buildPreferredCTAs(c)).toBeUndefined()
  })

  it("retorna CTAs concatenadas com ' | ' quando preenchidas", () => {
    const c = createEmptyBrandConfig()
    c.content.pilares = [
      {
        nome: "A",
        objetivo: "",
        cta: "Agende call",
        exemplos: [],
        logica: "",
        papelFunil: "",
      },
      {
        nome: "B",
        objetivo: "",
        cta: "Baixe o guia",
        exemplos: [],
        logica: "",
        papelFunil: "",
      },
    ]
    expect(buildPreferredCTAs(c)).toBe("Agende call | Baixe o guia")
  })

  it("retorna undefined quando não há pilares", () => {
    const c = createEmptyBrandConfig()
    expect(buildPreferredCTAs(c)).toBeUndefined()
  })
})

describe("buildDifferentiators", () => {
  it("retorna só as crenças sem separator órfão ' ∥ ' quando positioning e antiPositioning vazios", () => {
    const c = createEmptyBrandConfig()
    c.identity.positioning = ""
    c.identity.antiPositioning = ""
    c.identity.beliefs = ["crença A", "crença B"]
    const result = buildDifferentiators(c)
    expect(result).toBe("Crenças que combatemos: crença A; crença B")
    expect(result).not.toContain(" ∥ ")
  })

  it("retorna só positioning quando antiPositioning e beliefs vazios", () => {
    const c = createEmptyBrandConfig()
    c.identity.positioning = "Consultoria tribal"
    c.identity.antiPositioning = ""
    c.identity.beliefs = []
    const result = buildDifferentiators(c)
    expect(result).toBe("Posicionamento: Consultoria tribal")
    expect(result).not.toContain(" ∥ ")
  })

  it("combina todos os três campos com ' ∥ '", () => {
    const c = createEmptyBrandConfig()
    c.identity.positioning = "Pos"
    c.identity.antiPositioning = "AntiPos"
    c.identity.beliefs = ["b1"]
    expect(buildDifferentiators(c)).toBe(
      "Posicionamento: Pos ∥ Anti-posicionamento: AntiPos ∥ Crenças que combatemos: b1"
    )
  })

  it("retorna undefined quando tudo vazio", () => {
    const c = createEmptyBrandConfig()
    expect(buildDifferentiators(c)).toBeUndefined()
  })
})

// ===========================================================================
// Cobertura extra dos builders simples — garante estabilidade contratual
// ===========================================================================
describe("buildBrandVoice", () => {
  it("retorna undefined quando vocabulario.use vazio", () => {
    const c = createEmptyBrandConfig()
    expect(buildBrandVoice(c)).toBeUndefined()
  })

  it("formata 'Termos oficiais: a, b' quando populado", () => {
    const c = createEmptyBrandConfig()
    c.voice.vocabulario.use = ["a", "b"]
    expect(buildBrandVoice(c)).toBe("Termos oficiais: a, b")
  })
})

describe("buildNiche", () => {
  it("retorna undefined para positioning vazio", () => {
    expect(buildNiche(createEmptyBrandConfig())).toBeUndefined()
  })

  it("retorna positioning trimado", () => {
    const c = createEmptyBrandConfig()
    c.identity.positioning = "  Nicho X  "
    expect(buildNiche(c)).toBe("Nicho X")
  })
})

describe("buildNegativeTerms", () => {
  it("retorna undefined quando avoid vazio", () => {
    expect(buildNegativeTerms(createEmptyBrandConfig())).toBeUndefined()
  })

  it("concatena com ', ' (formato esperado por user-variables.service)", () => {
    const c = createEmptyBrandConfig()
    c.voice.vocabulario.avoid = ["hack", "growth"]
    expect(buildNegativeTerms(c)).toBe("hack, growth")
  })
})

describe("buildContentGoals", () => {
  it("retorna undefined quando sem pilares", () => {
    expect(buildContentGoals(createEmptyBrandConfig())).toBeUndefined()
  })

  it("formata 'nome: objetivo' quando objetivo presente", () => {
    const c = createEmptyBrandConfig()
    c.content.pilares = [
      {
        nome: "Autoridade",
        objetivo: "MQL",
        cta: "",
        exemplos: [],
        logica: "",
        papelFunil: "",
      },
    ]
    expect(buildContentGoals(c)).toBe("Autoridade: MQL")
  })

  it("retorna só nome quando objetivo vazio", () => {
    const c = createEmptyBrandConfig()
    c.content.pilares = [
      {
        nome: "Autoridade",
        objetivo: "   ",
        cta: "",
        exemplos: [],
        logica: "",
        papelFunil: "",
      },
    ]
    expect(buildContentGoals(c)).toBe("Autoridade")
  })
})
