'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Users, AlertTriangle, ChevronRight, GraduationCap, Loader2, AlertCircle } from 'lucide-react';
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
  const { data: grades, isPending, error, refetch } = useQuery<AdvisoryGradeData>({
    queryKey: ['advisoryGrades', sectionId],
    queryFn: () => gradingApi.getAdvisoryGrades(sectionId),
    enabled: !!sectionId,
  });

  if (isPending) {
    return (
      <div className="group">
        <div className="block bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-navy-600 to-navy-800 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-advisory-loading" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-advisory-loading)" />
              </svg>
            </div>
            <div className="relative z-10 p-6">
              <div className="h-3 w-20 bg-white/20 rounded animate-pulse" />
              <div className="h-6 w-32 bg-white/20 rounded mt-2 animate-pulse" />
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-navy-600 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div whileHover={{ y: -4 }} className="group">
        <div className="block bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-navy-600 to-navy-800 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-advisory-error" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-advisory-error)" />
              </svg>
            </div>
            <div className="relative z-10 p-6">
              <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">Advisory</span>
              <h3 className="text-white font-display text-xl font-semibold mt-1">{sectionName}</h3>
            </div>
          </div>
          <div className="p-5">
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
        </div>
      </motion.div>
    );
  }

  const periods = grades?.periods || [];
  const submissionStatus = grades?.submission_status || [];
  const periodProgress = computePeriodProgress(periods, submissionStatus);
  const atRiskCount = grades ? countAtRiskStudents(grades) : 0;
  const studentCount = grades?.students.length || 0;

  const schoolYear = grades?.school_year || '';
  const isSHS = grades?.grade_level === 'Grade 11' || grades?.grade_level === 'Grade 12';
  const semesterLabel = isSHS ? '1st Semester' : '';
  const gradeLevel = grades?.grade_level || '';
  const strand = grades?.strand || '';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={`/advisory/${sectionId}/grades`}
        className="block bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
      >
        {/* Header with Navy Gradient */}
        <div className="h-32 bg-gradient-to-r from-navy-600 to-navy-800 p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-advisory-${sectionId}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-advisory-${sectionId})`} />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
              Advisory
            </span>
            <h3 className="text-white font-display text-xl font-semibold mt-1">
              {sectionName}
            </h3>
            <p className="text-white/70 text-sm mt-1">
              {gradeLevel}{strand && strand !== 'NONE' ? ` \u2022 ${strand}` : ''}
              {schoolYear ? ` \u2022 SY ${schoolYear}` : ''}
              {semesterLabel ? ` \u2022 ${semesterLabel}` : ''}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Student count */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Users className="w-4 h-4" />
            <span>{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Submission Progress */}
          <div className="space-y-2 mb-4">
            {periodProgress.map(({ periodLabel, submitted, total }) => {
              const pct = total > 0 ? (submitted / total) * 100 : 0;
              const isComplete = submitted === total && total > 0;

              return (
                <div key={periodLabel} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-8 font-medium">{periodLabel}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isComplete ? 'bg-green-500' : 'bg-navy-500',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn(
                    'text-xs font-medium w-32 text-right',
                    isComplete ? 'text-green-600' : 'text-gray-500',
                  )}>
                    {submitted}/{total} submitted
                  </span>
                </div>
              );
            })}
          </div>

          {/* At-Risk Warning */}
          {atRiskCount > 0 && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-700">
                {atRiskCount} at risk
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 text-navy-600 group-hover:text-navy-800 transition-colors">
            <span className="text-sm font-medium">Manage Advisory</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}