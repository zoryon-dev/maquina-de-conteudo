import { db } from "@/db";
import { creativeProjects } from "@/db/schema";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Clock, Image, Trash2 } from "lucide-react";

export default async function CreativeStudioProjectsPage() {
  const userId = await ensureAuthenticatedUser();

  const projects = await db
    .select({
      id: creativeProjects.id,
      title: creativeProjects.title,
      mode: creativeProjects.mode,
      status: creativeProjects.status,
      selectedModel: creativeProjects.selectedModel,
      createdAt: creativeProjects.createdAt,
    })
    .from(creativeProjects)
    .where(eq(creativeProjects.userId, userId))
    .orderBy(desc(creativeProjects.createdAt))
    .limit(50);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/creative-studio"
          className="size-8 rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/20 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="size-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Projetos</h1>
          <p className="text-xs text-white/40">
            {projects.length} projeto{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Image className="size-10 text-white/20 mb-3" />
          <p className="text-sm text-white/40">Nenhum projeto ainda</p>
          <Link
            href="/creative-studio/create"
            className="text-xs text-primary hover:underline mt-2"
          >
            Criar primeiro projeto
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/creative-studio/projects/${project.id}`}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {project.title || `Projeto #${project.id}`}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                  <span className="capitalize">{project.mode}</span>
                  {project.selectedModel && (
                    <span>{project.selectedModel.split("/").pop()}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {project.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ml-3 ${
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
