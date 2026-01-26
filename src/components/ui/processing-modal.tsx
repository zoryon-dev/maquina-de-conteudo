/**
 * ProcessingModal
 *
 * Modal shown when an async operation is being processed in the background.
 * Informs the user that they will be notified when complete.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProcessingModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  redirectPath?: string;
  jobId?: number;
  jobType?: string;
  onComplete?: () => void;
  buttonText?: string;
}

export function ProcessingModal({
  isOpen,
  title,
  message = "Suas imagens estão sendo geradas em segundo plano.",
  redirectPath = "/dashboard",
  jobId,
  jobType = "wizard_image_generation",
  onComplete,
  buttonText,
}: ProcessingModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      // Store job ID in localStorage for dashboard polling
      if (jobId) {
        const storedJobs = localStorage.getItem("pendingJobs");
        const jobs = storedJobs ? JSON.parse(storedJobs) : [];
        jobs.push({ id: jobId, type: jobType });
        localStorage.setItem("pendingJobs", JSON.stringify(jobs));
      }

      // Redirect after showing the modal briefly
      const timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
        router.push(redirectPath);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, redirectPath, router, onComplete, jobId, jobType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white text-center mb-3">
          {title}
        </h2>

        {/* Message */}
        <p className="text-white/70 text-center mb-6">
          {message}
        </p>

        {/* Info */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <p className="text-sm text-white/60 text-center">
            Você será notificado quando estiver pronto.
          </p>
        </div>

        {/* Button */}
        <button
          onClick={() => router.push(redirectPath)}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/80 text-black font-medium rounded-lg transition-colors"
        >
          {buttonText || (redirectPath === "/library" ? "Ir para a Biblioteca" : "Voltar ao Dashboard")}
        </button>
      </div>
    </div>
  );
}
