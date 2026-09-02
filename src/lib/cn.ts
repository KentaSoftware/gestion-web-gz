import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind classes with conflict resolution.
 * Use for conditional classes, variants, or mergeable external className.
 * Do NOT use for purely static class strings — use className directly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
