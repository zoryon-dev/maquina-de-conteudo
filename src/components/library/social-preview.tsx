/**
 * Social Preview Container Component
 *
 * Container com tabs para alternar entre previews do Instagram e Facebook.
 * Mapeia os dados do conteudo para as props de cada plataforma.
 */

"use client"

import { Instagram, Facebook } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { InstagramPreview } from "./instagram-preview"
import { FacebookPreview } from "./facebook-preview"

// ============================================================================
// TYPES
// ============================================================================

export interface SocialPreviewProps {
  content: {
    title?: string
    caption: string
    hashtags?: string[]
    imageUrl?: string
    imageUrls?: string[]
    type: "text" | "image" | "carousel" | "video" | "story"
  }
  profile: {
    username: string
    displayName: string
    avatarUrl?: string
  }
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SocialPreview({
  content,
  profile,
  className,
}: SocialPreviewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Tabs defaultValue="instagram" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-white/5">
          <TabsTrigger
            value="instagram"
            className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <Instagram className="w-4 h-4" />
            <span>Instagram</span>
          </TabsTrigger>
          <TabsTrigger
            value="facebook"
            className="flex items-center gap-2 data-[state=active]:bg-white/10 data-[state=active]:text-white"
          >
            <Facebook className="w-4 h-4" />
            <span>Facebook</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instagram" className="mt-4">
          <div className="flex justify-center">
            <InstagramPreview
              imageUrl={content.imageUrl}
              imageUrls={content.imageUrls}
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              caption={content.caption}
              hashtags={content.hashtags}
            />
          </div>
        </TabsContent>

        <TabsContent value="facebook" className="mt-4">
          <div className="flex justify-center">
            <FacebookPreview
              imageUrl={content.imageUrl}
              imageUrls={content.imageUrls}
              displayName={profile.displayName}
              avatarUrl={profile.avatarUrl}
              caption={content.caption}
              hashtags={content.hashtags}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
