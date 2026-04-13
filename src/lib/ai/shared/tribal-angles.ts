// 4 ângulos tribais (Seth Godin's Tribes). Motor-agnóstico — permite reuso
// por Tribal v4, BrandsDecoded v4 e motores futuros que modulam tom.

import { ValidationError } from "@/lib/errors"

export type TribalAngleId = "herege" | "visionario" | "tradutor" | "testemunha"

export type TribalAngle = {
  id: TribalAngleId
  label: string
  description: string
  example: string
  promptInstruction: string
}

const TRIBAL_ANGLES: TribalAngle[] = [
  {
    id: "herege",
    label: "Herege",
    description: "Desafia verdade aceita, provoca reflexão incômoda.",
    example: '"Todo mundo diz X, mas a verdade é Y"',
    promptInstruction:
      "Adote o ângulo HEREGE: contradiga uma crença aceita do nicho com argumento concreto. " +
      "Não suavize. O leitor deve sentir desconforto produtivo, não ofensa gratuita. " +
      "Estruture: crença comum → falha lógica/empírica → o que muda quando você abandona essa crença.",
  },
  {
    id: "visionario",
    label: "Visionário",
    description: "Mostra futuro possível, inspira mudança.",
    example: '"Imagine um mundo onde..."',
    promptInstruction:
      "Adote o ângulo VISIONÁRIO: descreva um futuro plausível e desejável, ancorado em " +
      "tendências reais já em curso (não fantasia). Mostre os primeiros sinais, o ponto " +
      "de virada e o que o leitor faz hoje para chegar antes.",
  },
  {
    id: "tradutor",
    label: "Tradutor",
    description: "Simplifica complexo, democratiza conhecimento.",
    example: '"O que ninguém te explicou sobre..."',
    promptInstruction:
      "Adote o ângulo TRADUTOR: pegue um conceito que parece técnico/inacessível e " +
      "explique como se estivesse contando para um amigo inteligente fora do nicho. " +
      "Use analogias concretas. Sem jargão sem definição. Sem condescendência.",
  },
  {
    id: "testemunha",
    label: "Testemunha",
    description: "Compartilha jornada pessoal, cria identificação.",
    example: '"Eu costumava acreditar X, até descobrir Y"',
    promptInstruction:
      "Adote o ângulo TESTEMUNHA: relate uma transformação pessoal específica (do autor " +
      "ou cliente real). Use cenas concretas — quando, onde, o que aconteceu, o momento da " +
      "virada, o que mudou depois. Evite generalização e clichês de jornada do herói.",
  },
]

export const TRIBAL_ANGLE_IDS = TRIBAL_ANGLES.map((a) => a.id) as ReadonlyArray<TribalAngleId>

export function getAllTribalAngles(): TribalAngle[] {
  return TRIBAL_ANGLES
}

export function getTribalAngle(id: TribalAngleId): TribalAngle | undefined {
  return TRIBAL_ANGLES.find((a) => a.id === id)
}

export function buildTribalAnglesPromptBlock(): string {
  const lines = [
    "# ÂNGULOS TRIBAIS (Seth Godin's Tribes)",
    "",
    "4 ângulos para criar conexão tribal com a audiência. Cada um tem postura distinta — escolha um e mantenha consistência.",
    "",
  ]
  for (const angle of TRIBAL_ANGLES) {
    lines.push(`## ${angle.label} (id: ${angle.id})`)
    lines.push(`${angle.description}`)
    lines.push(`Exemplo: ${angle.example}`)
    lines.push("")
  }
  return lines.join("\n")
}

// Bloco focado para injetar quando UM ângulo específico é escolhido.
// Usado por motores que aceitam tribalAngle como parâmetro opcional para
// modular o tom (ex: BrandsDecoded v4 com tom tribal seleto).
export function buildTribalAngleInjection(id: TribalAngleId): string {
  const angle = getTribalAngle(id)
  if (!angle) {
    throw new ValidationError(
      `Ângulo tribal inválido: "${id}"`,
      { providedId: id, validIds: TRIBAL_ANGLES.map((a) => a.id) }
    )
  }
  return [
    "# ÂNGULO TRIBAL ESCOLHIDO",
    `**${angle.label}**: ${angle.description}`,
    "",
    angle.promptInstruction,
    "",
  ].join("\n")
}
