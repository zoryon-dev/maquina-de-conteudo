Plano: Ajuste do Fluxo de Criação de Posts no Wizard

 📋 Resumo Executivo

 Transformar a geração de imagens de síncrona para assíncrona (via queue), com notificações ao
 usuário e sincronização automática com a biblioteca.

 🔍 Problemas Identificados

 1. Geração Síncrona de Imagens

 - Arquivo: src/app/api/wizard/[id]/generate-image/route.ts
 - Problema: API gera imagens de forma síncrona, bloqueando a resposta
 - Impacto: Usuário fica esperando sem feedback visual, pode timeout

 2. Sem Sincronização Wizard → Biblioteca

 - Arquivo: src/lib/wizard-services/library-sync.ts
 - Problema: Library item criado com mediaUrl: null (linha 148)
 - Impacto: Imagens geradas no wizard não aparecem na biblioteca

 3. Job de Imagem Não Implementado

 - Arquivo: src/app/api/workers/route.ts (linhas 304-308)
 - Problema: Handler ai_image_generation é apenas placeholder
 - Impacto: Sistema de fila existe mas não é usado para imagens

 4. Sem Notificações

 - Problema: Usuário não é avisado quando geração termina
 - Impacto: Precisa ficar checando manualmente

 5. Edição de Posts

 - Arquivo: src/app/(app)/library/components/content-dialog.tsx
 - Problema: Funciona mas não há botão para regenerar imagens

 ---
 🎯 Solução Proposta

 Fase 1: Geração Assíncrona via Queue

 1.1 Implementar Handler de Imagens no Worker

 Arquivo: src/app/api/workers/route.ts

 ai_image_generation: async (job) => {
   const { wizardId, libraryItemId, config } = job.payload;

   // 1. Buscar wizard
   // 2. Gerar imagens (reutilizar lógica existente)
   // 3. Atualizar contentWizards.generatedImages
   // 4. Sincronizar para libraryItems.mediaUrl
   // 5. Retornar resultado
 }

 Código a reutilizar: src/app/api/wizard/[id]/generate-image/route.ts (linhas 67-205)

 1.2 Nova API para Enfileirar Geração

 Novo arquivo: src/app/api/wizard/[id]/queue-image-generation/route.ts

 POST /api/wizard/[id]/queue-image-generation

 // 1. Validar wizard
 // 2. Criar job ai_image_generation
 // 3. Retornar jobId imediatamente

 1.3 Modal de Processamento no Wizard

 Arquivo: src/app/(app)/wizard/components/steps/step-5-image-generation.tsx

 - Alterar botão "Gerar Imagens" para:
   a. Mostrar modal "Processando..."
   b. Chamar nova API de queue
   c. Redirecionar para /dashboard

 Novo componente: ProcessingModal.tsx
 ┌─────────────────────────────────┐
 │   🎨 Gerando Imagens           │
 ├─────────────────────────────────┤
 │                                 │
 │   [Spinner Animado]             │
 │                                 │
 │   Suas imagens estão sendo      │
 │   geradas em segundo plano.     │
 │   Você será notificado quando   │
 │   estiverem prontas!            │
 │                                 │
 │   [Voltar ao Dashboard]         │
 └─────────────────────────────────┘

 ---
 Fase 2: Sistema de Notificações (Toast Sonner)

 2.1 Hook para Polling de Jobs

 Novo arquivo: src/lib/hooks/use-job-polling.ts

 export function useJobPolling(jobId: number) {
   // Poll /api/jobs/[id] a cada 3 segundos
   // Quando status = completed, mostrar toast
   // Quando status = failed, mostrar toast de erro
 }

 2.2 API de Status de Job

 Modificar: src/app/api/jobs/[id]/route.ts (criar se não existir)

 GET /api/jobs/[id]

 Retorna: { id, status, result, error }

 2.3 Toast Notification com Sonner

 Arquivo: src/app/(app)/dashboard/page.tsx

 import { toast } from "sonner"

 // Quando job completa:
 toast.success("Carrossel finalizado!", {
   description: "Seu conteúdo está disponível na biblioteca.",
   action: {
     label: "Ver",
     onClick: () => router.push("/library")
   }
 })

 // Quando job falha:
 toast.error("Erro na geração", {
   description: "Tente novamente ou contate o suporte."
 })

 ---
 Fase 3: Sincronização Biblioteca

 3.1 Atualizar Library Item com Imagens

 Arquivo: src/app/api/workers/route.ts

 No handler ai_image_generation, após gerar imagens:

 // Atualizar library item com URLs das imagens
 const currentMetadata = JSON.parse(libraryItem.metadata || '{}');
 await db.update(libraryItems)
   .set({
     mediaUrl: JSON.stringify(imageUrls),
     metadata: JSON.stringify({
       ...currentMetadata,
       imageProcessing: null,  // Remove flag de processamento
       imagesGeneratedAt: new Date().toISOString()
     }),
     updatedAt: new Date()
   })
   .where(eq(libraryItems.id, libraryItemId))

 3.2 Status "Processing" via Metadata (SEM MIGRATION)

 Arquivo: src/lib/wizard-services/library-sync.ts

 Ao criar library item, adicionar flag de processamento:
 metadata: JSON.stringify({
   ...baseMetadata,
   imageProcessing: {
     status: "pending",
     jobId: jobId,
     startedAt: new Date().toISOString()
   }
 })

 Vantagem: Sem mudança de schema, mais flexível.

 3.3 Badge de Loading nos Cards

 Arquivo: src/app/(app)/library/components/content-card.tsx

 const metadata = JSON.parse(item.metadata || '{}');
 const isProcessing = metadata.imageProcessing?.status === 'processing';

 {isProcessing && (
   <Badge className="bg-yellow-500/20 text-yellow-300">
     <Loader2 className="w-3 h-3 animate-spin mr-1" />
     Gerando imagens...
   </Badge>
 )}

 ---
 Fase 4: Melhorias na Edição

 4.1 Bloquear Edição Durante Processamento

 Arquivo: src/app/(app)/library/components/content-card.tsx

 Se imageProcessing.status === 'processing':
 // Desabilitar botão "Editar"
 // Mostrar tooltip "Aguarde geração de imagens terminar"
 <Button disabled={isProcessing}>
   {isProcessing ? (
     <>
       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
       Processando...
     </>
   ) : (
     <>Editar</>
   )}
 </Button>

 4.2 Botão "Regenerar Imagens"

 Arquivo: src/app/(app)/library/components/content-dialog.tsx

 Adicionar na seção de imagens:
 <Button variant="outline" onClick={handleRegenerateImages}>
   <RefreshCw className="w-4 h-4 mr-2" />
   Regenerar Imagens
 </Button>

 4.2 Botão "Gerar Imagens" para Items sem Imagem

 Arquivo: src/app/(app)/library/components/content-card.tsx

 Se mediaUrl é null e tipo é carousel:
 {!item.mediaUrl && item.type === "carousel" && (
   <Button onClick={handleGenerateImages}>
     <ImagePlus className="w-4 h-4 mr-2" />
     Gerar Imagens
   </Button>
 )}

 ---
 📂 Arquivos a Modificar

 Novos Arquivos
 ┌─────────────────────────────────────────────────────────┬─────────────────────────────┐
 │                         Caminho                         │          Descrição          │
 ├─────────────────────────────────────────────────────────┼─────────────────────────────┤
 │ src/app/api/wizard/[id]/queue-image-generation/route.ts │ API para enfileirar geração │
 ├─────────────────────────────────────────────────────────┼─────────────────────────────┤
 │ src/lib/hooks/use-job-polling.ts                        │ Hook para polling de jobs   │
 ├─────────────────────────────────────────────────────────┼─────────────────────────────┤
 │ src/components/ui/processing-modal.tsx                  │ Modal de processamento      │
 └─────────────────────────────────────────────────────────┴─────────────────────────────┘
 Modificações
 Arquivo: src/app/api/workers/route.ts
 Linhas: 304-308
 Alteração: Implementar handler ai_image_generation
 ────────────────────────────────────────
 Arquivo: src/app/(app)/wizard/components/steps/step-5-image-generation.tsx
 Linhas: ~800
 Alteração: Mudar para assíncrono + modal
 ────────────────────────────────────────
 Arquivo: src/app/(app)/library/components/content-card.tsx
 Linhas: -
 Alteração: Badge processing + bloqueio edição
 ────────────────────────────────────────
 Arquivo: src/app/(app)/library/components/content-dialog.tsx
 Linhas: -
 Alteração: Botão regenerar + bloqueio se processing
 ────────────────────────────────────────
 Arquivo: src/lib/wizard-services/library-sync.ts
 Linhas: ~140
 Alteração: Adicionar imageProcessing ao metadata
 SEM MIGRATION - Usando metadata para status de processamento.

 ---
 ✅ Verificação

 Teste Manual

 1. Criar carrossel via wizard
 2. Clicar em "Gerar Imagens"
 3. Verificar modal aparece
 4. Verificar redirecionamento para dashboard
 5. Aguardar notificação "Carrossel X foi finalizado"
 6. Verificar imagens na biblioteca

 Teste de Falha

 1. Gerar imagens com API inválvida
 2. Verificar erro é tratado
 3. Verificar notificação de erro
 4. Verificar botão "Tentar Novamente"

 ---
 🔄 Fluxo Final

 ┌─────────────────────────────────────────────────────────────────┐
 │ WIZARD STEP 5                                                   │
 ├─────────────────────────────────────────────────────────────────┤
 │  Usuário clica "Gerar Imagens"                                 │
 │           ↓                                                     │
 │  Modal "Processando..." aparece                                │
 │           ↓                                                     │
 │  API queue-image-generation cria job                           │
 │           ↓                                                     │
 │  Redireciona para /dashboard                                   │
 └─────────────────────────────────────────────────────────────────┘
                               ↓
 ┌─────────────────────────────────────────────────────────────────┐
 │ BACKGROUND WORKER                                              │
 ├─────────────────────────────────────────────────────────────────┤
 │  Job ai_image_generation é processado                          │
 │           ↓                                                     │
 │  Imagens geradas (IA ou HTML template)                         │
 │           ↓                                                     │
 │  contentWizards.generatedImages atualizado                     │
 │           ↓                                                     │
 │  libraryItems.mediaUrl atualizado com URLs                     │
 │           ↓                                                     │
 │  Job marcado como completed                                    │
 └─────────────────────────────────────────────────────────────────┘
                               ↓
 ┌─────────────────────────────────────────────────────────────────┐
 │ NOTIFICAÇÃO                                                     │
 ├─────────────────────────────────────────────────────────────────┤
 │  Polling detecta job completed                                 │
 │           ↓                                                     │
 │  Toast: "Carrossel X foi finalizado!"                          │
 │           ↓                                                     │
 │  Usuário clica "Ver" → vai para /library                       │
 └─────────────────────────────────────────────────────────────────┘
                               ↓
 ┌─────────────────────────────────────────────────────────────────┐
 │ BIBLIOTECA                                                      │
 ├─────────────────────────────────────────────────────────────────┤
 │  Item mostra imagens geradas                                   │
 │  Botão "Editar" funciona com todas as opções                   │
 │  Botão "Regenerar Imagens" disponível                          │
 └─────────────────────────────────────────────────────────────────┘

 ---
 ⚠️ Observações Importantes

 1. SEM MIGRATION: Usando metadata.imageProcessing para status, sem mudança de schema
 2. Redis Configurado: Verificar se UPSTASH_REDIS_REST_URL está configurado
 3. Worker Ativo: Verificar se /api/workers está sendo chamado (cron job)
 4. Reutilização: Código de geração de imagens já existe, apenas mover para worker
 5. Fallback: Se Redis não configurado, job fica no banco mas não processa
 6. Edição Bloqueada: Durante processamento, botão "Editar" fica desabilitado

 ---
 ✍️ Decisões do Usuário
 ┌─────────────────────────┬──────────────────────────┬─────────────────────────┐
 │         Decisão         │         Escolha          │      Justificativa      │
 ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
 │ Status de processamento │ Metadata (sem migration) │ Evita mudança de schema │
 ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
 │ Notificações            │ Toast Sonner             │ Já usado no sistema     │
 ├─────────────────────────┼──────────────────────────┼─────────────────────────┤
 │ Edição durante proc.    │ Bloquear edição          │ Evita conflitos         │
 └─────────────────────────┴──────────────────────────┴─────────────────────────┘
 Pronto para implementação!

 ---
 🚀 Implementação - Ordem Sugerida

 1. Worker Handler (mais crítico) - Implementar ai_image_generation
 2. API de Queue + Modal de Processamento - Enfileirar job + UI
 3. Notificações (polling + toast) - use-job-polling.ts hook
 4. Sincronização Biblioteca (status processing + atualização mediaUrl)
 5. Botões de Edição/Regeneração