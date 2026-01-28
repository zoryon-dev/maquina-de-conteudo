import Link from "next/link"
import { Linkedin, Instagram, Youtube, X } from "lucide-react"

const currentYear = new Date().getFullYear()

interface FooterLink {
  label: string
  href: string
}

interface FooterSection {
  title: string
  links: FooterLink[]
}

const footerSections: FooterSection[] = [
  {
    title: "Produto",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Preços", href: "/#pricing" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Ajuda", href: "/help" },
      { label: "Documentação", href: "/docs" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre", href: "/about" },
      { label: "Contato", href: "/contact" },
      { label: "Carreiras", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termos de Uso", href: "/termos-de-uso" },
      { label: "Política de Privacidade", href: "/politica-privacidade" },
      { label: "LGPD", href: "/lgpd" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
]

const socialLinks = [
  { name: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  { name: "Instagram", href: "https://instagram.com", icon: Instagram },
  { name: "YouTube", href: "https://youtube.com", icon: Youtube },
  { name: "X", href: "https://x.com", icon: X },
]

interface FooterProps {
  showNewsletter?: boolean
  className?: string
}

export function Footer({ showNewsletter = true, className }: FooterProps) {
  return (
    <footer className={className}>
      {/* Newsletter Section */}
      {showNewsletter && (
        <div className="border-t border-white/10 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="max-w-md mx-auto text-center">
              <h3 className="text-white font-semibold mb-2">
                Fique por das novidades
              </h3>
              <p className="text-white/60 text-sm mb-4">
                Receba atualizações sobre novos recursos e dicas de conteúdo.
              </p>
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50"
                  aria-label="Email para newsletter"
                />
                <button
                  type="submit"
                  className="bg-primary text-[#0a0a0f] px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Inscrever
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer */}
      <div className="border-t border-white/10 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <Link
                href="/"
                className="text-white font-semibold text-lg mb-2 block"
              >
                contentMachine ~ powered by zoryon
              </Link>
              <p className="text-white/60 text-sm mb-4 max-w-xs">
                Seu estúdio de conteúdo alimentado por IA para criar,
                editar e gerenciar posts para redes sociais.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <Link
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                      aria-label={social.name}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Footer Sections */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-white font-medium mb-3">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-white/60 hover:text-primary text-sm transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <p className="text-center text-white/40 text-sm">
              © {currentYear} contentMachine ~ powered by zoryon. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
