import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const lastUpdated = "27 de janeiro de 2026"

export default function PoliticaPrivacidadePage() {
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
            Política de Privacidade
          </h1>
          <p className="text-white/40 text-sm mb-8">
            Última atualização: {lastUpdated}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Introdução</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              O contentMachine leva a sério a sua privacidade. Esta política descreve como
              coletamos, usamos e protegemos suas informações pessoais ao utilizar nossa plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Informações Coletadas</h2>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">2.1 Informações de Conta</h3>
            <p className="text-white/70 leading-relaxed mb-4">
              Ao criar uma conta, coletamos: nome, e-mail, foto de perfil e informações
              de autenticação fornecidas através do Clerk.
            </p>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">2.2 Informações de Uso</h3>
            <p className="text-white/70 leading-relaxed mb-4">
              Coletamos dados sobre como você usa a plataforma: conteúdo criado, posts agendados,
              preferências e interações com recursos.
            </p>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">2.3 Informações de Integração</h3>
            <p className="text-white/70 leading-relaxed mb-4">
              Ao conectar redes sociais, coletamos tokens de acesso necessários para publicar
              conteúdo em seu nome. Esses tokens são armazenados de forma criptografada.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Como Usamos Suas Informações</h2>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Fornecer e melhorar nossos serviços</li>
              <li>Personalizar sua experiência na plataforma</li>
              <li>Publicar conteúdo em suas redes sociais conectadas</li>
              <li>Enviar comunicações sobre o serviço</li>
              <li>Analisar tendências e uso da plataforma</li>
              <li>Prevenir fraudes e abusos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Compartilhamento de Dados</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Não vendemos suas informações pessoais. Compartilhamos dados apenas nas seguintes
              situações:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Com seu consentimento explícito</li>
              <li>Com plataformas de redes sociais (para publicação)</li>
              <li>Com prestadores de serviço necessários para operação</li>
              <li>Por exigência legal ou ordem judicial</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Armazenamento e Segurança</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Seus dados são armazenados em servidores seguros da Neon (PostgreSQL) e,
              opcionalmente, Cloudflare R2 para arquivos. Utilizamos criptografia em trânsito
              e em repouso. Implementamos medidas de segurança físicas, técnicas e
              administrativas para proteger suas informações.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Seus Direitos</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Você tem direito a:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir informações incompletas ou incorretas</li>
              <li>Solicitar exclusão de seus dados</li>
              <li>Revogar consentimentos</li>
              <li>Exportar seus dados</li>
              <li>Opor-se a processamento automatizado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Cookies</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Manter sua sessão ativa</li>
              <li>Lembrar suas preferências</li>
              <li>Analisar o uso da plataforma</li>
              <li>Melorar a performance do serviço</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Retenção de Dados</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Seus dados são mantidos enquanto sua conta estiver ativa. Após encerramento,
              os dados são excluídos em até 30 dias, exceto quando exigido por lei.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Menores</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              A plataforma é destinada a maiores de 18 anos. Não coletamos intencionalmente
              informações de menores. Se tomarmos conhecimento de coleta indevida,
              procederemos com a exclusão imediata.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">10. Contato</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Para exercer seus direitos ou tirar dúvidas:
            </p>
            <p className="text-white/70 leading-relaxed">
              E-mail:{" "}
              <a href="mailto:privacidade@maquinadeconteudo.com" className="text-primary hover:underline">
                privacidade@maquinadeconteudo.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
