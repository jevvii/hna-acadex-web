'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { gradingApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getGradeColorClasses, formatGrade, getDepEdLetterGrade } from '@/lib/gradeUtils';
import type { StudentReportCard } from '@/lib/types';

export function ReportCardCard() {
  const { data: reportCard, isPending, error } = useQuery<StudentReportCard>({
    queryKey: ['studentReportCard'],
    queryFn: () => gradingApi.getStudentReportCard(),
    enabled: true,
  });

  if (isPending || error) {
    return null;
  }

  const latestPublishedPeriod = getLatestPublishedPeriod(reportCard);
  const isPublished = !!reportCard && !!latestPublishedPeriod;
  if (!isPublished) {
    return null;
  }

  // Get the period label and average for the published state
  const periodLabel = latestPublishedPeriod?.label ?? '';
  const periodAverage = reportCard?.overall_average ?? null;
  const averageColorClasses = getGradeColorClasses(periodAverage);
  const letterGrade = getDepEdLetterGrade(periodAverage);

  // Get subject grades for the latest published period (for body preview)
  const displaySubjects = isPublished && reportCard
    ? reportCard.subjects.slice(0, 4).map((subject) => {
        const periodGrade = subject.period_grades.find(
          (pg) => pg.period_label === periodLabel,
        );
        return {
          course_title: subject.course_title,
          score: periodGrade?.score ?? null,
        };
      })
    : [];

  const remainingCount = isPublished && reportCard
    ? reportCard.subjects.length - 4
    : 0;

  // Card content shared between published and unpublished states
  const cardContent = (
    <>
      {/* Header with Navy Gradient */}
      <div className="h-32 bg-gradient-to-r from-navy-600 to-navy-800 p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-report-card" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-report-card)" />
          </svg>
        </div>
        <div className="relative z-10">
          <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
            Report Card
          </span>
          <h3 className="text-white font-display text-xl font-semibold mt-1">
            {isPublished ? reportCard!.section_name : 'My Report Card'}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Period badge */}
        <span className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-3',
          'bg-green-50 text-green-700 border border-green-200',
        )}>
          {periodLabel} Published
        </span>

        {/* Subject grades preview */}
        <div className="space-y-1.5 mb-3">
          {displaySubjects.map((subject) => {
            const colorClasses = getGradeColorClasses(subject.score);
            return (
              <div key={subject.course_title} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate pr-2">{subject.course_title}</span>
                <span className={cn('text-sm font-semibold tabular-nums', colorClasses.text)}>
                  {formatGrade(subject.score)}
                </span>
              </div>
            );
          })}
        </div>

        {remainingCount > 0 && (
          <p className="text-xs text-slate-400 mb-3">
            And {remainingCount} more subject{remainingCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Overall average */}
        <div className={cn(
          'flex items-center justify-between px-3 py-2.5 rounded-lg border',
          averageColorClasses.bg,
          averageColorClasses.border,
        )}>
          <span className="text-sm font-medium text-gray-700">
            {periodLabel} Average
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

        {/* Footer */}
        <div className="flex items-center gap-2 mt-4 text-navy-600 group-hover:text-navy-800 transition-colors">
          <span className="text-sm font-medium">View Report Card</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </>
  );

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href="/report-card"
        className="block bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
      >
        {cardContent}
      </Link>
    </motion.div>
  );
}

/**
 * Get the latest published period from the report card.
 * "Latest" means the period with the highest period_number that has published grades.
 */
function getLatestPublishedPeriod(
  reportCard: StudentReportCard | undefined,
): { id: string; label: string; period_number: number } | null {
  if (!reportCard) return null;

  const periodsForPeriod = reportCard.periods
    .filter((period) => {
      return reportCard.subjects.some((subject) =>
        subject.period_grades.some((pg) => pg.period_label === period.label),
      );
    })
    .sort((a, b) => b.period_number - a.period_number);

  return periodsForPeriod.length > 0 ? periodsForPeriod[0] : null;
}
