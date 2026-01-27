import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const lastUpdated = "27 de janeiro de 2026"

export default function CookiesPage() {
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
            Política de Cookies
          </h1>
          <p className="text-white/40 text-sm mb-8">
            Última atualização: {lastUpdated}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. O que são Cookies?</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você
              visita um site. Eles permitem que o site se lembre de suas ações e preferências
              (como login, idioma, fonte de tamanho e outras preferências de exibição) ao longo
              de um período de tempo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Como Usamos Cookies</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Utilizamos cookies para os seguintes fins:
            </p>

            <div className="space-y-4 mb-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Cookies Essenciais</h3>
                <p className="text-white/60 text-sm">
                  Necessários para o funcionamento da plataforma. Incluem autenticação,
                  manutenção de sessão e proteção contra CSRF.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Cookies de Preferências</h3>
                <p className="text-white/60 text-sm">
                  Guardam suas escolhas e configurações, como tema escuro/claro e
                  preferências de exibição.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Cookies de Análise</h3>
                <p className="text-white/60 text-sm">
                  Ajudam a entender como você usa a plataforma, permitindo melhorar
                  a experiência e identificar problemas.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Cookies Funcionais</h3>
                <p className="text-white/60 text-sm">
                  Permitem funcionalidades avançadas como integrações com redes sociais
                  e personalização de conteúdo.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Cookies Utilizados</h2>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">3.1 Autenticação</h3>
            <div className="bg-black/30 rounded-lg p-3 mb-4 font-mono text-xs text-white/60">
              __session, __client_* (Clerk)
            </div>
            <p className="text-white/70 leading-relaxed mb-4">
              Gerenciados pelo Clerk para manter sua sessão ativa e autenticada.
            </p>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">3.2 Preferências</h3>
            <div className="bg-black/30 rounded-lg p-3 mb-4 font-mono text-xs text-white/60">
              theme, preferences
            </div>
            <p className="text-white/70 leading-relaxed mb-4">
              Armazenam suas preferências de uso da plataforma.
            </p>

            <h3 className="text-lg font-medium text-white/90 mb-2 mt-4">3.3 Análise (Opcional)</h3>
            <div className="bg-black/30 rounded-lg p-3 mb-4 font-mono text-xs text-white/60">
              _ga, _gid (Google Analytics - se habilitado)
            </div>
            <p className="text-white/70 leading-relaxed mb-4">
              Usados para análise de tráfego e comportamento do usuário.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Gerenciamento de Cookies</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Você pode configurar seu navegador para recusar cookies. No entanto, isso pode
              afetar a funcionalidade da plataforma. A maioria dos navegadores permite:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li>Ver quais cookies estão armazenados</li>
              <li>Excluir cookies existentes</li>
              <li>Bloquear cookies de terceiros</li>
              <li>Bloquear todos os cookies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Cookies de Terceiros</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Alguns serviços integrados podem utilizar cookies próprios:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
              <li><strong>Clerk</strong> - Autenticação e gerenciamento de usuários</li>
              <li><strong>Vercel Analytics</strong> - Análise de uso e performance</li>
              <li><strong>Redes Sociais</strong> - Quando conectadas, usam cookies próprios</li>
            </ul>
            <p className="text-white/70 leading-relaxed">
              Consulte as políticas de privacidade desses serviços para mais informações.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Atualizações</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Podemos atualizar esta política periodicamente. Mudanças significativas
              serão notificadas através da plataforma. Data da última atualização
              está indicada no topo desta página.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Contato</h2>
            <p className="text-white/70 leading-relaxed">
              Para dúvidas sobre nossa política de cookies:
            </p>
            <p className="text-white/70 mt-2">
              E-mail:{" "}
              <a href="mailto:contato@maquinadeconteudo.com" className="text-primary hover:underline">
                contato@maquinadeconteudo.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
