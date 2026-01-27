import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const lastUpdated = "27 de janeiro de 2026"

export default function TermosDeUsoPage() {
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
            Termos de Uso
          </h1>
          <p className="text-white/40 text-sm mb-8">
            Última atualização: {lastUpdated}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Aceitação dos Termos</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Ao acessar e usar o contentMachine, você aceita e concorda em ficar vinculado
              aos termos e disposições deste acordo. Se você não concordar com todos os termos
              deste acordo, por favor não use a plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Descrição do Serviço</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              O contentMachine é um estúdio de conteúdo alimentado por inteligência artificial
              que permite aos usuários criar, editar e gerenciar conteúdo para redes sociais.
              Os serviços incluem:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Geração de conteúdo com IA</li>
              <li>Agendamento de publicações</li>
              <li>Gerenciamento de calendário editorial</li>
              <li>Integração com redes sociais</li>
              <li>Armazenamento de biblioteca de conteúdo</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Responsabilidades do Usuário</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Como usuário da plataforma, você concorda em:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Fornecer informações verdadeiras e precisas</li>
              <li>Manter a segurança da sua conta</li>
              <li>Não compartilhar credenciais de acesso</li>
              <li>Responsabilizar-se pelo conteúdo publicado</li>
              <li>Respeitar os direitos autorais de terceiros</li>
              <li>Não usar a plataforma para atividades ilegais</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Propriedade Intelectual</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Todo o conteúdo gerado pela IA através da plataforma pertence ao usuário que o criou.
              A plataforma e sua tecnologia, incluindo software, designs e textos, são propriedade
              exclusiva da Máquina de Conteúdo e estão protegidos por leis de propriedade intelectual.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Limitação de Responsabilidade</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              O contentMachine não garante que o serviço será ininterrupto ou livre de erros.
              O conteúdo gerado por IA deve ser revisado pelo usuário antes da publicação.
              A plataforma não se responsabiliza por danos diretos, indiretos ou incidentais
              decorrentes do uso do serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Suspensão e Término</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
              O usuário pode encerrar sua conta a qualquer momento através das configurações da plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Alterações nos Termos</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Podemos atualizar estes termos periodicamente. Notificaremos os usuários sobre
              mudanças significativas através da plataforma ou por e-mail. O uso continuado
              após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Contato</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Para dúvidas sobre estes termos, entre em contato através do e-mail:
              <a href="mailto:contato@maquinadeconteudo.com" className="text-primary hover:underline ml-1">
                contato@maquinadeconteudo.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
