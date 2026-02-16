/**
 * Device Preview Component
 *
 * Envolve conteudo em mockups de dispositivos para preview visual.
 * Suporta Instagram Feed, Instagram Story, Facebook e modo limpo.
 * Frames criados em CSS puro (sem imagens).
 */

"use client"

import { cn } from "@/lib/utils"
import {
  Camera,
  Send,
  Heart,
  Search,
  Film,
  ShoppingBag,
  User,
  Home,
  Wifi,
  BatteryFull,
  Signal,
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export interface DevicePreviewProps {
  platform: "instagram-feed" | "instagram-story" | "facebook" | "clean"
  children: React.ReactNode
  className?: string
}

// ============================================================================
// STATUS BAR (shared between iPhone frames)
// ============================================================================

function IPhoneStatusBar() {
  return (
    <div className="flex items-center justify-between px-5 py-1.5 text-black text-[11px] font-semibold">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <Signal className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <BatteryFull className="w-4.5 h-3.5" />
      </div>
    </div>
  )
}

// ============================================================================
// INSTAGRAM FEED FRAME
// ============================================================================

function InstagramFeedFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[375px] mx-auto">
      {/* Phone bezel */}
      <div className="bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl shadow-black/40">
        {/* Phone screen */}
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Notch */}
          <div className="relative bg-white">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-gray-900 rounded-b-2xl z-10" />
            <IPhoneStatusBar />
          </div>

          {/* Instagram app header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <Camera className="w-5 h-5 text-gray-900" />
            <span className="text-base font-semibold text-gray-900 tracking-tight"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              Instagram
            </span>
            <Send className="w-5 h-5 text-gray-900 -rotate-12" />
          </div>

          {/* Content area */}
          <div className="max-h-[520px] overflow-y-auto">
            {children}
          </div>

          {/* Bottom tab bar */}
          <div className="flex items-center justify-around py-2 border-t border-gray-100 bg-white">
            <Home className="w-5 h-5 text-gray-900" />
            <Search className="w-5 h-5 text-gray-400" />
            <Film className="w-5 h-5 text-gray-400" />
            <ShoppingBag className="w-5 h-5 text-gray-400" />
            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="w-3 h-3 text-gray-600" />
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center py-2">
            <div className="w-32 h-1 bg-gray-900 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INSTAGRAM STORY FRAME
// ============================================================================

function InstagramStoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[375px] mx-auto">
      {/* Phone bezel */}
      <div className="bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl shadow-black/40">
        {/* Phone screen - full screen 9:16 */}
        <div className="bg-black rounded-[2rem] overflow-hidden relative" style={{ aspectRatio: "9/16" }}>
          {/* Story progress bar */}
          <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2">
            <div className="flex gap-1">
              <div className="flex-1 h-0.5 bg-white rounded-full" />
              <div className="flex-1 h-0.5 bg-white/40 rounded-full" />
              <div className="flex-1 h-0.5 bg-white/40 rounded-full" />
            </div>
          </div>

          {/* Story header overlay */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center gap-2.5 px-3 pt-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-gray-600" />
              </div>
            </div>
            <span className="text-white text-xs font-semibold">meu_perfil</span>
            <span className="text-white/60 text-xs">2h</span>
          </div>

          {/* Content area (fills screen) */}
          <div className="absolute inset-0">
            {children}
          </div>

          {/* Bottom message bar */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center gap-2 px-3">
            <div className="flex-1 border border-white/40 rounded-full py-1.5 px-3">
              <span className="text-white/50 text-xs">Enviar mensagem</span>
            </div>
            <Heart className="w-5 h-5 text-white" />
            <Send className="w-5 h-5 text-white -rotate-12" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FACEBOOK FRAME
// ============================================================================

function FacebookFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[375px] mx-auto">
      {/* Phone bezel */}
      <div className="bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl shadow-black/40">
        {/* Phone screen */}
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Notch */}
          <div className="relative bg-white">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-gray-900 rounded-b-2xl z-10" />
            <IPhoneStatusBar />
          </div>

          {/* Facebook app header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
            <span
              className="text-xl font-bold text-[#1877F2]"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              facebook
            </span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="w-4 h-4 text-gray-600" />
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Send className="w-4 h-4 text-gray-600 -rotate-12" />
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="max-h-[520px] overflow-y-auto bg-gray-100">
            <div className="py-2">
              {children}
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center py-2 bg-white">
            <div className="w-32 h-1 bg-gray-900 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DevicePreview({ platform, children, className }: DevicePreviewProps) {
  switch (platform) {
    case "instagram-feed":
      return (
        <div className={cn("", className)}>
          <InstagramFeedFrame>{children}</InstagramFeedFrame>
        </div>
      )

    case "instagram-story":
      return (
        <div className={cn("", className)}>
          <InstagramStoryFrame>{children}</InstagramStoryFrame>
        </div>
      )

    case "facebook":
      return (
        <div className={cn("", className)}>
          <FacebookFrame>{children}</FacebookFrame>
        </div>
      )

    case "clean":
    default:
      return (
        <div className={cn("", className)}>
          {children}
        </div>
      )
  }
}
