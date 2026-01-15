import { SignIn } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Back to home link */}
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      {/* Glassmorphism card */}
      <div className="w-full max-w-md">
        <div className="glass border border-border rounded-2xl p-8 shadow-lg">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Máquina de Conteúdo
            </h1>
            <p className="text-muted-foreground">
              Entre para acessar seu estúdio de conteúdo
            </p>
          </div>

          {/* Clerk SignIn component */}
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent border-0 p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: {
                  width: "100%",
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  "&:hover": {
                    backgroundColor: "hsl(var(--accent))",
                  },
                },
                formFieldInput: {
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                },
                formButtonPrimary: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  "&:hover": {
                    backgroundColor: "hsl(var(--primary) / 0.9)",
                  },
                },
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground text-sm",
                footerActionLink: {
                  color: "hsl(var(--primary))",
                  "&:hover": {
                    color: "hsl(var(--primary) / 0.8)",
                  },
                },
              },
            }}
            signUpUrl="/sign-up"
            redirectUrl="/chat"
          />
        </div>

        {/* Footer with glow effect */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Ao continuar, você concorda com nossos{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Termos de Serviço
          </Link>{" "}
          e{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}
