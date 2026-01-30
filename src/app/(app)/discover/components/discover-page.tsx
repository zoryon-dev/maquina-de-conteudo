/**
 * Discover Page Component
 *
 * Client Component for discovering trending topics with platform tabs.
 */

"use client"

import { useState } from "react"
import { Search, Youtube, Instagram, Loader2, Sparkles, Save, Wand2, Brain, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { Platform, TrendingTopicWithBriefing } from "@/lib/discovery-services/types"

// ============================================================================
// TOPIC CARD COMPONENT
// ============================================================================

interface TopicCardProps {
  topic: TrendingTopicWithBriefing
  rank: number
  onSave: (topic: TrendingTopicWithBriefing) => void
  onCreateWizard: (topic: TrendingTopicWithBriefing) => void
}

function TopicCard({ topic, rank, onSave, onCreateWizard }: TopicCardProps) {
  const platformIcon =
    topic.source.type === "youtube" ? (
      <Youtube className="size-4 text-red-500" />
    ) : topic.source.type === "instagram" ? (
      <Instagram className="size-4 text-pink-500" />
    ) : (
      <Brain className="size-4 text-purple-400" />
    )

  const platformColor =
    topic.source.type === "youtube" ? "text-red-500" :
    topic.source.type === "instagram" ? "text-pink-500" :
    "text-purple-400"

  return (
    <Card className="group overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-xl transition-all hover:border-primary/50 text-white">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full font-semibold text-sm",
              topic.source.type === "youtube" ? "bg-red-500/20 text-red-400" :
              topic.source.type === "instagram" ? "bg-pink-500/20 text-pink-400" :
              "bg-purple-500/20 text-purple-400"
            )}>
              {rank}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">
                {topic.title}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
                <span className={cn("flex items-center gap-1", platformColor)}>
                  {platformIcon}
                  {topic.source.type === "perplexity" ? "Perplexity" : topic.source.type}
                </span>
                {topic.source.type === "perplexity" && topic.source.rawData?.date && (
                  <>
                    <span>•</span>
                    <span>{new Date(topic.source.rawData.date).toLocaleDateString("pt-BR")}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSave(topic)}
              className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Save className="size-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => onCreateWizard(topic)}
              className="h-8 gap-1 bg-primary text-black hover:bg-primary/90 px-3"
            >
              <Wand2 className="size-3" />
              <span className="text-xs">Wizard</span>
            </Button>
          </div>
        </div>

        {/* Context/Snippet */}
        {topic.context && (
          <div className="mt-3 rounded-md bg-white/5 p-3 border border-white/10">
            <p className="text-sm text-white/80 line-clamp-3">{topic.context}</p>
          </div>
        )}

        {/* Perplexity: Show citations if available */}
        {topic.source.type === "perplexity" && topic.source.rawData?.allCitations && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/70">
              Fontes
            </p>
            <div className="flex flex-wrap gap-2">
              {topic.source.rawData.allCitations.slice(0, 5).map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {new URL(url).hostname.replace('www.', '')}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Briefing for other platforms */}
        {topic.source.type !== "perplexity" && topic.briefing && (
          <div className="mt-3 rounded-md bg-white/5 p-3 border border-white/10">
            <p className="text-sm text-white/80 line-clamp-2">{topic.briefing}</p>
          </div>
        )}

        {/* Key Points */}
        {topic.keyPoints && topic.keyPoints.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/70">
              Pontos-chave
            </p>
            <ul className="space-y-1">
              {topic.keyPoints.slice(0, 3).map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  <span className="line-clamp-1">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

// ============================================================================
// PLATFORM RESULTS TAB COMPONENT
// ============================================================================

interface PlatformResultsProps {
  topics: TrendingTopicWithBriefing[]
  platformName: string
  platformIcon: React.ReactNode
  onSave: (topic: TrendingTopicWithBriefing) => void
  onCreateWizard: (topic: TrendingTopicWithBriefing) => void
}

function PlatformResults({ topics, platformName, platformIcon, onSave, onCreateWizard }: PlatformResultsProps) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-white/5">
          {platformIcon}
        </div>
        <p className="mt-4 text-white/90">Nenhum resultado de {platformName}</p>
        <p className="mt-1 text-sm text-white/70">
          Tente uma palavra-chave diferente ou selecione esta plataforma
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {platformIcon}
          <h3 className="text-lg font-semibold text-white">
            {platformName}
          </h3>
          <Badge variant="outline" className="border-white/20 bg-white/5 text-white/70">
            {topics.length} resultados
          </Badge>
        </div>
      </div>
      {topics.map((topic, index) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          rank={index + 1}
          onSave={onSave}
          onCreateWizard={onCreateWizard}
        />
      ))}
    </div>
  )
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
        <Sparkles className="size-8 text-primary" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-white">
        Descubra Temas Trending
      </h2>
      <p className="mt-2 max-w-md text-white/90">
        Digite uma palavra-chave para encontrar os temas mais quentes no YouTube,
        Instagram e Perplexity IA, com briefings gerados por IA.
      </p>

      {/* Platform badges */}
      <div className="mt-6 flex gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
          <Youtube className="size-4 text-red-500" />
          <span className="text-sm text-white/90">YouTube</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
          <Instagram className="size-4 text-pink-500" />
          <span className="text-sm text-white/90">Instagram</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
          <Brain className="size-4 text-purple-400" />
          <span className="text-sm text-white/90">Perplexity</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export function DiscoverPage() {
  const [keyword, setKeyword] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<TrendingTopicWithBriefing[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("all")

  // Platform filters
  const [platforms, setPlatforms] = useState<Platform[]>(["youtube", "instagram", "perplexity"])

  const togglePlatform = (platform: Platform) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  // Group results by platform
  const youtubeResults = results.filter(t => t.source.type === "youtube")
  const instagramResults = results.filter(t => t.source.type === "instagram")
  const perplexityResults = results.filter(t => t.source.type === "perplexity")

  // Handle search
  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast.error("Digite uma palavra-chave para buscar")
      return
    }

    if (platforms.length === 0) {
      toast.error("Selecione pelo menos uma plataforma")
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    setActiveTab("all")

    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          platforms,
          maxResults: 30, // Get more results to have 10 per platform
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch")
      }

      const data = await response.json()
      setResults(data.topics || [])

      const platformCounts = {
        youtube: data.topics?.filter((t: TrendingTopicWithBriefing) => t.source.type === "youtube").length || 0,
        instagram: data.topics?.filter((t: TrendingTopicWithBriefing) => t.source.type === "instagram").length || 0,
        perplexity: data.topics?.filter((t: TrendingTopicWithBriefing) => t.source.type === "perplexity").length || 0,
      }

      if (data.topics?.length === 0) {
        toast.info("Nenhum tema encontrado para sua busca")
      } else {
        toast.success(`Encontrados ${data.topics.length} temas! (YouTube: ${platformCounts.youtube}, Instagram: ${platformCounts.instagram}, Perplexity: ${platformCounts.perplexity})`)
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Erro ao buscar temas")
    } finally {
      setIsSearching(false)
    }
  }

  // Handle save theme
  const handleSave = async (topic: TrendingTopicWithBriefing) => {
    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.title,
          theme: topic.theme,
          context: topic.context,
          targetAudience: topic.targetAudience,
          briefing: topic.briefing,
          keyPoints: topic.keyPoints,
          angles: topic.suggestedAngles,
          sourceType: topic.source.type,
          sourceUrl: topic.source.url,
          sourceData: topic.source.rawData,
          engagementScore: topic.metrics.engagementScore,
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast.success("Tema salvo na biblioteca!")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Erro ao salvar tema")
    }
  }

  // Handle create wizard
  const handleCreateWizard = async (topic: TrendingTopicWithBriefing) => {
    console.log("[handleCreateWizard] Starting wizard creation for topic:", topic.title)
    try {
      // Step 1: Save theme
      console.log("[handleCreateWizard] Step 1: Saving theme...")
      const saveResponse = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.title,
          theme: topic.theme,
          context: topic.context,
          targetAudience: topic.targetAudience,
          briefing: topic.briefing,
          keyPoints: topic.keyPoints,
          angles: topic.suggestedAngles,
          sourceType: topic.source.type,
          sourceUrl: topic.source.url,
          sourceData: topic.source.rawData,
          engagementScore: topic.metrics.engagementScore,
        }),
      })

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text()
        console.error("[handleCreateWizard] Save theme failed:", saveResponse.status, errorText)
        throw new Error(`Failed to save theme: ${saveResponse.status} ${errorText}`)
      }

      const savedTheme = await saveResponse.json()
      console.log("[handleCreateWizard] Theme saved successfully:", savedTheme.id)

      // Step 2: Create wizard from theme
      console.log("[handleCreateWizard] Step 2: Creating wizard from theme...")
      const wizardResponse = await fetch(`/api/themes/${savedTheme.id}/wizard`, {
        method: "POST",
      })

      if (!wizardResponse.ok) {
        const errorText = await wizardResponse.text()
        console.error("[handleCreateWizard] Create wizard failed:", wizardResponse.status, errorText)
        throw new Error(`Failed to create wizard: ${wizardResponse.status} ${errorText}`)
      }

      const wizardData = await wizardResponse.json()
      console.log("[handleCreateWizard] Wizard created successfully:", wizardData.wizardId)

      toast.success("Wizard criado! Redirecionando...")

      setTimeout(() => {
        window.location.href = `/wizard?wizardId=${wizardData.wizardId}`
      }, 500)
    } catch (error) {
      console.error("[handleCreateWizard] Error:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao criar Wizard")
    }
  }

  // Enter key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSearching) {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Descoberta de Temas
          </h1>
          <p className="mt-1 text-white/90">
            Encontre os assuntos mais quentes no YouTube, Instagram e Perplexity IA
          </p>
        </div>

        {/* Search Box */}
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl text-white">
          <div className="p-4">
            {/* Platform Toggle */}
            <div className="mb-4 flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Youtube className="size-5 text-red-500" />
                <Label
                  htmlFor="platform-youtube"
                  className={cn(
                    "cursor-pointer text-sm transition-colors",
                    platforms.includes("youtube") ? "text-primary font-medium" : "text-white/90"
                  )}
                >
                  YouTube
                </Label>
                <Switch
                  id="platform-youtube"
                  checked={platforms.includes("youtube")}
                  onCheckedChange={() => togglePlatform("youtube")}
                />
              </div>
              <div className="flex items-center gap-2">
                <Instagram className="size-5 text-pink-500" />
                <Label
                  htmlFor="platform-instagram"
                  className={cn(
                    "cursor-pointer text-sm transition-colors",
                    platforms.includes("instagram") ? "text-primary font-medium" : "text-white/90"
                  )}
                >
                  Instagram
                </Label>
                <Switch
                  id="platform-instagram"
                  checked={platforms.includes("instagram")}
                  onCheckedChange={() => togglePlatform("instagram")}
                />
              </div>
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-purple-400" />
                <Label
                  htmlFor="platform-perplexity"
                  className={cn(
                    "cursor-pointer text-sm transition-colors",
                    platforms.includes("perplexity") ? "text-primary font-medium" : "text-white/90"
                  )}
                >
                  Perplexity
                </Label>
                <Switch
                  id="platform-perplexity"
                  checked={platforms.includes("perplexity")}
                  onCheckedChange={() => togglePlatform("perplexity")}
                />
              </div>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Digite uma palavra-chave (ex: marketing digital, IA para negócios)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSearching}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !keyword.trim()}
                className="gap-2 bg-primary text-black hover:bg-primary/90"
              >
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Results */}
      {hasSearched ? (
        isSearching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner className="size-8" />
            <p className="mt-4 text-white/90">Descobrindo temas trending...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-white/5">
              <Search className="size-6 text-white/40" />
            </div>
            <p className="mt-4 text-white/90">Nenhum tema encontrado</p>
            <p className="mt-1 text-sm text-white/70">
              Tente uma palavra-chave diferente ou ajuste os filtros
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white/5 border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                Todos ({results.length})
              </TabsTrigger>
              <TabsTrigger value="youtube" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <Youtube className="size-4 mr-1" />
                YouTube ({youtubeResults.length})
              </TabsTrigger>
              <TabsTrigger value="perplexity" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Brain className="size-4 mr-1" />
                Perplexity ({perplexityResults.length})
              </TabsTrigger>
              <TabsTrigger value="instagram" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">
                <Instagram className="size-4 mr-1" />
                Instagram ({instagramResults.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="space-y-6">
                {youtubeResults.length > 0 && (
                  <PlatformResults
                    topics={youtubeResults}
                    platformName="YouTube"
                    platformIcon={<Youtube className="size-6 text-red-500" />}
                    onSave={handleSave}
                    onCreateWizard={handleCreateWizard}
                  />
                )}
                {perplexityResults.length > 0 && (
                  <PlatformResults
                    topics={perplexityResults}
                    platformName="Perplexity"
                    platformIcon={<Brain className="size-6 text-purple-400" />}
                    onSave={handleSave}
                    onCreateWizard={handleCreateWizard}
                  />
                )}
                {instagramResults.length > 0 && (
                  <PlatformResults
                    topics={instagramResults}
                    platformName="Instagram"
                    platformIcon={<Instagram className="size-6 text-pink-500" />}
                    onSave={handleSave}
                    onCreateWizard={handleCreateWizard}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="youtube" className="mt-6">
              <PlatformResults
                topics={youtubeResults}
                platformName="YouTube"
                platformIcon={<Youtube className="size-6 text-red-500" />}
                onSave={handleSave}
                onCreateWizard={handleCreateWizard}
              />
            </TabsContent>

            <TabsContent value="perplexity" className="mt-6">
              <PlatformResults
                topics={perplexityResults}
                platformName="Perplexity"
                platformIcon={<Brain className="size-6 text-purple-400" />}
                onSave={handleSave}
                onCreateWizard={handleCreateWizard}
              />
            </TabsContent>

            <TabsContent value="instagram" className="mt-6">
              <PlatformResults
                topics={instagramResults}
                platformName="Instagram"
                platformIcon={<Instagram className="size-6 text-pink-500" />}
                onSave={handleSave}
                onCreateWizard={handleCreateWizard}
              />
            </TabsContent>
          </Tabs>
        )
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
