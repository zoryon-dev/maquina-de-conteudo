import { db } from "@/db";
import { creativeProjects } from "@/db/schema";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Palette, RefreshCw, Copy, Clock, ArrowRight } from "lucide-react";

const MODES = [
  {
    id: "create",
    title: "Criar",
    description: "Gere imagens a partir de texto usando presets tribais e templates prontos",
    icon: Palette,
    href: "/creative-studio/create",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    id: "vary",
    title: "Variar",
    description: "Redimensione, reestilize ou edite uma imagem existente",
    icon: RefreshCw,
    href: "/creative-studio/vary",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    id: "replicate",
    title: "Replicar",
    description: "Analise uma referência e gere variações mantendo o estilo visual",
    icon: Copy,
    href: "/creative-studio/replicate",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
] as const;

export default async function CreativeStudioPage() {
  const userId = await ensureAuthenticatedUser();

  // Fetch recent projects
  const recentProjects = await db
    .select({
      id: creativeProjects.id,
      title: creativeProjects.title,
      mode: creativeProjects.mode,
      status: creativeProjects.status,
      createdAt: creativeProjects.createdAt,
    })
    .from(creativeProjects)
    .where(eq(creativeProjects.userId, userId))
    .orderBy(desc(creativeProjects.createdAt))
    .limit(6);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Creative Studio</h1>
        <p className="text-white/50 mt-1">
          Gere, varie e replique imagens para suas redes sociais
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MODES.map((mode) => (
          <Link
            key={mode.id}
            href={mode.href}
            className="group relative rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:border-white/20 hover:bg-white/[0.04]"
          >
            <div
              className={`absolute inset-0 rounded-xl bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
            />
            <div className="relative space-y-3">
              <mode.icon className="size-8 text-white/60 group-hover:text-white transition-colors" />
              <div>
                <h2 className="text-lg font-semibold text-white">{mode.title}</h2>
                <p className="text-sm text-white/40 mt-1">{mode.description}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Começar <ArrowRight className="size-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">
              Projetos Recentes
            </h2>
            <Link
              href="/creative-studio/projects"
              className="text-xs text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/creative-studio/projects/${project.id}`}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-white truncate flex-1">
                    {project.title || `Projeto #${project.id}`}
                  </p>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      project.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : project.status === "generating"
                          ? "bg-blue-500/10 text-blue-400"
                          : project.status === "error"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-white/10 text-white/50"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
                  <Clock className="size-3" />
                  {project.createdAt.toLocaleDateString("pt-BR")}
                  <span className="capitalize">{project.mode}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
