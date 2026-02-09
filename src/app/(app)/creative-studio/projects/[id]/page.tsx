import { db } from "@/db";
import { creativeProjects, creativeOutputs } from "@/db/schema";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function CreativeStudioProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await ensureAuthenticatedUser();
  const { id } = await params;
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) notFound();

  const [project] = await db
    .select()
    .from(creativeProjects)
    .where(and(eq(creativeProjects.id, projectId), eq(creativeProjects.userId, userId)))
    .limit(1);

  if (!project) notFound();

  const outputs = await db
    .select()
    .from(creativeOutputs)
    .where(eq(creativeOutputs.projectId, projectId));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/creative-studio/projects"
            className="size-8 rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/20 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="size-4 text-white/60" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">
              {project.title || `Projeto #${project.id}`}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
              <span className="capitalize">{project.mode}</span>
              {project.selectedModel && (
                <span>{project.selectedModel.split("/").pop()}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {project.createdAt.toLocaleDateString("pt-BR")}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  project.status === "completed"
                    ? "border-primary/30 text-primary"
                    : project.status === "error"
                      ? "border-red-500/30 text-red-400"
                      : "border-white/10 text-white/50"
                }`}
              >
                {project.status}
              </Badge>
            </div>
          </div>
        </div>

        {outputs.length > 0 && (
          <Button variant="outline" size="sm" asChild className="border-white/10 text-white/70">
            <a href={`/api/creative-studio/projects/${projectId}/download`}>
              <Download className="size-4 mr-1.5" />
              Download ZIP
            </a>
          </Button>
        )}
      </div>

      {/* Prompt */}
      {project.prompt && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">
            Prompt
          </p>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
            {project.prompt}
          </p>
        </div>
      )}

      {/* Error */}
      {project.jobError && (
        <div className="rounded-lg border border-red-500/20 bg-red-950/30 p-4">
          <p className="text-xs text-red-400">{project.jobError}</p>
        </div>
      )}

      {/* Outputs */}
      {outputs.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
            {outputs.length} imagem{outputs.length > 1 ? "ns" : ""} gerada{outputs.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"
              >
                <div className="relative aspect-square bg-black/20">
                  <img
                    src={output.imageUrl}
                    alt={`Output ${output.format}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-white/10 text-white/50"
                  >
                    {output.format}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {output.generationTimeMs && (
                      <span className="text-[10px] text-white/30">
                        {(output.generationTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    <a
                      href={output.imageUrl}
                      download={`${output.format.replace(/[:/]/g, "x")}_${output.id}.png`}
                      className="text-white/40 hover:text-white/60 transition-colors"
                    >
                      <Download className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-white/40">Nenhuma imagem gerada</p>
        </div>
      )}
    </div>
  );
}
