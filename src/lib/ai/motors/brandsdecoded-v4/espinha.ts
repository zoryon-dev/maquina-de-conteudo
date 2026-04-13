import { generateText } from "ai"
import { openrouter, DEFAULT_TEXT_MODEL } from "@/lib/ai/config"
import { extractLooseJSON } from "./_shared/parse-json"
import { buildBrandContextBlock } from "./_shared/brand-block"
import { BD_TEMP_TRIAGEM, BD_TEMP_ESPINHA } from "./_shared/temperatures"

export type TriagemResult = {
  transformacao: string
  friccao: string
  angulo: string
  evidencias: string[]
}

export type EspinhaDorsal = {
  headline: string
  hook: string
  mecanismo: string
  prova: string
  aplicacao: string
  direcao: string
}

export type TriagemInput = {
  briefing: string
  brandPromptVariables?: Record<string, string | undefined>
  model?: string
}

export type EspinhaInput = {
  triagem: TriagemResult
  selectedHeadline: string
  brandPromptVariables?: Record<string, string | undefined>
  model?: string
}

const TRIAGEM_SYSTEM = `Você é o Editor-Chefe da Máquina de Carrosséis BrandsDecoded.

Sua tarefa agora é Etapa 1 (Triagem) do pipeline interno. A partir do briefing bruto, você destila 3 camadas que vão guiar a geração de headlines e a espinha dorsal.

REGRAS:
- PT-BR, tom jornalístico e coloquial direto (como repórter da Folha).
- Zero metalinguagem ("vou analisar", "processando").
- Zero clichês de IA: nada de "não é X, é Y", "sem X, sem Y", "ascensão de", "impacto de", "virou" como verbo principal.
- Densidade concreta — cada campo precisa ter âncora real (nome, número, mecanismo).
- Evidências = fatos/exemplos/dados OBSERVÁVEIS do briefing. Se o briefing não trouxer, extrair o que for inferível sem inventar.

FORMATO DE SAÍDA: JSON estrito, sem markdown wrap, sem texto antes/depois.
{
  "transformacao": "uma frase — o que muda no mundo/leitor, com consequência clara",
  "friccao": "uma frase — a tensão real por trás do fenômeno",
  "angulo": "uma frase — a leitura editorial mais forte pra este carrossel",
  "evidencias": ["bullet A com âncora concreta", "bullet B", "bullet C (3-6 itens)"]
}`

/**
 * Executa Etapa 1 — Triagem do BD v4.
 *
 * 1 call ao LLM, output JSON estrito. Temperature baixa (default 0.3, env
 * BD_TEMP_TRIAGEM) porque é extração/compressão, não criação.
 */
export async function runTriagem(input: TriagemInput): Promise<TriagemResult> {
  if (!openrouter) {
    throw new Error("[brandsdecoded-v4/triagem] OpenRouter não configurado (OPENROUTER_API_KEY ausente).")
  }

  const model = input.model ?? DEFAULT_TEXT_MODEL
  const brandBlock = buildBrandContextBlock(input.brandPromptVariables, {
    heading: "# CONTEXTO DE MARCA (injetar no tom, sem citar literalmente)",
  })
  const brandBlockFormatted = brandBlock ? `\n${brandBlock}\n\n` : ""

  const prompt = `${brandBlockFormatted}# BRIEFING
${input.briefing.trim()}

---

Agora execute a Triagem seguindo o formato JSON especificado no system prompt. Responda APENAS com o JSON.`

  const { text } = await generateText({
    model: openrouter.chat(model),
    system: TRIAGEM_SYSTEM,
    prompt,
    temperature: BD_TEMP_TRIAGEM,
  })

  const parsed = extractLooseJSON<Partial<TriagemResult>>(text, "brandsdecoded-v4/triagem")

  // Validação defensiva: garante shape mínimo.
  const result: TriagemResult = {
    transformacao: typeof parsed.transformacao === "string" ? parsed.transformacao.trim() : "",
    friccao: typeof parsed.friccao === "string" ? parsed.friccao.trim() : "",
    angulo: typeof parsed.angulo === "string" ? parsed.angulo.trim() : "",
    evidencias: Array.isArray(parsed.evidencias)
      ? parsed.evidencias.filter((e): e is string => typeof e === "string" && e.trim().length > 0)
      : [],
  }

  if (!result.transformacao || !result.friccao || !result.angulo) {
    throw new Error(
      "[brandsdecoded-v4/triagem] JSON inválido: campos obrigatórios ausentes (transformacao/friccao/angulo)."
    )
  }

  return result
}

