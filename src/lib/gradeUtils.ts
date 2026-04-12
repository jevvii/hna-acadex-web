import type { GradeLevel } from './types';
import { DEPED_DEFAULT_WEIGHTS } from './gradeConstants';

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

// ---------------------------------------------------------------------------
// Advisory gradebook and DepEd reporting support
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind color classes based on score.
 * Three-tier scale aligned with DepEd passing threshold (75).
 */
export function getGradeColorClasses(score: number | null): {
  text: string;
  bg: string;
  border: string;
} {
  if (score === null) return { text: 'text-slate-400', bg: 'bg-transparent', border: 'border-transparent' };
  if (score >= 75) return { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
  if (score >= 70) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
}

/**
 * Returns DepEd letter grade description.
 */
export function getDepEdLetterGrade(score: number | null): string {
  if (score === null) return '--';
  if (score >= 90) return 'Outstanding';
  if (score >= 85) return 'Very Satisfactory';
  if (score >= 80) return 'Satisfactory';
  if (score >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
}

/**
 * Returns short DepEd letter grade abbreviation.
 */
export function getShortDepEdLetterGrade(score: number | null): string {
  if (score === null) return '--';
  if (score >= 90) return 'O';
  if (score >= 85) return 'VS';
  if (score >= 80) return 'S';
  if (score >= 75) return 'FS';
  return 'DNME';
}

/**
 * Computes final grade from period scores using DepEd average formula.
 */
export function computeFinalGrade(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}

/**
 * Checks if a student is at risk (any grade below 75).
 */
export function isAtRisk(grades: (number | null)[]): boolean {
  return grades.some(g => g !== null && g < 75);
}

/**
 * Gets DepEd default weights for a subject category.
 */
export function getDepEdDefaultWeights(
  category: string | null,
): { written_works: number; performance_tasks: number; quarterly_assessment: number } {
  if (!category) return DEPED_DEFAULT_WEIGHTS.default;
  return DEPED_DEFAULT_WEIGHTS[category] ?? DEPED_DEFAULT_WEIGHTS.default;
}