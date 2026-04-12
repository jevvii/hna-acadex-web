'use client';

import { motion } from 'framer-motion';
import { ClipboardList, FlagIcon, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import type { StudentReportCard } from '@/lib/types';
import {
  getGradeColorClasses,
  getDepEdLetterGrade,
  computeFinalGrade,
  formatGrade,
} from '@/lib/gradeUtils';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportCardViewProps {
  reportCard: StudentReportCard | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 w-[240px]">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                </th>
                {Array.from({ length: 3 }).map((_, i) => (
                  <th key={i} className="text-center px-4 py-3">
                    <div className="h-4 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
                  </th>
                ))}
                <th className="text-center px-4 py-3">
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
                </th>
                <th className="text-left px-4 py-3 w-[160px]">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, row) => (
                <tr key={row}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  </td>
                  {Array.from({ length: 3 }).map((_, col) => (
                    <td key={col} className="text-center px-4 py-3">
                      <div className="h-4 w-10 bg-gray-100 rounded animate-pulse mx-auto" />
                    </td>
                  ))}
                  <td className="text-center px-4 py-3">
                    <div className="h-4 w-10 bg-gray-100 rounded animate-pulse mx-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3" />
        <p className="text-lg font-medium text-slate-700 mb-1">
          Failed to load report card
        </p>
        <p className="text-sm text-slate-500 mb-4">
          Please try again.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state (no published periods)
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="text-center py-16">
        <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-lg font-medium text-slate-700">
          Report card not yet available
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Your adviser hasn&apos;t published your report card yet.
          Check back later.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component — DepEd-style report card
// ---------------------------------------------------------------------------

export function ReportCardView({
  reportCard,
  isLoading,
  error,
  onRetry,
}: ReportCardViewProps) {
  const user = useAuthStore((state) => state.user);

  // ---- Loading / error / empty guards ----

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (!reportCard || !reportCard.periods || reportCard.periods.length === 0) {
    return <EmptyState />;
  }

  // ---- Derived data ----

  const { periods, subjects, overall_average } = reportCard;

  // Compute period averages
  const periodAverages = periods.map((period) => {
    const scores = subjects
      .map((s) => {
        const pg = s.period_grades.find((pg) => pg.period_label === period.label);
        return pg?.score ?? null;
      })
      .filter((s): s is number => s !== null);

    const avg = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : null;
    return { period, average: avg };
  });

  const overallAverage = overall_average ?? computeFinalGrade(periodAverages.map((p) => p.average));
  const overallDescriptor = getDepEdLetterGrade(overallAverage);

  // Student info
  const studentName = user?.full_name || 'Student';
  const gradeLevel = reportCard.grade_level;
  const strand = reportCard.strand;
  const section = reportCard.section_name;
  const schoolYear = reportCard.school_year;

  return (
    <div className="report-card-container">
      {/* Navy Header Bar */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 rounded-t-xl px-6 py-5 print:rounded-none print:px-4 print:py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-display text-2xl font-semibold print:text-xl">
              REPORT CARD
            </h1>
            <p className="text-white/70 text-sm print:text-xs">
              Department of Education
            </p>
          </div>
          <ClipboardList className="w-8 h-8 text-white/40 print:hidden" />
        </div>
      </div>

      {/* Student Info Block */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 print:px-4 print:py-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm print:text-xs">
          <div>
            <span className="text-gray-500 block">Name</span>
            <span className="font-semibold text-navy-800">{studentName}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Grade Level</span>
            <span className="font-semibold text-navy-800">{gradeLevel}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Section</span>
            <span className="font-semibold text-navy-800">{section}</span>
          </div>
          <div>
            <span className="text-gray-500 block">School Year</span>
            <span className="font-semibold text-navy-800">{schoolYear}</span>
          </div>
          {strand && strand !== 'NONE' && (
            <div>
              <span className="text-gray-500 block">Strand</span>
              <span className="font-semibold text-navy-800">{strand}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grades Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[700px] print:min-w-0">
          <thead>
            <tr className="bg-navy-50 print:bg-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-navy-700 uppercase tracking-wider print:text-[10px] print:px-2 print:py-2 min-w-[200px] print:min-w-0">
                Learning Areas
              </th>
              {periods.map((period) => (
                <th
                  key={period.id}
                  className="text-center px-4 py-3 text-xs font-semibold text-navy-700 uppercase tracking-wider print:text-[10px] print:px-2 print:py-2 min-w-[80px] print:min-w-0"
                >
                  {period.label}
                </th>
              ))}
              <th className="text-center px-4 py-3 text-xs font-semibold text-navy-700 uppercase tracking-wider print:text-[10px] print:px-2 print:py-2 min-w-[100px] print:min-w-0">
                Final Rating
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-navy-700 uppercase tracking-wider print:text-[10px] print:px-2 print:py-2 min-w-[140px] print:min-w-0">
                Remarks
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 print:divide-gray-200">
            {subjects.map((subject, idx) => {
              const periodScores = periods.map((period) => {
                const pg = subject.period_grades.find(
                  (pg) => pg.period_label === period.label,
                );
                return {
                  period,
                  score: pg?.score ?? null,
                  overridden: pg?.adviser_overridden ?? false,
                };
              });

              const finalGrade = computeFinalGrade(periodScores.map((p) => p.score));
              const descriptor = getDepEdLetterGrade(finalGrade);
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 print:bg-gray-50';

              return (
                <tr key={subject.course_section_id} className={rowBg}>
                  <td className="px-4 py-3 print:px-2 print:py-1.5">
                    <div className="font-medium text-slate-800 text-sm print:text-xs">
                      {subject.course_title}
                    </div>
                    <div className="text-xs text-slate-500 print:text-[10px]">
                      {subject.teacher_name}
                    </div>
                  </td>

                  {periodScores.map(({ period, score, overridden }) => {
                    const colors = getGradeColorClasses(score);
                    return (
                      <td key={period.id} className="text-center px-4 py-3 print:px-2 print:py-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-semibold print:text-xs',
                            colors.bg,
                            colors.text,
                          )}
                        >
                          {formatGrade(score)}
                          {overridden && (
                            <span title="Grade adjusted by adviser">
                              <FlagIcon className="w-3 h-3 text-amber-500 print:hidden" />
                            </span>
                          )}
                        </span>
                      </td>
                    );
                  })}

                  {/* Final Rating column */}
                  {(() => {
                    const finalColors = getGradeColorClasses(finalGrade);
                    return (
                      <td className="text-center px-4 py-3 print:px-2 print:py-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold print:text-xs',
                            finalColors.bg,
                            finalColors.text,
                          )}
                        >
                          {formatGrade(finalGrade)}
                        </span>
                      </td>
                    );
                  })()}

                  {/* Remarks column */}
                  <td className="px-4 py-3 print:px-2 print:py-1.5">
                    <span className="text-sm text-slate-700 print:text-xs">{descriptor}</span>
                  </td>
                </tr>
              );
            })}

            {/* General Average row */}
            <tr className="bg-navy-50 border-t-2 border-navy-200 print:bg-gray-100">
              <td className="px-4 py-3 font-bold text-navy-800 text-sm print:text-xs print:px-2 print:py-1.5">
                GENERAL AVERAGE
              </td>

              {periodAverages.map(({ period, average }) => {
                const colors = getGradeColorClasses(average);
                return (
                  <td key={period.id} className="text-center px-4 py-3 print:px-2 print:py-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold print:text-xs',
                        colors.bg,
                        colors.text,
                      )}
                    >
                      {formatGrade(average)}
                    </span>
                  </td>
                );
              })}

              {/* Overall final rating */}
              {(() => {
                const colors = getGradeColorClasses(overallAverage);
                return (
                  <td className="text-center px-4 py-3 print:px-2 print:py-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold print:text-xs',
                        colors.bg,
                        colors.text,
                      )}
                    >
                      {formatGrade(overallAverage)}
                    </span>
                  </td>
                );
              })()}

              {/* Overall remarks */}
              <td className="px-4 py-3 print:px-2 print:py-1.5">
                <span className="text-sm font-bold text-navy-800 print:text-xs">
                  {overallDescriptor}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Published Dates Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 print:px-4 print:py-2">
        <div className="flex flex-wrap gap-3">
          {periods.map((period) => {
            const hasGrades = subjects.some((s) =>
              s.period_grades.some((pg) => pg.period_label === period.label && pg.score !== null),
            );
            if (!hasGrades) return null;
            return (
              <span
                key={period.id}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 print:border print:border-gray-300 print:bg-white print:text-gray-600"
              >
                {period.label} Published
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ReportCardView;