const ESPINHA_SYSTEM = `Você é o Editor-Chefe da Máquina de Carrosséis BrandsDecoded.

Sua tarefa agora é Etapa 3 (Espinha Dorsal) do pipeline interno. A partir da Triagem + Headline escolhida, você monta a estrutura narrativa que vai guiar o copy dos slides.

MAPEAMENTO por campo (arquitetura BD v4):
- hook = slide 2 (Dark). Tensão imediata que contextualiza a headline.
- mecanismo = slides 3-4. Por que o fenômeno acontece — explicação do como.
- prova = slide 5. Dados/exemplos em A), B), C) com base observável.
- aplicacao = slide 7. Consequência prática pro leitor.
- direcao = slide 8. Próximo passo lógico (sem CTA comercial — isso é o slide 9).

REGRAS:
- PT-BR, tom jornalístico coloquial (Folha de S.Paulo).
- Cada campo = 1 a 3 frases, denso, com âncora concreta.
- Zero AI slop: sem "não é X, é Y", "sem X, sem Y", "ascensão de", "impacto de", "virou" como verbo principal, sem jargão corporativo, sem anglicismos desnecessários.
- Zero motivacional vazio.
- NUNCA reescrever a headline — repetir EXATA.
- Evidências A/B/C da triagem devem aparecer em 'prova'.

FORMATO DE SAÍDA: JSON estrito, sem markdown wrap.
{
  "headline": "repetir EXATA a selectedHeadline",
  "hook": "1-2 frases que abrem a tensão da headline",
  "mecanismo": "2-3 frases explicando o como/porquê",
  "prova": "A) primeiro caso/dado — B) segundo — C) terceiro",
  "aplicacao": "1-2 frases sobre o que isso significa na prática pro leitor",
  "direcao": "1 frase com o próximo passo lógico (sem CTA comercial)"
}`

/**
 * Executa Etapa 3 — Espinha Dorsal do BD v4.
 *
 * 1 call ao LLM. Temperature média (default 0.5, env BD_TEMP_ESPINHA) —
 * precisa de densidade editorial sem virar experimental.
 */
export async function buildEspinhaDorsal(input: EspinhaInput): Promise<EspinhaDorsal> {
  if (!openrouter) {
    throw new Error(
      "[brandsdecoded-v4/espinha] OpenRouter não configurado (OPENROUTER_API_KEY ausente)."
    )
  }

  const model = input.model ?? DEFAULT_TEXT_MODEL
  const brandBlock = buildBrandContextBlock(input.brandPromptVariables, {
    heading: "# CONTEXTO DE MARCA (injetar no tom, sem citar literalmente)",
  })
  const brandBlockFormatted = brandBlock ? `\n${brandBlock}\n\n` : ""

  const evidenciasBlock =
    input.triagem.evidencias.length > 0
      ? input.triagem.evidencias.map((e, i) => `  ${String.fromCharCode(65 + i)}) ${e}`).join("\n")
      : "  (nenhuma evidência extraída — priorizar mecanismo e contexto)"

  const prompt = `${brandBlockFormatted}# TRIAGEM (Etapa 1)
Transformação: ${input.triagem.transformacao}
Fricção: ${input.triagem.friccao}
Ângulo: ${input.triagem.angulo}
Evidências:
${evidenciasBlock}

# HEADLINE ESCOLHIDA
${input.selectedHeadline}

---

Agora monte a Espinha Dorsal seguindo o formato JSON especificado no system prompt. Repita a headline EXATA no campo "headline". Responda APENAS com o JSON.`

  const { text } = await generateText({
    model: openrouter.chat(model),
    system: ESPINHA_SYSTEM,
    prompt,
    temperature: BD_TEMP_ESPINHA,
  })

  const parsed = extractLooseJSON<Partial<EspinhaDorsal>>(text, "brandsdecoded-v4/espinha")

  const parsedHeadline =
    typeof parsed.headline === "string" ? parsed.headline.trim() : ""
  if (
    parsedHeadline.length > 0 &&
    parsedHeadline.toLowerCase() !== input.selectedHeadline.trim().toLowerCase()
  ) {
    console.warn(
      "[bd/espinha] headline divergente da selectedHeadline — LLM reescreveu",
      {
        selected: input.selectedHeadline,
        generated: parsedHeadline,
      }
    )
  }

  const result: EspinhaDorsal = {
    headline:
      parsedHeadline.length > 0 ? parsedHeadline : input.selectedHeadline,
    hook: typeof parsed.hook === "string" ? parsed.hook.trim() : "",
    mecanismo: typeof parsed.mecanismo === "string" ? parsed.mecanismo.trim() : "",
    prova: typeof parsed.prova === "string" ? parsed.prova.trim() : "",
    aplicacao: typeof parsed.aplicacao === "string" ? parsed.aplicacao.trim() : "",
    direcao: typeof parsed.direcao === "string" ? parsed.direcao.trim() : "",
  }

  const missing = (["hook", "mecanismo", "prova", "aplicacao", "direcao"] as const).filter(
    (k) => !result[k]
  )
  if (missing.length > 0) {
    throw new Error(
      `[brandsdecoded-v4/espinha] JSON inválido: campos ausentes (${missing.join(", ")}).`
    )
  }

  return result
}
