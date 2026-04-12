'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { gradingApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getGradeColorClasses, formatGrade, getDepEdLetterGrade } from '@/lib/gradeUtils';
import type { StudentReportCard } from '@/lib/types';

export function ReportCardCard() {
  const { data: reportCard, isLoading, error, refetch } = useQuery<StudentReportCard>({
    queryKey: ['studentReportCard'],
    queryFn: () => gradingApi.getStudentReportCard(),
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6 mb-8">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-navy-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6 mb-8">
        <div className="flex flex-col items-center justify-center py-4 text-gray-500">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="text-sm">Failed to load report card</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-navy-600 hover:text-navy-800 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Determine the most recently published period (highest period_number among published)
  const latestPublishedPeriod = getLatestPublishedPeriod(reportCard);

  // Empty state: no report card data or no published periods
  if (!reportCard || !latestPublishedPeriod) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-card p-6 mb-8"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-800">
              My Report Card
            </h2>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <ClipboardList className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">
            Your report card hasn&apos;t been published yet.
            Check back after your adviser releases grades.
          </p>
        </div>
      </motion.div>
    );
  }

  // Get the period label for display
  const periodLabel = latestPublishedPeriod.label;

  // Compute section info subtitle
  const strandPart = reportCard.strand ? ` - ${reportCard.strand}` : '';
  const subtitle = `${reportCard.grade_level}${strandPart} | SY ${reportCard.school_year}`;

  // Get grades for the latest published period
  const subjectGrades = reportCard.subjects.map((subject) => {
    const periodGrade = subject.period_grades.find(
      (pg) => pg.period_label === periodLabel,
    );
    return {
      course_title: subject.course_title,
      score: periodGrade?.score ?? null,
    };
  });

  // Limit to 6 subjects displayed
  const displaySubjects = subjectGrades.slice(0, 6);
  const remainingCount = subjectGrades.length - 6;

  // Calculate overall average for the shown period
  const periodAverage = reportCard.overall_average;

  const averageColorClasses = getGradeColorClasses(periodAverage);
  const letterGrade = getDepEdLetterGrade(periodAverage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-card p-6 mb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-800">
              My Report Card
            </h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <Link
          href="/report-card"
          className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors group"
        >
          View Full
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Period Label */}
      <div className="mt-4 mb-3">
        <span className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
          'bg-green-50 text-green-700 border border-green-200',
        )}>
          {periodLabel} Published
        </span>
      </div>

      {/* Subject Grades Grid (2 columns) */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
        {displaySubjects.map((subject) => {
          const colorClasses = getGradeColorClasses(subject.score);
          return (
            <div key={subject.course_title} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-700 truncate pr-2">{subject.course_title}</span>
              <span className={cn('text-sm font-semibold tabular-nums', colorClasses.text)}>
                {formatGrade(subject.score)}
              </span>
            </div>
          );
        })}
      </div>

      {/* More subjects indicator */}
      {remainingCount > 0 && (
        <p className="text-xs text-slate-400 mb-4">
          And {remainingCount} more subject{remainingCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Overall Average */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 rounded-lg border',
        averageColorClasses.bg,
        averageColorClasses.border,
      )}>
        <span className="text-sm font-medium text-gray-700">
          Overall {periodLabel} Average
        </span>
        <div className="flex items-center gap-2">
          <span className={cn('text-lg font-bold tabular-nums', averageColorClasses.text)}>
            {formatGrade(periodAverage)}
          </span>
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', averageColorClasses.bg, averageColorClasses.text)}>
            {letterGrade}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Get the latest published period from the report card.
 * "Latest" means the period with the highest period_number that has published grades.
 * A period is considered published if any subject has a non-null score for it
 * in period_grades, and the period's is_current or the report card data includes it.
 */
function getLatestPublishedPeriod(
  reportCard: StudentReportCard | undefined,
): { id: string; label: string; period_number: number } | null {
  if (!reportCard) return null;

  // Find periods that have at least one grade entry
  const periodsForPeriod = reportCard.periods
    .filter((period) => {
      // Check if any subject has a grade for this period
      return reportCard.subjects.some((subject) =>
        subject.period_grades.some((pg) => pg.period_label === period.label),
      );
    })
    .sort((a, b) => b.period_number - a.period_number);

  return periodsForPeriod.length > 0 ? periodsForPeriod[0] : null;
}