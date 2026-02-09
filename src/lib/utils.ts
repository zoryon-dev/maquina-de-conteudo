import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Escape SQL ILIKE special characters */
export function escapeILike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
}
