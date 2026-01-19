{{(function () {
    const data = $json;
    const raw = data.research_raw || {};
    const plan = data.research_plan || {};
    const input = data.input || {};
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ZORYON RESEARCH SYNTHESIZER v3.0
    // Otimizado para alimentar o Carousel Writer v4 (Narrativa Conectada)
    // ═══════════════════════════════════════════════════════════════════════════
  
    const systemPrompt = `# ZORYON RESEARCH SYNTHESIZER v3.0
  
  <identidade>
  Você é um estrategista de conteúdo especializado em transformar pesquisa bruta em INSUMOS NARRATIVOS para carrosséis virais de Instagram. Seu output alimenta diretamente um sistema de geração de conteúdo que precisa de:
  1. Um THROUGHLINE (ideia central que conecta tudo)
  2. TENSÕES NARRATIVAS (contradições e surpresas que prendem atenção)
  3. PROGRESSÃO LÓGICA (ordem natural de apresentar ideias)
  </identidade>
  
  <filosofia>
  ## PRINCÍPIO CENTRAL
  
  Pesquisa boa não é sobre QUANTIDADE de dados.
  É sobre encontrar a TENSÃO CENTRAL do tema — aquilo que faz alguém parar e pensar "eu não sabia disso".
  
  Seu trabalho é identificar:
  - O que SURPREENDE sobre esse tema?
  - O que CONTRADIZ o senso comum?
  - Qual a VERDADE INCÔMODA que poucos falam?
  - Qual o ERRO INVISÍVEL que a maioria comete?
  
  Esses são os ingredientes de conteúdo viral.
  </filosofia>
  
  <framework_extracao>
  ## O QUE EXTRAIR (Em Ordem de Prioridade)
  
  ### 1. THROUGHLINES POTENCIAIS (CRÍTICO)
  Identifique 3-5 frases que poderiam ser a IDEIA CENTRAL de um carrossel inteiro.
  
  Características de um bom throughline:
  - Conecta PROBLEMA → CAUSA → SOLUÇÃO em uma frase
  - Contém uma VERDADE CONTRAINTUITIVA
  - É ESPECÍFICO (não genérico)
  - Gera CURIOSIDADE
  
  Exemplos de throughlines fortes:
  - "O que separa quem vende de quem é ignorado está nos primeiros 15 segundos"
  - "Produtividade não é fazer mais — é proteger sua energia dos ladrões invisíveis"
  - "90% dos posts falham não pelo conteúdo, mas pelo timing do algoritmo"
  
  Exemplos de throughlines FRACOS (evite):
  - "Vendas são importantes para o negócio" (óbvio)
  - "Existem várias formas de ser produtivo" (vago)
  - "O Instagram muda muito" (genérico)
  
  ### 2. TENSÕES E CONTRADIÇÕES
  O combustível da viralidade. Procure:
  
  | Tipo de Tensão | Exemplo | Por que funciona |
  |----------------|---------|------------------|
  | Dado vs. Crença | "73% falham, mas todos acham que vão ser exceção" | Quebra ilusão |
  | Especialista vs. Especialista | "Guru A diz X, pesquisa mostra Y" | Gera debate |
  | Antes vs. Depois | "Em 2020 funcionava, em 2024 é spam" | Mostra mudança |
  | Esforço vs. Resultado | "Quem posta menos às vezes engaja mais" | Contraintuitivo |
  | Causa oculta | "O problema não é X (óbvio), é Y (invisível)" | Revela verdade |
  
  ### 3. DADOS COM CONTEXTO
  Dados sozinhos são esquecíveis. Dados COM HISTÓRIA grudam.
  
  ❌ Ruim: "73% das vendas falham"
  ✅ Bom: "73% das vendas no WhatsApp morrem no primeiro contato — e o erro não é a oferta, é a abertura"
  
  Para cada dado, extraia:
  - O número/estatística
  - A IMPLICAÇÃO (o que isso significa na prática)
  - O CONTRASTE (vs. o que as pessoas assumem)
  - A FONTE (para credibilidade)
  
  ### 4. EXEMPLOS NARRATIVOS
  Casos que podem virar HISTÓRIA dentro do carrossel.
  
  Priorize exemplos que têm:
  - Nome/empresa real (verificável)
  - Números específicos (resultado concreto)
  - Contexto relatable (o público se vê naquilo)
  - Arco narrativo (problema → ação → resultado)
  
  ### 5. ERROS E ARMADILHAS
  O que o público está fazendo ERRADO sem saber.
  
  Para cada erro, mapeie:
  - O comportamento errado (específico)
  - Por que parece certo (a armadilha)
  - A consequência real (o preço)
  - A alternativa (o que fazer em vez)
  
  ### 6. FRAMEWORKS E MÉTODOS
  Processos que podem ser ensinados em 1-2 slides.
  
  Priorize frameworks que:
  - Têm nome memorável (ou dê um nome)
  - Têm 3-5 passos (não mais)
  - Resolvem um problema específico
  - Podem ser aplicados imediatamente
  
  ### 7. PROGRESSÃO SUGERIDA
  Sugira uma ORDEM LÓGICA para apresentar os insights.
  
  Use a estrutura de 3 atos:
  - **ATO 1 (Captura)**: Que tensão/dado deve abrir para PARAR o scroll?
  - **ATO 2 (Desenvolvimento)**: Qual a sequência lógica de revelações?
  - **ATO 3 (Resolução)**: Qual verdade maior fecha o arco?
  
  ### 8. GAPS E PERGUNTAS
  O que a pesquisa NÃO respondeu que seria interessante abordar.
  Perguntas que o público provavelmente tem após consumir o conteúdo.
  </framework_extracao>
  
  <criterios_priorizacao>
  ## COMO PRIORIZAR (Escala de Viralidade)
  
  Para cada insight extraído, avalie:
  
  | Critério | Peso | Pergunta |
  |----------|------|----------|
  | SURPRESA | 30% | Isso contradiz o que a maioria pensa? |
  | APLICABILIDADE | 25% | A pessoa pode usar isso HOJE? |
  | ESPECIFICIDADE | 20% | Tem números, nomes, contexto? |
  | EMOÇÃO | 15% | Isso gera identificação ou indignação? |
  | COMPARTILHABILIDADE | 10% | A pessoa vai querer mostrar pra alguém? |
  
  Priorize insights que pontuam alto em múltiplos critérios.
  </criterios_priorizacao>
  
  <regras_rigidas>
  ## REGRAS INVIOLÁVEIS
  
  1. **NÃO INVENTE DADOS** — Se não está na pesquisa, não existe
  2. **CITE FONTES** — Sempre que possível, indique de onde veio
  3. **SEJA ESPECÍFICO** — "Empresa X fez Y" > "Algumas empresas fazem isso"
  4. **CONTEXTUALIZE NÚMEROS** — Dado sem contexto é ruído
  5. **PRIORIZE O CONTRAINTUITIVO** — O óbvio não viraliza
  6. **PENSE EM NARRATIVA** — Como isso vira história, não lista?
  
  Se a pesquisa for insuficiente em alguma área, diga explicitamente:
  "[Área X]: Pesquisa insuficiente — necessário complementar com [sugestão]"
  </regras_rigidas>
  
  <formato_output>
  ## FORMATO DE SAÍDA
  
  Retorne JSON estruturado otimizado para o Carousel Writer v4.
  Cada campo deve ser preenchido com o máximo de contexto útil.
  </formato_output>`;
  
    const userPrompt = `## CONTEXTO DO CARROSSEL
  
  **Tema:** ${plan.topic || input.tema || 'não especificado'}
  **Nicho:** ${plan.niche || input.nicho || 'geral'}
  **Foco da pesquisa:** ${plan.research_focus || 'geral'}
  **Quantidade de slides:** ${input.qtd_slides || 10}
  **Tom desejado:** ${input.tom || 'profissional'}
  
  ---
  
  ## DADOS BRUTOS DA PESQUISA
  
  ### CAMADA FUNDAÇÃO (Conceitos base):
  ${raw.summary_by_layer?.foundation || 'Não disponível'}
  
  ### CAMADA PROFUNDIDADE (Detalhes técnicos):
  ${raw.summary_by_layer?.depth || 'Não disponível'}
  
  ### CAMADA DIFERENCIAÇÃO (Ângulos únicos):
  ${raw.summary_by_layer?.differentiation || 'Não disponível'}
  
  ---
  
  ### TOP CONTEÚDOS ENCONTRADOS:
  ${raw.top_contents || 'Não disponível'}
  
  ---
  
  ### DADOS/MÉTRICAS IDENTIFICADOS:
  ${(raw.data_points || []).join('\n\n') || 'Não disponível'}
  
  ---
  
  ### RISCOS/ERROS ENCONTRADOS:
  ${(raw.risks_found || []).join('\n\n') || 'Não disponível'}
  
  ---
  
  ### FONTES CONSULTADAS:
  ${(raw.sources || []).slice(0, 15).join('\n') || 'Não disponível'}
  
  ---
  
  ## SUA TAREFA
  
  Sintetize toda essa pesquisa em INSUMOS NARRATIVOS para um carrossel de ${input.qtd_slides || 10} slides.
  
  Priorize:
  1. Identificar 3-5 THROUGHLINES potenciais (ideias centrais)
  2. Extrair TENSÕES e CONTRADIÇÕES (combustível viral)
  3. Contextualizar DADOS com implicações práticas
  4. Sugerir uma PROGRESSÃO NARRATIVA para os slides
  
  Lembre-se: O copywriter precisa criar slides que se CONECTAM entre si.
  Seu output deve facilitar essa conexão.`;
  
    return {
      model: input.model_synth || "openai/gpt-4.1",
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "research_synthesis_v3",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              
              // ═══ NOVO: Throughlines potenciais ═══
              throughlines_potenciais: {
                type: "array",
                description: "3-5 ideias centrais que poderiam conectar todo o carrossel",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    throughline: { 
                      type: "string", 
                      description: "A frase central (15-30 palavras)" 
                    },
                    angulo: { 
                      type: "string", 
                      description: "Que ângulo/perspectiva esse throughline explora" 
                    },
                    potencial_viral: { 
                      type: "string", 
                      enum: ["alto", "medio", "baixo"],
                      description: "Avaliação do potencial viral" 
                    },
                    justificativa: { 
                      type: "string", 
                      description: "Por que esse throughline funciona" 
                    }
                  },
                  required: ["throughline", "angulo", "potencial_viral", "justificativa"]
                }
              },
  
              // ═══ NOVO: Tensões e contradições ═══
              tensoes_narrativas: {
                type: "array",
                description: "Contradições, surpresas e debates que geram engajamento",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    tensao: { 
                      type: "string", 
                      description: "A contradição ou surpresa identificada" 
                    },
                    tipo: { 
                      type: "string",
                      enum: ["dado_vs_crenca", "antes_vs_depois", "esforco_vs_resultado", "causa_oculta", "especialista_vs_especialista", "outro"],
                      description: "Tipo de tensão" 
                    },
                    uso_sugerido: { 
                      type: "string", 
                      description: "Como usar essa tensão no carrossel (capa, desenvolvimento, etc)" 
                    }
                  },
                  required: ["tensao", "tipo", "uso_sugerido"]
                }
              },
  
              // ═══ MELHORADO: Dados com contexto ═══
              dados_contextualizados: {
                type: "array",
                description: "Estatísticas e números COM implicação prática",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    dado: { 
                      type: "string", 
                      description: "O número/estatística" 
                    },
                    implicacao: { 
                      type: "string", 
                      description: "O que isso significa na prática" 
                    },
                    contraste: { 
                      type: "string", 
                      description: "Vs. o que as pessoas assumem/esperam" 
                    },
                    fonte: { 
                      type: "string", 
                      description: "De onde veio esse dado" 
                    },
                    frase_pronta: { 
                      type: "string", 
                      description: "Uma frase pronta para usar no carrossel" 
                    }
                  },
                  required: ["dado", "implicacao", "contraste", "fonte", "frase_pronta"]
                }
              },
  
              // ═══ MELHORADO: Exemplos narrativos ═══
              exemplos_narrativos: {
                type: "array",
                description: "Casos reais que podem virar história",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    protagonista: { 
                      type: "string", 
                      description: "Quem (pessoa, empresa, marca)" 
                    },
                    situacao_inicial: { 
                      type: "string", 
                      description: "O problema/contexto inicial" 
                    },
                    acao: { 
                      type: "string", 
                      description: "O que fizeram" 
                    },
                    resultado: { 
                      type: "string", 
                      description: "O resultado concreto (com números se possível)" 
                    },
                    aprendizado: { 
                      type: "string", 
                      description: "A lição que o público pode extrair" 
                    }
                  },
                  required: ["protagonista", "situacao_inicial", "acao", "resultado", "aprendizado"]
                }
              },
  
              // ═══ MELHORADO: Erros com estrutura narrativa ═══
              erros_armadilhas: {
                type: "array",
                description: "Erros comuns com estrutura de 'revelação'",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    erro: { 
                      type: "string", 
                      description: "O comportamento errado (específico)" 
                    },
                    por_que_parece_certo: { 
                      type: "string", 
                      description: "Por que as pessoas caem nessa armadilha" 
                    },
                    consequencia_real: { 
                      type: "string", 
                      description: "O preço de cometer esse erro" 
                    },
                    alternativa: { 
                      type: "string", 
                      description: "O que fazer em vez disso" 
                    }
                  },
                  required: ["erro", "por_que_parece_certo", "consequencia_real", "alternativa"]
                }
              },
  
              // ═══ MANTIDO: Frameworks ═══
              frameworks_metodos: {
                type: "array",
                description: "Processos ensinávels em 1-2 slides",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    nome: { 
                      type: "string", 
                      description: "Nome do framework (crie um se não tiver)" 
                    },
                    problema_que_resolve: { 
                      type: "string", 
                      description: "Que problema específico isso resolve" 
                    },
                    passos: {
                      type: "array",
                      items: { type: "string" },
                      description: "3-5 passos do framework"
                    },
                    exemplo_aplicacao: { 
                      type: "string", 
                      description: "Exemplo concreto de uso" 
                    }
                  },
                  required: ["nome", "problema_que_resolve", "passos", "exemplo_aplicacao"]
                }
              },
  
              // ═══ NOVO: Progressão narrativa sugerida ═══
              progressao_sugerida: {
                type: "object",
                additionalProperties: false,
                description: "Sugestão de ordem para apresentar os insights",
                properties: {
                  ato1_captura: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      gancho_principal: { type: "string" },
                      tensao_inicial: { type: "string" },
                      promessa: { type: "string" }
                    },
                    required: ["gancho_principal", "tensao_inicial", "promessa"]
                  },
                  ato2_desenvolvimento: {
                    type: "array",
                    items: { type: "string" },
                    description: "Sequência lógica de revelações/insights (ordem importa)"
                  },
                  ato3_resolucao: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      verdade_central: { type: "string" },
                      call_to_action_natural: { type: "string" }
                    },
                    required: ["verdade_central", "call_to_action_natural"]
                  }
                },
                required: ["ato1_captura", "ato2_desenvolvimento", "ato3_resolucao"]
              },
  
              // ═══ NOVO: Perguntas que o conteúdo responde ═══
              perguntas_respondidas: {
                type: "array",
                items: { type: "string" },
                description: "Perguntas que o público tem e que esse conteúdo responde (útil para open loops)"
              },
  
              // ═══ MANTIDO: Gaps ═══
              gaps_oportunidades: {
                type: "array",
                items: { type: "string" },
                description: "O que a pesquisa não cobriu / oportunidades para conteúdo futuro"
              },
  
              // ═══ MELHORADO: Resumo executivo ═══
              resumo_executivo: {
                type: "string",
                description: "Resumo de 3-5 frases: principal insight + tensão central + potencial do tema"
              },
  
              // ═══ NOVO: Avaliação da pesquisa ═══
              avaliacao_pesquisa: {
                type: "object",
                additionalProperties: false,
                properties: {
                  qualidade_dados: {
                    type: "string",
                    enum: ["excelente", "boa", "suficiente", "insuficiente"],
                    description: "Qualidade geral dos dados encontrados"
                  },
                  areas_fortes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Onde a pesquisa foi mais rica"
                  },
                  areas_fracas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Onde precisaria de mais pesquisa"
                  },
                  recomendacao: {
                    type: "string",
                    description: "Recomendação para o copywriter (prosseguir, complementar, etc)"
                  }
                },
                required: ["qualidade_dados", "areas_fortes", "areas_fracas", "recomendacao"]
              }
            },
            required: [
              "throughlines_potenciais",
              "tensoes_narrativas",
              "dados_contextualizados",
              "exemplos_narrativos",
              "erros_armadilhas",
              "frameworks_metodos",
              "progressao_sugerida",
              "perguntas_respondidas",
              "gaps_oportunidades",
              "resumo_executivo",
              "avaliacao_pesquisa"
            ]
          }
        }
      }
    };
  })()}}