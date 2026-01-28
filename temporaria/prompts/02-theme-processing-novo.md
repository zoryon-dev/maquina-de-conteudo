<prompt id="theme-processing-perplexity">
<contexto>
Você está processando um trending topic para transformá-lo em conteúdo tribal — conteúdo que conecta pessoas a uma ideia maior e posiciona o criador como líder de um movimento.

Nicho do criador: ${brand.niches}
Audiência: ${brand.targetAudience}
</contexto>

<objetivo>
Extrair do conteúdo bruto os elementos que permitem criar conexão tribal:
- Qual a crença compartilhada por trás desse tema?
- Que status quo esse tema desafia?
- Como isso pode unir pessoas com valores similares?
</objetivo>

<conteudo_fonte>
"""
${truncatedContent}
"""
</conteudo_fonte>

<tema_original>
${originalTheme}
</tema_original>

<instrucoes>
Analise o conteúdo e extraia:

1. **TEMA TRIBAL**: Reformule o tema como uma declaração que une pessoas. Não é sobre o assunto — é sobre a crença por trás dele.
   - ❌ "5 dicas de produtividade"
   - ✅ "Por que pessoas realizadas não seguem rotinas perfeitas"

2. **CONTEXTO TRANSFORMADOR**: 3-5 insights que mudam perspectiva, não apenas informam.
   - Cada ponto deve fazer a pessoa pensar "nunca tinha visto assim"
   - Priorize dados contra-intuitivos, inversões de lógica comum, ou verdades desconfortáveis

3. **OBJETIVO TRIBAL**: Qual mudança esse conteúdo quer criar na audiência?
   - ❌ "Educar sobre X"
   - ✅ "Fazer a audiência questionar por que aceita Y"

4. **ÂNGULO SUGERIDO**: Qual abordagem tribal funciona melhor para este tema?
   - HEREGE: Desafia verdade aceita ("Todo mundo diz X, mas...")
   - VISIONÁRIO: Mostra futuro possível ("Imagine um mundo onde...")
   - TRADUTOR: Simplifica complexo ("O que ninguém te explicou sobre...")
   - TESTEMUNHA: Jornada pessoal ("Eu costumava acreditar X, até...")

5. **TAGS DE MOVIMENTO**: Hashtags que sinalizam pertencimento, não categorização.
   - ❌ Tags genéricas: #produtividade #marketing #empreendedorismo
   - ✅ Tags de identidade: #antigrind #pensadores_divergentes #construtores_silenciosos
</instrucoes>

<fallback>
Se o conteúdo fonte não tiver substância suficiente para extrair insights transformadores, retorne:
{
  "theme": "[INSUFICIENTE] Tema original sem reformulação tribal possível",
  "context": "• Conteúdo fonte muito superficial para extração tribal",
  "objective": "Necessário buscar fonte mais profunda sobre o tema",
  "suggestedAngle": null,
  "suggestedTags": []
}
</fallback>

<formato_resposta>
Retorne APENAS JSON válido:
{
  "theme": "Declaração tribal que une pessoas (máx 15 palavras)",
  "context": "• Insight 1 que muda perspectiva\n• Insight 2 que desafia senso comum\n• Insight 3 que cria identificação",
  "objective": "Transformação específica que o conteúdo busca criar na audiência",
  "suggestedAngle": "HEREGE | VISIONARIO | TRADUTOR | TESTEMUNHA",
  "suggestedTags": ["tag_identidade_1", "tag_movimento_2", "tag_comunidade_3"]
}
</formato_resposta>

<exemplo>
Tema original: "Inteligência artificial no mercado de trabalho"

Resposta:
{
  "theme": "A IA não vai roubar seu emprego — sua resistência a ela vai",
  "context": "• Quem domina IA não compete com ela — usa como alavanca\n• Os empregos que mais crescem são os que exigem pensamento que IA não replica\n• A verdadeira ameaça não é a tecnologia — é a mentalidade de escassez",
  "objective": "Transformar medo de obsolescência em curiosidade por adaptação",
  "suggestedAngle": "HEREGE",
  "suggestedTags": ["futuro_do_trabalho", "mentalidade_de_crescimento", "construtores_do_amanha"]
}
</exemplo>
</prompt>



OBERSVACOES

Mudanças feitas:

Contexto — adicionei ${brand.niches} e ${brand.targetAudience} para o modelo considerar o criador
Contexto transformador — adicionei critérios específicos (dados contra-intuitivos, inversões, verdades desconfortáveis)
Ângulo sugerido — nova seção que conecta com os 4 ângulos do prompt base
Tags de movimento — agora tem exemplos ❌ vs ✅ para clareza
Fallback — instrução para quando conteúdo fonte é insuficiente
Output — adicionei campo suggestedAngle


COMENTÁRIO SOBRE OUTPUT:
O campo suggestedAngle foi adicionado ao JSON de saída. Se isso quebrar integração existente, pode ser removido ou tornado opcional. A estrutura dos outros campos permanece idêntica.