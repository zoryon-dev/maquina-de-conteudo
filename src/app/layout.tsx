import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "@/components/ui/sonner"
import { DevWorkerPoller } from "@/components/dev-worker-poller"
import { createBaseMetadata } from "@/lib/metadata"
import { JsonLd, organizationJsonLd, webSiteJsonLd, softwareApplicationJsonLd } from "@/components/json-ld"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = createBaseMetadata()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const domain = "maquinadeconteudo.com"

  return (
    <ClerkProvider>
      <html lang="pt-BR" className="dark" suppressHydrationWarning>
        <head>
          {/* Structured Data (JSON-LD) */}
          <JsonLd data={organizationJsonLd(domain)} />
          <JsonLd data={webSiteJsonLd(domain)} />
          <JsonLd data={softwareApplicationJsonLd(domain)} />
        </head>
        <body
          className={`${inter.variable} ${geistMono.variable} antialiased bg-[#0a0a0f]`}
          suppressHydrationWarning
        >
          {children}
          <Toaster richColors position="bottom-right" />
          <DevWorkerPoller />
        </body>
      </html>
    </ClerkProvider>
  )
}
