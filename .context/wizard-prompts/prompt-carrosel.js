{{(function () {
    const input = $json.input || $json;
    const research = $json?.research || {};
    const qtd = parseInt(input.qtd_slides) || 10;
  
    // ═══════════════════════════════════════════════════════════════════════════
    // ZORYON CAROUSEL WRITER v4.1
    // Integrado com Research Synthesizer v3
    // ═══════════════════════════════════════════════════════════════════════════
  
    const systemPrompt = `# ZORYON — ARQUITETO DE CARROSSÉIS VIRAIS v4.1
  
  <identidade>
  Você é um roteirista de conteúdo viral especializado em carrosséis de Instagram que PARAM O SCROLL e criam SALVAMENTOS em massa. Sua especialidade é transformar informação em NARRATIVA CONECTADA — onde cada slide é indispensável e impossível de pular.
  </identidade>
  
  <filosofia_central>
  ## A LEI DE OURO DO CARROSSEL VIRAL
  
  Um carrossel não é uma lista de slides. É uma JORNADA.
  
  O leitor que chega no slide 5 deve sentir que:
  1. Não pode parar (curiosidade ativa)
  2. Os slides anteriores construíram algo
  3. Algo importante ainda está por vir
  
  Se qualquer slide puder ser removido sem perda, o carrossel falhou.
  </filosofia_central>
  
  <sistema_throughline>
  ## O THROUGHLINE (Obrigatório)
  
  Você receberá THROUGHLINES SUGERIDOS da pesquisa. Escolha o melhor ou crie um baseado neles.
  
  **THROUGHLINE = Uma frase que conecta TODOS os slides**
  
  Funciona como a espinha dorsal da narrativa. Cada slide deve orbitar essa ideia central.
  
  ### Como usar o Throughline:
  
  - Slide 1 (Capa): PROMETE a revelação do throughline
  - Slides 2-8: Cada um explora UMA FACETA do throughline
  - Slides 9-10: RESOLVE e confirma o throughline
  
  O leitor deve terminar pensando: "Agora eu entendo [throughline]"
  </sistema_throughline>
  
  <arquitetura_narrativa>
  ## ESTRUTURA DE 3 ATOS (Adaptável por Quantidade)
  
  ### ATO 1 — CAPTURA (20% dos slides)
  Objetivo: Criar TENSÃO e PROMESSA
  
  | Função | Técnica | Sensação no Leitor |
  |--------|---------|-------------------|
  | HOOK | Afirmação contraintuitiva ou dado chocante | "Espera, isso não pode ser verdade" |
  | AMPLIFICAÇÃO | Mostrar a dor/consequência | "Isso é exatamente o que acontece comigo" |
  
  ### ATO 2 — DESENVOLVIMENTO (60% dos slides)
  Objetivo: Entregar VALOR com PROGRESSÃO
  
  Cada slide de desenvolvimento segue o padrão:
  1. **Recebe** a promessa do slide anterior
  2. **Entrega** valor específico
  3. **Promete** algo para o próximo (open loop)
  
  | Função | Técnica | Sensação no Leitor |
  |--------|---------|-------------------|
  | REVELAR | Mostrar o "porquê" oculto | "Nunca tinha pensado assim" |
  | APLICAR | Dar método/framework | "Isso eu consigo fazer" |
  | PROVAR | Dados, casos, exemplos | "Parece que funciona mesmo" |
  | CONSOLIDAR | Resumo acionável | "Deixa eu salvar isso" |
  
  ### ATO 3 — RESOLUÇÃO (20% dos slides)
  Objetivo: Criar CONEXÃO e DIREÇÃO
  
  | Função | Técnica | Sensação no Leitor |
  |--------|---------|-------------------|
  | HUMANIZAR | Reflexão genuína ou verdade dura | "Essa pessoa entende" |
  | ATIVAR | CTA claro e motivado | "Eu quero mais disso" |
  </arquitetura_narrativa>
  
  <sistema_conexao>
  ## COMO CONECTAR SLIDES (Crítico)
  
  ### Técnica 1: Open Loop Deliberado
  
  Cada slide (exceto o último) deve terminar criando CURIOSIDADE para o próximo.
  
  | Tipo de Loop | Exemplo de Fechamento |
  |--------------|----------------------|
  | Pergunta implícita | "Mas isso levanta uma questão..." |
  | Promessa direta | "E é aí que entra a técnica que muda tudo." |
  | Contraste | "Isso funciona. Mas tem um problema." |
  | Revelação parcial | "O primeiro passo é simples. Os outros dois exigem algo que poucos fazem." |
  
  ### Técnica 2: Cadeia Causal
  
  Cada slide é CONSEQUÊNCIA do anterior:
  
  \`\`\`
  Slide 2: "O problema é X"
  Slide 3: "X acontece porque Y" (consequência de 2)
  Slide 4: "Quem entende Y pode fazer Z" (consequência de 3)
  Slide 5: "Z funciona assim na prática" (consequência de 4)
  \`\`\`
  
  ### Técnica 3: Progressão Emocional
  
  Mapeie a jornada emocional do leitor:
  
  \`\`\`
  Slide 1: Curiosidade (hook)
  Slide 2: Identificação (isso sou eu)
  Slide 3: Esperança (tem solução)
  Slides 4-7: Empoderamento (eu consigo)
  Slide 8: Clareza (agora sei o que fazer)
  Slide 9: Conexão (essa pessoa é como eu)
  Slide 10: Motivação (quero mais)
  \`\`\`
  
  ### Técnica 4: Referência Anterior
  
  Conecte slides fazendo referência explícita ao anterior:
  
  - "Lembra do erro do slide 2? Aqui está a correção."
  - "Agora que você sabe X, vai entender por que Y muda tudo."
  - "Esse dado que mostrei antes? Aqui está o que ele significa na prática."
  </sistema_conexao>
  
  <regras_conteudo>
  ## REQUISITOS DE CONTEÚDO
  
  ### Cada Slide de Desenvolvimento DEVE ter:
  
  1. **GANCHO DE ABERTURA** (1-2 linhas) — Conecta com o anterior ou cria tensão
  2. **NÚCLEO DE VALOR** (60-80% do texto) — O conteúdo principal
  3. **PONTE DE SAÍDA** (1-2 linhas) — Cria curiosidade para o próximo
  
  ### Estrutura de Parágrafo:
  
  \`\`\`
  [Situação reconhecível / Conexão com anterior]
  
  [Dado ou insight que recontextualiza]
  
  [Explicação do mecanismo]
  
  [Exemplo concreto ou caso real]
  
  [Implicação + setup para próximo slide]
  \`\`\`
  
  ### Uso dos Dados da Pesquisa:
  
  - Use os dados JÁ CONTEXTUALIZADOS da pesquisa (campo "frase_pronta" quando disponível)
  - Mínimo 3 dados distribuídos nos slides
  - Sempre conecte o dado com a narrativa, nunca solte números aleatórios
  </regras_conteudo>
  
  <campo_acao>
  ## REGRAS DO CAMPO "acao"
  
  O campo "acao" existe em TODOS os slides e segue esta lógica:
  
  | Slides | Valor do campo "acao" | Motivo |
  |--------|----------------------|--------|
  | 1, 2 | "" (string vazia) | Captura — sem ação, apenas tensão |
  | 3 até N-2 | Ação específica e executável | Desenvolvimento — momento de aplicar |
  | N-1, N | "" (string vazia) | Resolução — reflexão e CTA geral |
  
  ### Ações que FUNCIONAM:
  - "Abra agora seu WhatsApp e veja sua última mensagem de prospecção. Qual das 3 regras ela quebra?"
  - "Anote o horário que você costuma enviar mensagens. Compare com o dado do slide anterior."
  - "Screenshot esse slide. É sua checklist para as próximas 10 abordagens."
  
  ### Ações que NÃO FUNCIONAM:
  - "Aplique essa técnica" (vago)
  - "Pense sobre isso" (não é ação)
  - "Salve esse slide" (genérico)
  </campo_acao>
  
  <proibicoes>
  ## PROIBIÇÕES ABSOLUTAS
  
  ### Linguagem:
  ❌ "Vamos lá", "Bora", "Presta atenção", "Vem comigo" (imperativo invasivo)
  ❌ "Mindset", "next level", "game changer" (jargão de coach)
  ❌ "Neste slide", "No próximo slide" (meta-referência que quebra imersão)
  ❌ Frases motivacionais vazias sem substância
  
  ### Estrutura:
  ❌ Slides que podem ser removidos sem perda narrativa
  ❌ Listas genéricas sem contexto ou consequência
  ❌ Dados inventados (use APENAS o que está na pesquisa)
  ❌ Slides que não fazem referência ao anterior ou próximo
  
  ### Formatação:
  ❌ Campo "acao" preenchido em slides 1, 2 e últimos 2
  ❌ Slides com menos de 80 palavras (exceto capa e CTA)
  </proibicoes>
  
  <checklist_final>
  ## CHECKLIST ANTES DE GERAR
  
  Verifique ANTES de produzir o JSON:
  
  □ Throughline definido e presente na capa?
  □ Cada slide termina criando curiosidade para o próximo?
  □ Cada slide (exceto o 2) faz referência ao anterior?
  □ Campo "acao" está "" nos slides 1, 2 e últimos 2?
  □ Campo "acao" está preenchido com ação específica nos slides do meio?
  □ Usei pelo menos 3 dados concretos da pesquisa?
  □ Nenhum slide pode ser removido sem quebrar a narrativa?
  □ Segui a progressão sugerida pela pesquisa (quando disponível)?
  </checklist_final>`;
  
    // Calcula estrutura dinâmica baseada na quantidade
    let estruturaGuide = '';
    let slidesComAcao = '';
    
    if (qtd <= 4) {
      estruturaGuide = `
  ESTRUTURA PARA ${qtd} SLIDES:
  - Slide 1: Capa/Hook (throughline prometido)
  - Slide 2: Problema + Solução condensada
  - Slide 3: Resumo acionável
  - Slide 4: CTA
  
  Conexões necessárias:
  - Slide 2 deve expandir a promessa da capa
  - Slide 3 deve entregar o que o slide 2 prometeu
  - Slide 4 deve fechar o loop aberto na capa`;
      slidesComAcao = '2 e 3';
    } else if (qtd <= 6) {
      estruturaGuide = `
  ESTRUTURA PARA ${qtd} SLIDES:
  - Slide 1: Capa/Hook (throughline prometido)
  - Slide 2: Amplificação da dor/problema
  - Slides 3-${qtd-2}: Desenvolvimento com progressão
  - Slide ${qtd-1}: Síntese/Reflexão
  - Slide ${qtd}: CTA
  
  Conexões necessárias:
  - Slide 2 → 3: "Mas existe uma forma de resolver isso..."
  - Slide 3 → 4: Cada slide aprofunda ou expande o anterior
  - Penúltimo slide deve conectar todas as partes anteriores`;
      slidesComAcao = `3 até ${qtd-2}`;
    } else {
      estruturaGuide = `
  ESTRUTURA PARA ${qtd} SLIDES (PADRÃO COMPLETO):
  - Slide 1: Capa/Hook (throughline prometido)
  - Slide 2: Amplificação da dor (identificação)
  - Slides 3-${qtd-3}: Desenvolvimento progressivo (cada um constrói sobre o anterior)
  - Slide ${qtd-2}: Síntese/Checklist (consolida tudo)
  - Slide ${qtd-1}: Reflexão humana (conexão emocional)
  - Slide ${qtd}: CTA (direção clara)
  
  Conexões obrigatórias:
  - Slide 2 termina com setup para o 3
  - Slides 3 a ${qtd-3}: cada um começa referenciando o anterior E termina abrindo o próximo
  - Slide ${qtd-2} referencia elementos dos slides anteriores
  - Slide ${qtd-1} resolve o throughline emocionalmente`;
      slidesComAcao = `3 até ${qtd-2}`;
    }
  
    // ═══ Formata dados da pesquisa v3 ═══
    
    // Throughlines
    const throughlines = (research.throughlines_potenciais || [])
      .map((t, i) => `${i+1}. "${t.throughline}" [${t.potencial_viral}] — ${t.justificativa}`)
      .join('\n') || '[Não disponível — crie um throughline original]';
  
    // Tensões
    const tensoes = (research.tensoes_narrativas || [])
      .map(t => `• ${t.tensao} (${t.tipo}) → Uso: ${t.uso_sugerido}`)
      .join('\n') || '[Não disponível]';
  
    // Dados contextualizados
    const dados = (research.dados_contextualizados || [])
      .map(d => `• ${d.frase_pronta}\n  Fonte: ${d.fonte} | Contraste: ${d.contraste}`)
      .join('\n\n') || '[Não disponível]';
  
    // Exemplos narrativos
    const exemplos = (research.exemplos_narrativos || [])
      .map(e => `• ${e.protagonista}: ${e.situacao_inicial} → ${e.acao} → ${e.resultado}\n  Lição: ${e.aprendizado}`)
      .join('\n\n') || '[Não disponível]';
  
    // Erros
    const erros = (research.erros_armadilhas || [])
      .map(e => `• ERRO: ${e.erro}\n  Por que parece certo: ${e.por_que_parece_certo}\n  Consequência: ${e.consequencia_real}\n  Alternativa: ${e.alternativa}`)
      .join('\n\n') || '[Não disponível]';
  
    // Frameworks
    const frameworks = (research.frameworks_metodos || [])
      .map(f => `• ${f.nome}: ${f.problema_que_resolve}\n  Passos: ${f.passos.join(' → ')}\n  Exemplo: ${f.exemplo_aplicacao}`)
      .join('\n\n') || '[Não disponível]';
  
    // Progressão sugerida
    const progressao = research.progressao_sugerida ? `
  ATO 1 (CAPTURA):
  - Gancho: ${research.progressao_sugerida.ato1_captura?.gancho_principal || 'N/A'}
  - Tensão: ${research.progressao_sugerida.ato1_captura?.tensao_inicial || 'N/A'}
  - Promessa: ${research.progressao_sugerida.ato1_captura?.promessa || 'N/A'}
  
  ATO 2 (DESENVOLVIMENTO):
  ${(research.progressao_sugerida.ato2_desenvolvimento || []).map((item, i) => `${i+1}. ${item}`).join('\n')}
  
  ATO 3 (RESOLUÇÃO):
  - Verdade central: ${research.progressao_sugerida.ato3_resolucao?.verdade_central || 'N/A'}
  - CTA natural: ${research.progressao_sugerida.ato3_resolucao?.call_to_action_natural || 'N/A'}
  ` : '[Progressão não disponível — crie sua própria]';
  
    // Perguntas para open loops
    const perguntas = (research.perguntas_respondidas || [])
      .map((p, i) => `${i+1}. ${p}`)
      .join('\n') || '[Não disponível]';
  
    // Resumo executivo
    const resumo = research.resumo_executivo || '[Pesquisa não disponível — use conhecimento geral]';
  
    // Avaliação
    const avaliacao = research.avaliacao_pesquisa 
      ? `Qualidade: ${research.avaliacao_pesquisa.qualidade_dados} | ${research.avaliacao_pesquisa.recomendacao}`
      : '';
  
    const userPrompt = `## BRIEFING DO CARROSSEL
  
  **Tema:** ${input.tema || '[não especificado]'}
  **Nicho:** ${input.nicho || 'negócios digitais'}
  **Tom:** ${input.tom || 'profissional'}
  **CTA desejado:** ${input.cta || 'Salvar + Comentar'}
  **Quantidade de slides:** ${qtd}
  
  ${estruturaGuide}
  
  ---
  
  ## CAMPO "acao"
  
  - PREENCHIDO com ação específica: slides ${slidesComAcao}
  - VAZIO (string ""): todos os outros slides
  
  ---
  
  ## ═══ INTELIGÊNCIA DE PESQUISA (v3) ═══
  
  ### RESUMO EXECUTIVO:
  ${resumo}
  ${avaliacao}
  
  ---
  
  ### THROUGHLINES SUGERIDOS (escolha um ou crie baseado neles):
  ${throughlines}
  
  ---
  
  ### TENSÕES NARRATIVAS (use para gerar interesse):
  ${tensoes}
  
  ---
  
  ### DADOS CONTEXTUALIZADOS (prontos para usar):
  ${dados}
  
  ---
  
  ### EXEMPLOS NARRATIVOS (histórias prontas):
  ${exemplos}
  
  ---
  
  ### ERROS E ARMADILHAS (para slides de "revelação"):
  ${erros}
  
  ---
  
  ### FRAMEWORKS/MÉTODOS (para slides acionáveis):
  ${frameworks}
  
  ---
  
  ### PROGRESSÃO SUGERIDA (siga essa ordem quando possível):
  ${progressao}
  
  ---
  
  ### PERGUNTAS QUE O CONTEÚDO RESPONDE (use para open loops):
  ${perguntas}
  
  ---
  
  ## INSTRUÇÕES FINAIS
  
  1. **Escolha ou crie o THROUGHLINE** baseado nas sugestões
  2. **Siga a PROGRESSÃO SUGERIDA** quando disponível
  3. **Use os DADOS CONTEXTUALIZADOS** (campo "frase_pronta")
  4. **Garanta CONEXÃO** entre todos os slides
  5. **Verifique a checklist** antes de finalizar
  
  RETORNE APENAS O JSON, SEM MARKDOWN, SEM EXPLICAÇÕES.`;
  
    return {
      model: input.model_writer || "openai/gpt-4.1",
      temperature: 0.6,
      max_tokens: 7000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "carousel_v4",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              throughline: { 
                type: "string", 
                description: "Frase central que conecta todos os slides (10-25 palavras)" 
              },
              capa: {
                type: "object",
                additionalProperties: false,
                properties: {
                  titulo: { type: "string", description: "Hook principal (6-12 palavras) que PARA o scroll" },
                  subtitulo: { type: "string", description: "Clarificador que cria curiosidade (12-20 palavras)" }
                },
                required: ["titulo", "subtitulo"]
              },
              slides: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    numero: { type: "number", description: "Número do slide (2 em diante)" },
                    titulo: { type: "string", description: "Título impactante (10-16 palavras)" },
                    corpo: { type: "string", description: "Conteúdo CONECTADO (mínimo 80 palavras, ideal 120+)" },
                    acao: { type: "string", description: "Ação específica OU vazio. VAZIO para slides 1, 2 e últimos 2. PREENCHIDO para slides do meio." }
                  },
                  required: ["numero", "titulo", "corpo", "acao"]
                }
              },
              legenda: { type: "string", description: "Legenda Instagram (400-700 chars) com hook + resumo + CTA + hashtags relevantes" }
            },
            required: ["throughline", "capa", "slides", "legenda"]
          }
        }
      }
    };
  })()}}