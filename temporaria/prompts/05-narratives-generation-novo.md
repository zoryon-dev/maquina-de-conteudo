# 05. Narratives Generation

**ID:** `narratives-generation`
**Modelo:** `openai/gpt-5-mini`
**Temperature:** 0.7
**Uso:** Gerar 4 narrativas tribais para um tema

---

```xml
<prompt id="narratives-generation">
<contexto_marca>
<tom>${brand.voiceTone || 'Autêntico e direto'}</tom>
<voz>${brand.brandVoice || ''}</voz>
<diferenciais>${brand.differentials || ''}</diferenciais>
<termos_proibidos>${brand.forbiddenTerms || ''}</termos_proibidos>
<dores_audiencia>${brand.fearsAndPains || ''}</dores_audiencia>
<desejos_audiencia>${brand.desiresAndAspirations || ''}</desejos_audiencia>
</contexto_marca>

<contexto_rag>
${ragContext || '(Nenhum documento adicional fornecido)'}
</contexto_rag>

<pesquisa_sintetizada>
${synthesizedResearch ? `
Throughlines identificados: ${synthesizedResearch.throughlines_potenciais}
Tensões narrativas: ${synthesizedResearch.tensoes_narrativas}
Hooks sugeridos: ${synthesizedResearch.hooks}
Dados contextualizados: ${synthesizedResearch.dados_contextualizados}
` : '(Nenhuma pesquisa prévia disponível)'}
</pesquisa_sintetizada>

<briefing>
<tema_central>${input.theme}</tema_central>
<contexto>${input.context || ''}</contexto>
<objetivo>${input.objective || 'Gerar conexão tribal'}</objetivo>
<publico_alvo>${input.targetAudience || 'Pessoas que compartilham valores e crenças similares ao criador'}</publico_alvo>
</briefing>

<tarefa>
Gere EXATAMENTE 4 narrativas tribais, uma para CADA ângulo tribal (Herege, Visionário, Tradutor, Testemunha).

Cada narrativa deve:
- Representar seu ângulo de forma autêntica e distinta
- Conectar a audiência a uma CRENÇA COMPARTILHADA
- DESAFIAR algum status quo ou senso comum do nicho
- Posicionar o criador como LÍDER DO MOVIMENTO, não professor
- Refletir o tom e voz da marca
- NUNCA usar termos proibidos listados acima
</tarefa>

<angulos_tribais>
Cada ângulo tem uma energia e propósito diferentes:

1. **HEREGE** (Energia: Confronto construtivo)
   Desafia verdade aceita, provoca reflexão incômoda.
   → "Todo mundo diz X, mas a verdade é Y"
   → Funciona quando: há consenso falso no nicho que precisa ser quebrado

2. **VISIONÁRIO** (Energia: Inspiração)
   Mostra futuro possível, inspira mudança.
   → "Imagine um mundo onde..."
   → Funciona quando: audiência precisa de esperança e direção

3. **TRADUTOR** (Energia: Clareza)
   Simplifica complexo, democratiza conhecimento.
   → "O que ninguém te explicou sobre..."
   → Funciona quando: há confusão ou gatekeeping no nicho

4. **TESTEMUNHA** (Energia: Vulnerabilidade)
   Compartilha jornada pessoal, cria identificação.
   → "Eu costumava acreditar X, até descobrir Y"
   → Funciona quando: audiência precisa ver que não está sozinha
</angulos_tribais>

<criterios_qualidade>
Uma narrativa tribal FORTE:
- O título provoca reação emocional imediata (curiosidade, identificação, ou leve desconforto)
- O hook faz a pessoa pensar "isso é sobre mim" nos primeiros 3 segundos
- A core_belief é algo que a audiência já sente mas nunca articulou
- O status_quo_challenged é específico do nicho, não genérico
- A transformação prometida é crível e desejável

Uma narrativa tribal FRACA (evite):
- Título genérico que poderia ser de qualquer nicho
- Hook que soa como manchete de blog
- Core_belief óbvia ou clichê
- Status_quo vago ("a sociedade", "o sistema")
</criterios_qualidade>

<anti_patterns>
NUNCA gere narrativas que:
- Soem como títulos de artigo de blog genérico
- Usem promessas exageradas ("O segredo que ninguém conta")
- Ataquem pessoas em vez de ideias
- Sejam controversas apenas por provocar, sem valor real
- Prometam transformação que o conteúdo não pode entregar
- Usem os termos proibidos da marca
- Sejam variações superficiais uma da outra
</anti_patterns>

<formato_narrativa>
Para cada narrativa, forneça:
- **id**: UUID v4 único (ex: "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
- **title**: Gancho tribal em no máximo 10 palavras — deve provocar reação
- **description**: Uma frase que captura a transformação oferecida
- **angle**: herege | visionario | tradutor | testemunha
- **hook**: Primeira frase que cria reconhecimento imediato (máx 20 palavras)
- **core_belief**: A crença compartilhada que une criador e audiência
- **status_quo_challenged**: O que esse conteúdo questiona (específico do nicho)
</formato_narrativa>

<fallback>
Se o tema for genérico demais para gerar narrativas tribais fortes, retorne:
{
  "narratives": [],
  "feedback": "Tema muito amplo. Sugira ao usuário especificar: [sugestão 1], [sugestão 2], [sugestão 3]"
}
</fallback>

<regras_output>
1. Retorne APENAS JSON válido, sem markdown, sem comentários
2. NUNCA inclua rótulos como "Título:", "Hook:" no conteúdo dos campos
3. Cada campo deve conter apenas o texto final, limpo
4. Os 4 ângulos devem estar presentes (um de cada)
5. IDs devem ser UUIDs únicos, não números sequenciais
</regras_output>

<formato_resposta>
{
  "narratives": [
    {
      "id": "uuid-v4-unico",
      "title": "Gancho tribal curto",
      "description": "Transformação que o conteúdo oferece",
      "angle": "herege",
      "hook": "Primeira frase que cria reconhecimento",
      "core_belief": "Crença que une criador e audiência",
      "status_quo_challenged": "Senso comum específico sendo questionado"
    },
    {
      "id": "uuid-v4-unico",
      "title": "...",
      "description": "...",
      "angle": "visionario",
      "hook": "...",
      "core_belief": "...",
      "status_quo_challenged": "..."
    },
    {
      "id": "uuid-v4-unico",
      "title": "...",
      "description": "...",
      "angle": "tradutor",
      "hook": "...",
      "core_belief": "...",
      "status_quo_challenged": "..."
    },
    {
      "id": "uuid-v4-unico",
      "title": "...",
      "description": "...",
      "angle": "testemunha",
      "hook": "...",
      "core_belief": "...",
      "status_quo_challenged": "..."
    }
  ]
}
</formato_resposta>

<exemplo>
Tema: "Produtividade para empreendedores"

{
  "narratives": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "title": "Produtividade tóxica está matando seu negócio",
      "description": "Descobrir que fazer menos, melhor, gera mais resultado",
      "angle": "herege",
      "hook": "Você não precisa de mais disciplina. Você precisa de menos tarefas.",
      "core_belief": "Qualidade de vida e sucesso não são opostos",
      "status_quo_challenged": "A cultura de 'hustle' como única forma de crescer"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "O empreendedor de 2030 trabalha 4 horas por dia",
      "description": "Visualizar um modelo de negócio que respeita sua energia",
      "angle": "visionario",
      "hook": "Daqui a 5 anos, quem trabalha 12 horas vai parecer antiquado.",
      "core_belief": "Tecnologia existe para nos libertar, não para nos escravizar mais",
      "status_quo_challenged": "Horas trabalhadas como medida de comprometimento"
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "title": "Por que sua lista de tarefas nunca funciona",
      "description": "Entender o erro estrutural que sabota sua execução",
      "angle": "tradutor",
      "hook": "Não é falta de disciplina. Sua lista está desenhada para falhar.",
      "core_belief": "Sistemas inteligentes superam força de vontade",
      "status_quo_challenged": "A ideia de que produtividade é questão de esforço pessoal"
    },
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "title": "Eu queimei trabalhando 14 horas por dia",
      "description": "Aprender com a jornada de quem já pagou o preço",
      "angle": "testemunha",
      "hook": "Em 2019, eu achava que descanso era para fracos. Meu corpo discordou.",
      "core_belief": "Sucesso sustentável exige respeitar seus limites",
      "status_quo_challenged": "Glorificação do sacrifício como prova de dedicação"
    }
  ]
}
</exemplo>
</prompt>


Mudanças feitas:

Contexto de marca — nova seção com tom, voz, diferenciais, termos proibidos, dores e desejos da audiência
Pesquisa sintetizada — nova seção que incorpora throughlines, tensões, hooks e dados do Synthesizer (quando disponível)
Ângulos tribais expandidos — adicionei "energia" de cada ângulo e quando funciona melhor
Critérios de qualidade — nova seção definindo o que é narrativa forte vs fraca
Anti-patterns — 7 comportamentos específicos a evitar
Diversidade forçada — tarefa agora exige explicitamente "uma para CADA ângulo"
Fallback — instrução para quando tema é genérico demais
Regras de output — 5 regras explícitas incluindo proibição de marcadores
Formato resposta — agora mostra estrutura completa com os 4 ângulos
Exemplo completo — expandido para mostrar todas as 4 narrativas com UUIDs reais


COMENTÁRIO SOBRE OUTPUT:
O formato de resposta foi expandido para mostrar a estrutura esperada com 4 narrativas. O campo feedback foi adicionado ao fallback para casos onde o tema precisa ser refinado. Se a integração espera sempre 4 narrativas, o fallback pode precisar de tratamento especial no código.
