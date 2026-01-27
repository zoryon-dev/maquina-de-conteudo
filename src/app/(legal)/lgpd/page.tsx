import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const lastUpdated = "27 de janeiro de 2026"

export default function LGPDPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        {/* Content */}
        <article className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-white mb-2">
            Política LGPD
          </h1>
          <p className="text-white/40 text-sm mb-8">
            Última atualização: {lastUpdated}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Sobre a LGPD</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) estabelece regras sobre
              o tratamento de dados pessoais no Brasil. O contentMachine está comprometido
              em cumprir todas as disposições da LGPD e proteger seus direitos como titular.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Dados Pessoais Coletados</h2>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">2.1 Dados Pessoais</h3>
            <p className="text-white/70 leading-relaxed mb-4">
              Coletamos dados que identificam você ou podem identificá-lo:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Foto de perfil</li>
              <li>Informações de autenticação (gerenciadas pelo Clerk)</li>
            </ul>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">2.2 Dados Pessoais Sensíveis</h3>
            <p className="text-white/70 leading-relaxed mb-4">
              Não coletamos dados sensíveis (origem racial, religião, saúde, biometria, etc.)
              exceto quando fornecidos voluntariamente pelo usuário no contexto do uso da plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Base Legal para Tratamento</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              O tratamento de seus dados pessoais é fundamentado nas seguintes bases legais
              previstas no art. 7º da LGPD:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li><strong>Consentimento</strong> (art. 7º, I): Você consente com o uso específico de seus dados</li>
              <li><strong>Execução de contrato</strong> (art. 7º, V): Para prestação dos serviços contratados</li>
              <li><strong>Legítimo interesse</strong> (art. 7º, IX): Para fins de segurança e melhoria do serviço</li>
              <li><strong>Obrigação legal</strong> (art. 7º, II): Cumprimento de obrigações legais</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Seus Direitos como Titular</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Conforme o art. 18 da LGPD, você tem os seguintes direitos:
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <ul className="space-y-3">
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Confirmação</strong> - Saber se seus dados são tratados</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Acesso</strong> - Consultar seus dados</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Correção</strong> - Incompletudes, inexatidões</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Eliminação</strong> - Dados desnecessários ou com consentimento revogado</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Portabilidade</strong> - Transferir dados a outro fornecedor</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Informação</strong> - Sobre compartilhamento com órgãos públicos</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Oposição</strong> - Revogar consentimento a qualquer momento</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">X</span>
                  <span className="text-white/70"><strong>Revisão</strong> - Decisões automatizadas</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Como Solicitar Seus Direitos</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Para exercer qualquer um dos direitos acima:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <p className="text-white/70 mb-2">
                <strong>E-mail:</strong>{" "}
                <a href="mailto:dpo@maquinadeconteudo.com" className="text-primary hover:underline">
                  dpo@maquinadeconteudo.com
                </a>
              </p>
              <p className="text-white/70 mb-2">
                <strong>Assunto:</strong> "Solicitação LGPD - [Seu Nome]"
              </p>
              <p className="text-white/70">
                <strong>Prazo de resposta:</strong> Até 15 dias úteis (art. 19 da LGPD)
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Revogação de Consentimento</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Você pode revogar seu consentimento a qualquer momento, sem que isso afete a
              legalidade do tratamento realizado anteriormente. A revogação pode resultar
              na impossibilidade de continuar usando alguns serviços.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Eliminação de Dados</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Seus dados serão eliminados quando:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Você solicitar a exclusão da conta</li>
              <li>O consentimento for revogado</li>
              <li>Os dados não forem mais necessários para os fins propostos</li>
              <li>O período de retenção legal for encerrado</li>
            </ul>
            <p className="text-white/70 leading-relaxed">
              Alguns dados podem ser retidos por obrigação legal ou para defesa em processos judiciais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Transferência Internacional</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Seus dados podem ser processados por serviços localizados fora do Brasil (ex: EUA),
              sempre em conformidade com a LGPD e com cláusulas-padrão contratuais aprovadas
              pela ANPD ou through outras hipóteses de legalidade previstas no art. 33 da LGPD.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Medidas de Segurança</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos
              não autorizados, destruição, perda, alteração ou comunicação indevida, conforme
              art. 46 da LGPD.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">10. Encarregado (DPO)</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Nomeamos um Encarregado de Proteção de Dados para atuar como canal de comunicação
              entre nós, os titulares e a Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
            <p className="text-white/70">
              Contato do DPO:{" "}
              <a href="mailto:dpo@maquinadeconteudo.com" className="text-primary hover:underline">
                dpo@maquinadeconteudo.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
