import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_ORIGIN } from './config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a file URL to a full URL for media/submission files
 * Handles relative paths from the backend API
 */
export function resolveFileUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return '';
  if (/^(file:|data:|blob:)/i.test(rawUrl)) return rawUrl;

  // Already a full URL - normalize localhost references
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, API_ORIGIN);
  }

  // Relative path - prepend API origin
  if (rawUrl.startsWith('/')) return `${API_ORIGIN}${rawUrl}`;
  return `${API_ORIGIN}/${rawUrl.replace(/^\.?\//, '')}`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getGradeColor(grade: number): string {
  if (grade >= 90) return "text-success";
  if (grade >= 80) return "text-info";
  if (grade >= 70) return "text-warning";
  return "text-error";
}

export function getGradeBg(grade: number): string {
  if (grade >= 90) return "bg-success/10";
  if (grade >= 80) return "bg-info/10";
  if (grade >= 70) return "bg-warning/10";
  return "bg-error/10";
}