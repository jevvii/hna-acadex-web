'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, AlertTriangle, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { gradingApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { isAtRisk } from '@/lib/gradeUtils';
import type { AdvisoryGradeData, AdvisorySubmissionStatus, GradingPeriod } from '@/lib/types';

interface AdvisoryDashboardCardProps {
  sectionId: string;
  sectionName: string;
}

/**
 * Compute per-period submission progress from the advisory submission status array.
 */
function computePeriodProgress(
  periods: GradingPeriod[],
  submissionStatus: AdvisorySubmissionStatus[],
) {
  return periods.map((period) => {
    const total = submissionStatus.length;
    let submitted = 0;

    for (const course of submissionStatus) {
      const periodEntry = course.periods.find(
        (p) => p.grading_period_id === period.id,
      );
      if (periodEntry && periodEntry.status !== 'draft') {
        submitted++;
      }
    }

    return {
      periodLabel: period.label,
      submitted,
      total,
    };
  });
}

/**
 * Count students who have any grade below 75 (the DepEd passing threshold).
 */
function countAtRiskStudents(data: AdvisoryGradeData): number {
  return data.students.filter((student) => {
    const allScores: (number | null)[] = student.subjects.flatMap((subject) => [
      ...subject.periods.map((p) => p.score),
      subject.final_grade,
    ]);
    return isAtRisk(allScores);
  }).length;
}

export function AdvisoryDashboardCard({ sectionId, sectionName }: AdvisoryDashboardCardProps) {
  const { data: grades, isLoading, error, refetch } = useQuery<AdvisoryGradeData>({
    queryKey: ['advisoryGrades', sectionId],
    queryFn: () => gradingApi.getAdvisoryGrades(sectionId),
    enabled: !!sectionId,
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
          <p className="text-sm">Failed to load advisory data</p>
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

  const periods = grades?.periods || [];
  const submissionStatus = grades?.submission_status || [];
  const periodProgress = computePeriodProgress(periods, submissionStatus);
  const atRiskCount = grades ? countAtRiskStudents(grades) : 0;
  const firstCourseSectionId = submissionStatus[0]?.course_section_id;

  const schoolYear = grades?.school_year || '';
  const isSHS = grades?.grade_level === 'Grade 11' || grades?.grade_level === 'Grade 12';
  const semesterLabel = isSHS ? '1st Semester' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-card p-6 mb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-navy-600" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-navy-800">
            My Advisory: {sectionName}
          </h2>
          <p className="text-sm text-gray-500">
            {schoolYear}{semesterLabel ? ` \u2022 ${semesterLabel}` : ''}
          </p>
        </div>
      </div>

      {/* Submission Progress */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-navy-800 mb-3">Submission Progress</h3>
        <div className="space-y-2">
          {periodProgress.map(({ periodLabel, submitted, total }) => {
            const pct = total > 0 ? (submitted / total) * 100 : 0;
            const isComplete = submitted === total && total > 0;

            return (
              <div key={periodLabel} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-8 font-medium">{periodLabel}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isComplete ? 'bg-green-500' : 'bg-blue-500',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={cn(
                  'text-xs font-medium w-32 text-right',
                  isComplete ? 'text-green-600' : 'text-gray-500',
                )}>
                  {submitted}/{total} subjects submitted
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* At-Risk Warning */}
      {atRiskCount > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-700">
            {atRiskCount} student{atRiskCount !== 1 ? 's' : ''} at risk (grade &lt; 75 in any subject)
          </span>
        </div>
      )}

      {/* Manage Advisory Grades Link */}
      {firstCourseSectionId && (
        <Link
          href={`/courses/${firstCourseSectionId}?tab=grades&subtab=advisory`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors group"
        >
          Manage Advisory Grades
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </motion.div>
  );
}