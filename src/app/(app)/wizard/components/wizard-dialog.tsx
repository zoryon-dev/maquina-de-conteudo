/**
 * Wizard Dialog - Modal Wrapper
 *
 * Opens the wizard as a modal dialog overlay.
 * Useful for quick access from dashboard or other pages.
 */

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WizardPage,
  type GeneratedContent,
} from "./wizard-page";

interface WizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (wizardId: number, content: GeneratedContent) => void;
  className?: string;
}

export function WizardDialog({
  isOpen,
  onClose,
  onComplete,
  className,
}: WizardDialogProps) {
  const [shouldRender, setShouldRender] = useState(false);

  // Delay unmount for animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timeout = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#0a0a0f] border border-white/10 shadow-2xl",
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Wizard de Criação
                  </h2>
                  <p className="text-xs text-white/50">
                    Crie conteúdo para redes sociais com IA
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                <WizardPage
                  onComplete={onComplete}
                  onClose={onClose}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to control the wizard dialog
 *
 * Usage:
 * ```tsx
 * const { isOpen, openWizard, closeWizard } = useWizardDialog();
 * ```
 */
export function useWizardDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const openWizard = () => {
    setIsOpen(true);
  };

  const closeWizard = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    openWizard,
    closeWizard,
  };
}

/**
 * Wizard Dialog Provider with trigger button
 *
 * Usage:
 * ```tsx
 * <WizardDialogWithTrigger>
 *   <Button>Abrir Wizard</Button>
 * </WizardDialogWithTrigger>
 * ```
 */
interface WizardDialogWithTriggerProps {
  children: React.ReactElement;
  onComplete?: (wizardId: number, content: GeneratedContent) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export function WizardDialogWithTrigger({
  children,
  onComplete,
  onOpenChange,
}: WizardDialogWithTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleComplete = (wizardId: number, content: GeneratedContent) => {
    handleClose();
    onComplete?.(wizardId, content);
  };

  return (
    <>
      {React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleOpen,
      })}
      <WizardDialog
        isOpen={isOpen}
        onClose={handleClose}
        onComplete={handleComplete}
      />
    </>
  );
}
