import type { GradeLevel } from './types';

/**
 * Get period labels based on grade level.
 * Grades 7-10 use Quarters (Q1-Q4), Grades 11-12 use Semesters (1st Sem, 2nd Sem).
 */
export function getPeriodLabels(gradeLevel: GradeLevel): string[] {
  if (['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(gradeLevel)) {
    return ['Q1', 'Q2', 'Q3', 'Q4'];
  }
  return ['1st Sem', '2nd Sem'];
}

/**
 * Get the CSS color token for a grade score.
 * >= 75: success (green)
 * 50-74: warning (amber/yellow)
 * < 50: danger (red)
 */
export function getGradeColor(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'var(--color-text-secondary)';
  }
  if (score >= 75) {
    return 'var(--color-text-success)';
  }
  if (score >= 50) {
    return 'var(--color-text-warning)';
  }
  return 'var(--color-text-danger)';
}

/**
 * Get the Tailwind CSS class for a grade score.
 * >= 75: text-green-600
 * 50-74: text-amber-600
 * < 50: text-red-600
 */
export function getGradeColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'text-gray-500';
  }
  if (score >= 75) {
    return 'text-green-600';
  }
  if (score >= 50) {
    return 'text-amber-600';
  }
  return 'text-red-600';
}

/**
 * Get the Tailwind CSS background class for a grade score.
 * >= 75: bg-green-100
 * 50-74: bg-amber-100
 * < 50: bg-red-100
 */
export function getGradeBgClass(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'bg-gray-100';
  }
  if (score >= 75) {
    return 'bg-green-100';
  }
  if (score >= 50) {
    return 'bg-amber-100';
  }
  return 'bg-red-100';
}

/**
 * Check if a grade entry is published.
 */
export function isPublished(entry: { is_published: boolean }): boolean {
  return entry.is_published;
}

/**
 * Convert a numeric score to a letter grade (Philippine system).
 * Based on DepEd grading scale.
 */
export function getLetterGrade(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return 'N/A';
  }
  if (score >= 98) return 'A+';
  if (score >= 95) return 'A';
  if (score >= 92) return 'A-';
  if (score >= 89) return 'B+';
  if (score >= 86) return 'B';
  if (score >= 83) return 'B-';
  if (score >= 80) return 'C+';
  if (score >= 77) return 'C';
  if (score >= 75) return 'C-';
  if (score >= 72) return 'D+';
  if (score >= 70) return 'D';
  if (score >= 67) return 'D-';
  return 'F';
}

/**
 * Format a grade score for display.
 * Handles null/undefined, rounds to 2 decimal places.
 */
export function formatGrade(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return '--';
  }
  return score.toFixed(1);
}

/**
 * Calculate the average of an array of grades.
 * Only includes non-null values.
 */
export function calculateAverage(grades: (number | null | undefined)[]): number | null {
  const validGrades = grades.filter((g): g is number => g !== null && g !== undefined);
  if (validGrades.length === 0) {
    return null;
  }
  const sum = validGrades.reduce((acc, g) => acc + g, 0);
  return Math.round((sum / validGrades.length) * 100) / 100;
}

/**
 * Check if all grades in an array are published.
 */
export function areAllPublished(entries: Array<{ is_published: boolean }>): boolean {
  return entries.length > 0 && entries.every(e => e.is_published);
}

/**
 * Get the count of published vs unpublished grades.
 */
export function getPublishStatus(entries: Array<{ is_published: boolean }>): { published: number; unpublished: number } {
  const published = entries.filter(e => e.is_published).length;
  return {
    published,
    unpublished: entries.length - published,
  };
}