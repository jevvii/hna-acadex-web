import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format a date string or Date object to a human-readable format
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(date: string | Date): string {
  if (!date) return 'No date';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Format a date string or Date object with time
 * @param date - Date string or Date object
 * @returns Formatted date string with time (e.g., "Jan 15, 2024 3:30 PM")
 */
export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

/**
 * Format a date string or Date object as relative time
 * @param date - Date string or Date object
 * @returns Relative time string (e.g., "5 minutes ago", "2 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}