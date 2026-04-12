'use client';

import { motion } from 'framer-motion';
import { ClipboardList, FlagIcon, AlertCircle } from 'lucide-react';
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

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse">
            <div className="h-8 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-12 bg-gray-100 rounded" />
          </div>
        ))}
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
// Main component
// ---------------------------------------------------------------------------

export function ReportCardView({
  reportCard,
  isLoading,
  error,
  onRetry,
}: ReportCardViewProps) {
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

  // Compute period averages (average of all subject scores for that period)
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

  // Compute the overall average from the data, or fall back to computing from period averages
  const overallAverage = overall_average ?? computeFinalGrade(periodAverages.map((p) => p.average));
  const overallDescriptor = getDepEdLetterGrade(overallAverage);

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-card p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-800">
              Report Card
            </h2>
            <p className="text-sm text-gray-500">
              {reportCard.grade_level}
              {reportCard.strand ? ` - ${reportCard.strand}` : ''}
              {' '}&bull;{' '}
              {reportCard.school_year}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
      >
        {periodAverages.map(({ period, average }) => {
          const colors = getGradeColorClasses(average);
          return (
            <div
              key={period.id}
              className={cn(
                'bg-white rounded-xl shadow-card p-6 border',
                colors.border,
              )}
            >
              <p className="text-sm text-slate-500 mb-1">{period.label} Average</p>
              <p className={cn('text-3xl font-bold', colors.text)}>
                {formatGrade(average)}
              </p>
            </div>
          );
        })}

        {/* Overall average card */}
        {(() => {
          const colors = getGradeColorClasses(overallAverage);
          return (
            <div
              className={cn(
                'bg-white rounded-xl shadow-card p-6 border',
                colors.border,
              )}
            >
              <p className="text-sm text-slate-500 mb-1">Overall</p>
              <p className={cn('text-3xl font-bold', colors.text)}>
                {formatGrade(overallAverage)}
              </p>
            </div>
          );
        })()}
      </motion.div>

      {/* Grades table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                  Subject
                </th>
                {periods.map((period) => (
                  <th
                    key={period.id}
                    className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]"
                  >
                    {period.label}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                  Final
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[160px]">
                  Descriptor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((subject) => {
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

                return (
                  <tr key={subject.course_section_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <div className="font-medium text-slate-800 text-sm">
                        {subject.course_title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {subject.teacher_name}
                      </div>
                    </td>

                    {periodScores.map(({ period, score, overridden }) => {
                      const colors = getGradeColorClasses(score);
                      return (
                        <td key={period.id} className="text-center px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-semibold',
                              colors.bg,
                              colors.text,
                            )}
                          >
                            {formatGrade(score)}
                            {overridden && (
                              <span title="Grade adjusted by adviser">
                                <FlagIcon className="w-3 h-3 text-amber-500" />
                              </span>
                            )}
                          </span>
                        </td>
                      );
                    })}

                    {/* Final grade column */}
                    {(() => {
                      const finalColors = getGradeColorClasses(finalGrade);
                      return (
                        <td className="text-center px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold',
                              finalColors.bg,
                              finalColors.text,
                            )}
                          >
                            {formatGrade(finalGrade)}
                          </span>
                        </td>
                      );
                    })()}

                    {/* Descriptor column */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{descriptor}</span>
                    </td>
                  </tr>
                );
              })}

              {/* Overall average row */}
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="px-4 py-3 sticky left-0 bg-gray-50 z-10 font-bold text-slate-800 text-sm">
                  OVERALL AVERAGE
                </td>

                {periodAverages.map(({ period, average }) => {
                  const colors = getGradeColorClasses(average);
                  return (
                    <td key={period.id} className="text-center px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold',
                          colors.bg,
                          colors.text,
                        )}
                      >
                        {formatGrade(average)}
                      </span>
                    </td>
                  );
                })}

                {/* Overall final grade */}
                {(() => {
                  const colors = getGradeColorClasses(overallAverage);
                  return (
                    <td className="text-center px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold',
                          colors.bg,
                          colors.text,
                        )}
                      >
                        {formatGrade(overallAverage)}
                      </span>
                    </td>
                  );
                })()}

                {/* Overall descriptor */}
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">
                    {overallDescriptor}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default ReportCardView;