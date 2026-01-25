import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { DevWorkerPoller, DevWorkerStatus } from "@/components/dev-worker-poller";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Máquina de Conteúdo - Content Studio",
  description: "AI-powered content studio for social media management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" className="dark" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${geistMono.variable} antialiased bg-[#0a0a0f]`}
          suppressHydrationWarning
        >
          {children}
          <Toaster richColors position="bottom-right" />
          <DevWorkerPoller />
          <DevWorkerStatus />
        </body>
      </html>
    </ClerkProvider>
  );
}
