/**
 * JobPollingManager
 *
 * Client component that manages job polling and toast notifications.
 * Reads job IDs from URL search params and polls for status.
 *
 * To use from wizard:
 * router.push(`/dashboard?jobId=${jobId}&jobType=wizard_image_generation`)
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJobPolling } from "@/lib/hooks/use-job-polling";

export function JobPollingManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobType, setJobType] = useState<string | null>(null);

  useEffect(() => {
    // Read jobId and jobType from URL params
    const jobIdParam = searchParams.get("jobId");
    const jobTypeParam = searchParams.get("jobType");

    if (jobIdParam) {
      const id = parseInt(jobIdParam, 10);
      if (!isNaN(id)) {
        setJobId(id);
        setJobType(jobTypeParam);

        // Clean URL params after reading (optional, keeps URL clean)
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("jobId");
        cleanUrl.searchParams.delete("jobType");
        window.history.replaceState({}, "", cleanUrl.toString());
      }
    }
  }, [searchParams]);

  // Also check localStorage for jobs (alternative method)
  useEffect(() => {
    if (jobId) return; // Already have a job from URL

    const storedJobs = localStorage.getItem("pendingJobs");
    if (storedJobs) {
      try {
        const jobs = JSON.parse(storedJobs) as Array<{ id: number; type: string }>;
        if (jobs.length > 0) {
          const firstJob = jobs[0];
          setJobId(firstJob.id);
          setJobType(firstJob.type);

          // Remove this job from storage
          const remaining = jobs.slice(1);
          if (remaining.length > 0) {
            localStorage.setItem("pendingJobs", JSON.stringify(remaining));
          } else {
            localStorage.removeItem("pendingJobs");
          }
        }
      } catch {
        // Silent fail - stored jobs parse error
      }
    }
  }, [jobId]);

  useJobPolling({
    jobId,
    actionLabel: "Ver na Biblioteca",
    onAction: () => router.push("/library"),
  });

  // This component doesn't render anything visible
  return null;
}

/**
 * Helper function to store a job for polling.
 * Call this before redirecting to dashboard.
 */
export function storeJobForPolling(jobId: number, jobType: string) {
  const storedJobs = localStorage.getItem("pendingJobs");
  const jobs = storedJobs ? JSON.parse(storedJobs) : [];
  jobs.push({ id: jobId, type: jobType });
  localStorage.setItem("pendingJobs", JSON.stringify(jobs));
}
