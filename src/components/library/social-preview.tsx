/**
 * Social Preview Container Component
 *
 * Container com tabs para alternar entre previews do Instagram e Facebook.
 * Mapeia os dados do conteudo para as props de cada plataforma.
 * Inclui toggle para visualizar com ou sem frame de dispositivo.
 */

"use client"

import { useState } from "react"
import { Instagram, Facebook, Smartphone, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { InstagramPreview } from "./instagram-preview"
import { FacebookPreview } from "./facebook-preview"
import { DevicePreview } from "./device-preview"

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
  const [showDeviceFrame, setShowDeviceFrame] = useState(false)

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs defaultValue="instagram" className="w-full">
        <div className="flex items-center gap-2">
          <TabsList className="flex-1 grid grid-cols-2 bg-white/5">
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

          {/* Device frame toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeviceFrame(!showDeviceFrame)}
            className={cn(
              "h-9 w-9 shrink-0",
              showDeviceFrame
                ? "text-primary bg-primary/10 hover:bg-primary/20"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            )}
            title={showDeviceFrame ? "Ocultar frame do dispositivo" : "Mostrar frame do dispositivo"}
          >
            {showDeviceFrame ? (
              <Smartphone className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </Button>
        </div>

        <TabsContent value="instagram" className="mt-4">
          <div className="flex justify-center">
            {showDeviceFrame ? (
              <DevicePreview platform="instagram-feed">
                <InstagramPreview
                  imageUrl={content.imageUrl}
                  imageUrls={content.imageUrls}
                  username={profile.username}
                  avatarUrl={profile.avatarUrl}
                  caption={content.caption}
                  hashtags={content.hashtags}
                />
              </DevicePreview>
            ) : (
              <InstagramPreview
                imageUrl={content.imageUrl}
                imageUrls={content.imageUrls}
                username={profile.username}
                avatarUrl={profile.avatarUrl}
                caption={content.caption}
                hashtags={content.hashtags}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="facebook" className="mt-4">
          <div className="flex justify-center">
            {showDeviceFrame ? (
              <DevicePreview platform="facebook">
                <FacebookPreview
                  imageUrl={content.imageUrl}
                  imageUrls={content.imageUrls}
                  displayName={profile.displayName}
                  avatarUrl={profile.avatarUrl}
                  caption={content.caption}
                  hashtags={content.hashtags}
                />
              </DevicePreview>
            ) : (
              <FacebookPreview
                imageUrl={content.imageUrl}
                imageUrls={content.imageUrls}
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                caption={content.caption}
                hashtags={content.hashtags}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
