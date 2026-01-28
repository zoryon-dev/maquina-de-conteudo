"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sparkles } from "lucide-react"

interface BetaModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BetaModal({ isOpen, onClose }: BetaModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Estamos em Beta!</DialogTitle>
          <DialogDescription className="text-center text-white/60 pt-2">
            O contentMachine está atualmente em fase de testes fechados. 
            Em breve abriremos novas inscrições para o público.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <p className="text-sm text-white/40">
            Acompanhe nossas redes sociais para saber quando liberarmos o acesso.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
