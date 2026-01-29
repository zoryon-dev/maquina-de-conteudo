import Image from "next/image"
import Link from "next/link"
import { Footer } from "@/components/footer"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl [animation:pulse_4s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 py-5 flex items-center justify-between min-h-[80px]">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-auto hidden sm:block h-9 sm:h-9 md:h-10 lg:h-11 xl:h-12">
                <Image
                  src="/img/logo_full_content.png"
                  alt="contentMachine powered by zoryon"
                  width={180}
                  height={36}
                  className="object-contain w-auto h-full transition-all duration-200"
                  priority
                />
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              <div className="relative h-9 w-9 sm:hidden">
                <Image
                  src="/img/favi_contentmachine.jpg"
                  alt="contentMachine"
                  width={36}
                  height={36}
                  className="object-contain rounded-lg w-full h-full"
                  priority
                />
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
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

        <main className="container mx-auto px-4 sm:px-6 py-24 md:py-28">
          {children}
        </main>

        <Footer showNewsletter />
      </div>
    </div>
  )
}
