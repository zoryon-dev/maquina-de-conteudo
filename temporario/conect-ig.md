  Análise Completa: Integração Instagram e Facebook

  ★ Insight ─────────────────────────────────────
  O sistema possui duas tabelas diferentes para posts agendados:
  1. scheduledPosts - Tabela legada usada pela biblioteca
  2. publishedPosts - Tabela moderna usada pela integração social

  Há uma inconsistência que precisa ser resolvida para unificar os fluxos.
  ─────────────────────────────────────────────────

  1. Estrutura de Dados (Schema)

  Tabela social_connections

  {
    id: number
    userId: string
    platform: "instagram" | "facebook"
    accountId: string        // ID da conta/página no Meta
    accountName: string      // Nome de exibição
    accountUsername: string  // @username
    accountProfilePic: string | null
    accessToken: string      // Token de acesso (60 dias)
    tokenExpiresAt: Date
    status: "active" | "expired" | "revoked" | "error"
    metadata: JSONB          // Permissões, etc.
    lastVerifiedAt: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null  // Soft delete
  }

  Tabela publishedPosts (Principal)

  {
    id: number
    userId: string
    libraryItemId: number | null
    platform: "instagram" | "facebook" | "linkedin"
    status: "scheduled" | "pending" | "published" | "failed"
    platformPostId: string | null  // ID do post no Instagram/Facebook
    scheduledFor: Date | null
    publishedAt: Date | null
    failureReason: string | null
    metrics: JSONB  // { likes, comments, shares, impressions, reach }
    metricsLastFetchedAt: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }

  Tabela scheduledPosts (Legada - Biblioteca)

  {
    id: number
    libraryItemId: number
    platform: string
    scheduledFor: Date
    status: "pending" | "published" | "failed"
    platformPostId: string | null
    error: string | null
    createdAt: Date
  }

  2. Fluxos e Rotas

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         FLUXO DE PUBLICAÇÃO                                │
  └─────────────────────────────────────────────────────────────────────────────┘

    BIBLIOTECA                  AGENDAMENTO                  PUBLICAÇÃO
    ─────────                  ──────────                  ───────────
    libraryItems          →   scheduledPosts      →      publishedPosts
                                (legado)              (tabela moderna)

    [Criar Conteúdo]          [Agendar]              [Publicar]
          │                        │                      │
          │                        │                      │
          ▼                        ▼                      ▼
    /library/[id]          /library/[id]/schedule    /api/social/publish
    /wizard/page           → POST                   → POST
                                                          │
                                                          │
                                                          ▼
                                                   /api/cron/social-publish
                                                   (verifica a cada 5 min)
                                                          │
                                                          ▼
                                                     /api/workers
                                                     (processa job)
                                                          │
                                     ┌────────────────┴────────────────┐
                                     ▼                                 ▼
                            social_publish_instagram           social_publish_facebook
                                     │                                 │
                                     ▼                                 ▼
                             /lib/social/workers/         /lib/social/workers/
                             publish-instagram.ts         publish-facebook.ts
                                     │                                 │
                                     ▼                                 ▼
                             Instagram Graph API           Facebook Graph API
                             (Content Publishing)         (Page Posts)

  3. Rotas API Existentes
  ┌────────────────────────────┬────────────┬───────────────────────────┐
  │            Rota            │   Método   │         Descrição         │
  ├────────────────────────────┼────────────┼───────────────────────────┤
  │ /api/social/oauth          │ GET        │ Inicia OAuth com Meta     │
  ├────────────────────────────┼────────────┼───────────────────────────┤
  │ /api/social/callback       │ GET        │ Callback OAuth            │
  ├────────────────────────────┼────────────┼───────────────────────────┤
  │ /api/social/connections    │ GET/DELETE │ Listar/remover conexões   │
  ├────────────────────────────┼────────────┼───────────────────────────┤
  │ /api/social/publish        │ POST       │ Publicar imediatamente    │
  ├────────────────────────────┼────────────┼───────────────────────────┤
  │ /api/library/[id]/schedule │ POST       │ Agendar da biblioteca     │
  ├────────────────────────────┼────────────┼───────────────────────────┤
  │ /api/cron/social-publish   │ GET        │ Cron para posts agendados │
  ├────────────────────────────┼────────────┼───────────────────────────┤
  │ /api/workers               │ POST       │ Worker que processa jobs  │
  └────────────────────────────┴────────────┴───────────────────────────┘
  4. Bibliotecas e Serviços

  src/lib/social/
  ├── types.ts              # Tipos SocialPlatform, SocialConnectionStatus, etc.
  ├── api/
  │   ├── index.ts          # Cliente principal das APIs Meta
  │   ├── instagram.ts      # Instagram Graph API
  │   └── facebook.ts       # Facebook Graph API
  └── workers/
      ├── publish-instagram.ts   # Worker de publicação Instagram
      ├── publish-facebook.ts    # Worker de publicação Facebook
      └── fetch-metrics.ts       # Métricas de engajamento

  5. Padrão de OAuth (Meta)

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         FLUXO DE AUTENTICAÇÃO                               │
  └─────────────────────────────────────────────────────────────────────────────┘

    USUÁRIO                    APLICAÇÃO                     META (Facebook)
    ────────────────────────────────────────────────────────────────────────────────

    1. Clica em "Conectar Instagram"
             │
             ▼
    2. GET /api/social/oauth?platform=instagram
             │
             ▼
    3. Redirect para api.instagram.com/oauth/authorize
             │
             ▼
    4. Usuário autoriza na tela do Meta
             │
             ▼
    5. Redirect para /api/social/callback?code=...&state=..._instagram
             │
             ▼
    6. Troca code por short-lived token
             │
             ▼
    7. Troca short-lived por long-lived token (60 dias)
             │
             ▼
    8. Busca informações da conta (username, profile_pic)
             │
             ▼
    9. Salva em social_connections
             │
             ▼
    10. Redirect para /settings?tab=social&success=1

  6. Escopos OAuth Necessários

  Instagram:
  - instagram_business_basic - Informações básicas da conta
  - instagram_business_content_publish - Publicar conteúdo
  - instagram_manage_insights - Métricas
  - instagram_manage_comments - Gerenciar comentários

  Facebook:
  - pages_manage_posts - Gerenciar posts da página
  - pages_manage_engagement - Engajamento
  - pages_read_engagement - Ler engajamento
  - public_profile - Perfil público

  7. Variáveis de Ambiente Necessárias

  # Meta (Instagram & Facebook)
  META_APP_ID=your_app_id
  META_APP_SECRET=your_app_secret
  META_REDIRECT_URI=https://yourdomain.com/api/social/callback

  # Cron (para agendamento)
  CRON_SECRET=your_cron_secret

  8. Pontos de Atenção Identificados

  ❌ Problema 1: Duas Tabelas Diferentes

  scheduledPosts (usada pela biblioteca) e publishedPosts (usada pelo social) são separadas:

  // /api/library/[id]/schedule/route.ts usa scheduledPosts:
  await db.insert(scheduledPosts).values({
    libraryItemId,
    platform,
    scheduledFor: scheduledDate,
    status: "pending",
  })

  // Mas o cron /api/cron/social-publish busca em publishedPosts:
  await db.select().from(publishedPosts).where(...)

  Impacto: Posts agendados pela biblioteca não são processados pelo cron.

  ❌ Problema 2: Falta Integração Calendário → Publicação

  O calendário (/calendar) lê de publishedPosts, mas não há fluxo claro de:
  1. Agendar pelo calendário → Publicar
  2. Editar agendamento no calendário
  3. Cancelar agendamento

  ❌ Problema 3: Mensagem Personalizada Não Salva

  O ScheduleDrawer permite custom message, mas não é salva:

  // /api/library/[id]/schedule/route.ts
  interface ScheduleRequest {
    platform: string
    scheduledFor: string
    message?: string // Currently not stored - schema needs metadata field
  }

  9. Próximos Passos Recomendados

  Para unificar e completar a integração:

  1. Unificar tabelas - Migrar scheduledPosts para publishedPosts
  2. Adicionar campo caption em publishedPosts para mensagens personalizadas
  3. Criar endpoints de gerenciamento:
    - PUT /api/published-posts/[id] - Editar agendamento
    - DELETE /api/published-posts/[id] - Cancelar
  4. Integrar calendário - Conectar eventos do calendário ao sistema de publicação
  5. Adicionar webhook Meta - Para atualizar tokens antes de expirarem

  ---
  Gostaria que eu implemente algumas dessas correções? Posso começar pela unificação das tabelas ou pela integração completa do calendário com o sistema de publicação.