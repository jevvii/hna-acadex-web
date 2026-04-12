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

/**
 * Convert an absolute media URL to a relative path for the Next.js proxy
 * This allows media files to be fetched through the proxy, avoiding CSP issues
 * when the backend is accessed via different IPs (localhost vs LAN IP)
 */
export function toMediaProxyUrl(fileUrl: string | undefined | null): string {
  if (!fileUrl) return '';
  if (/^(file:|data:|blob:)/i.test(fileUrl)) return fileUrl;

  // Already a relative path - return as-is
  if (fileUrl.startsWith('/')) return fileUrl;

  // Absolute URL - extract the path portion for /media/ files
  if (/^https?:\/\//i.test(fileUrl)) {
    // Match /media/ or /course_files/ or similar media paths
    const mediaMatch = fileUrl.match(/^https?:\/\/[^/]+(\/(?:media|course_files)\/.*)$/i);
    if (mediaMatch) {
      return mediaMatch[1];
    }
  }

  // Fallback - return as-is
  return fileUrl;
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