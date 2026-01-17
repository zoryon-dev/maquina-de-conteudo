/**
 * Context Templates para Multi-Agent System
 *
 * Cada agente tem um template específico que formata o contexto
 * de acordo com suas necessidades e visibilidade de dados.
 *
 * @see https://help.getzep.com/context-templates
 */

import type { AgentType } from "@/lib/agents/types"

/**
 * Context templates para cada agente
 *
 * Variáveis disponíveis:
 * - %{user_summary}    - Resumo do perfil do usuário
 * - %{entities}        - Entidades do knowledge graph
 * - %{edges}           - Fatos/relacionamentos
 * - %{episodes}        - Episódios de conversação
 */
export const AGENT_TEMPLATES = {
  /**
   * @zory - Assistente Generalista
   *
   * Vê tudo: estratégias, posts, ideias, marca.
   * Usado como roteador e para conversas gerais.
   */
  zory: `# CONTEXTO DO USUÁRIO
%{user_summary}

# MARCA E NEGÓCIO
%{entities types=[MarcaBrand] limit=3}

# ESTRATÉGIAS DEFINIDAS
%{edges types=[DEFINIU_ESTRATEGIA] limit=5}

# CONTEÚDOS RECENTES
%{entities types=[PostGerado] limit=5}

# IDEIAS PENDENTES
%{entities types=[IdeiaConteudo] limit=5}`,

  /**
   * @estrategista - Análise Estratégica
   *
   * Focado em estratégia, marca e desempenho de conteúdo.
   * Vê estratégias, valores da marca e histórico de posts.
   */
  estrategista: `# PERFIL ESTRATÉGICO
%{user_summary}

# MARCA - SEGMENTO E VALORES
%{entities types=[MarcaBrand] limit=3 include_attributes=true}

# ESTRATÉGIAS DE CONTEÚDO VIGENTES
%{edges types=[DEFINIU_ESTRATEGIA] limit=10 include_attributes=true}

# HISTÓRICO DE POSTS POR PLATAFORMA
%{entities types=[PostGerado] limit=10 include_attributes=true}

# AGENDAMENTOS FUTUROS
%{edges types=[AGENDADO_PARA] limit=10}

# PREFERÊNCIAS DE CONTEÚDO
%{edges types=[PERTENCE_A_CAMPANHA] limit=5}`,

  /**
   * @criador - Gerador de Conteúdo
   *
   * Focado em criar conteúdo consistente com a marca.
   * Vê estratégias ativas e posts anteriores como referência.
   */
  criador: `# PERFIL CRIATIVO
%{user_summary}

# VOZ DA MARCA
%{entities types=[MarcaBrand, EstrategiaConteudo] limit=5 include_attributes=true}

# TOM E ESTILO PREFERIDO
%{edges types=[DEFINIU_ESTRATEGIA] limit=3 include_attributes=true}

# CONTEÚDOS SIMILARES (REFERÊNCIA)
%{entities types=[PostGerado] limit=5 include_attributes=true}

# IDEIAS PARA DESENVOLVER
%{entities types=[IdeiaConteudo] limit=5 include_attributes=true}

# PLATAFORMAS E FORMATOS
%{edges types=[GEROU_COM_BASE_EM] limit=10}`,

  /**
   * @calendario - Agendamento Editorial
   *
   * Focado em gerenciar agenda e frequência de posts.
   * Vê agenda atual, posts agendados e conteúdos prontos.
   */
  calendario: `# PERFIL DE CALENDÁRIO
%{user_summary}

# AGENDA ATUAL E FUTURA
%{entities types=[AgendaPost] limit=20 include_attributes=true}

# POSTS AGENDADOS
%{edges types=[AGENDADO_PARA] limit=15 include_attributes=true}

# CONTEÚDOS PARA AGENDAR
%{entities types=[PostGerado] limit=10 include_attributes=true}
  Filter: status = draft

# ESTRATÉGIAS TEMPORAIS
%{edges types=[PERTENCE_A_CAMPANHA] limit=10}

# FREQUÊNCIA POR PLATAFORMA
%{entities types=[PostGerado] limit=20 include_attributes=true}`,
} as const

/**
 * Mapeamento de agente para template ID
 */
export function getTemplateId(agent: AgentType): string {
  return `${agent}-context`
}

/**
 * Lista de todos os template IDs
 */
export const TEMPLATE_IDS = Object.keys(AGENT_TEMPLATES).map(
  (agent) => `${agent}-context`
) as [string, ...string[]]
