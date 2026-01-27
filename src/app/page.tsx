import Image from "next/image"
import Link from "next/link"
import { MessageSquare, Sparkles, Calendar, Globe, ArrowRight } from "lucide-react"
import { QuickChatInput } from "@/components/home/quick-chat-input"
import { Footer } from "@/components/footer"

/**
 * Landing Page - contentMachine
 *
 * Página pública com CTAs para login/cadastro.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background animado */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl [animation:pulse_4s_ease-in-out_infinite]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 py-5 flex items-center justify-between min-h-[80px]">
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Logo completo para desktop - responsivo */}
              <div className="relative w-auto hidden sm:block h-9 sm:h-9 md:h-10 lg:h-11 xl:h-12">
                <Image
                  src="/img/logo_full_content.png"
                  alt="contentMachine powered by zoryon"
                  width={180}
                  height={36}
                  className="object-contain w-auto h-full transition-all duration-200"
                  priority
                />
                {/* Glow effect no logo */}
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              {/* Logo ícone para mobile */}
              <div className="relative h-9 w-9 sm:hidden">
                <Image
                  src="/img/favi_contentmachine.jpg"
                  alt="contentMachine"
                  width={36}
                  height={36}
                  className="object-contain rounded-lg w-full h-full"
                  priority
                />
                {/* Glow effect no logo */}
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
            </Link>

            <nav className="flex items-center gap-4">
              <Link href="/sign-in" className="text-white/70 hover:text-white text-sm transition-colors">
                Entrar
              </Link>
              <Link
                href="/sign-up"
                className="bg-primary text-[#0a0a0f] px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Criar Conta
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <main className="container mx-auto px-4 sm:px-6 py-32 md:py-40 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Estúdio de Conteúdo com IA</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Crie conteúdo incrível com{" "}
              <span className="text-primary">especialistas AI</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Converse com especialistas em conteúdo, agende posts automaticamente e
              gerencie toda sua produção de redes sociais em um só lugar.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/sign-up"
                className="group flex items-center gap-2 bg-primary text-[#0a0a0f] px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-all"
              >
                Começar Gratuitamente
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/sign-in"
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-white border border-white/20 hover:bg-white/5 transition-all"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Quick Chat Input */}
            <div className="mt-12">
              <QuickChatInput />
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-24">
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Chat com Especialistas"
              description="Converse com @zory, @estrategista, @calendario e @criador para gerar conteúdo único"
            />
            <FeatureCard
              icon={<Calendar className="h-6 w-6" />}
              title="Agendamento Automático"
              description="Programe seus posts com antecedência e nevera perca uma data importante"
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Fontes de Conteúdo"
              description="Importe inspirações de seus sites favoritos e transforme em posts"
            />
          </div>
        </main>

        {/* Footer */}
        <Footer showNewsletter />
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <p className="text-white/60 text-sm">{description}</p>
    </div>
  )
}
