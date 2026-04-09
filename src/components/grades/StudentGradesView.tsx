'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { gradingApi } from '@/lib/api';
import { useIsStudent } from '@/store/auth';
import type { StudentGradeData, GradingPeriod } from '@/lib/types';
import { getGradeColorClass, getGradeBgClass, formatGrade, getLetterGrade } from '@/lib/gradeUtils';
import { cn } from '@/lib/utils';

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <AlertCircle className="w-12 h-12 mb-3" />
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-card p-8 text-center">
      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-navy-800 mb-2">No Published Grades</h3>
      <p className="text-gray-500">
        Grades haven't been published yet. Check back later.
      </p>
    </div>
  );
}

function NoGradingPeriodsState() {
  return (
    <div className="bg-white rounded-xl shadow-card p-8 text-center">
      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-navy-800 mb-2">No Grading Periods</h3>
      <p className="text-gray-500">
        Grading periods haven't been configured for this course yet.
      </p>
    </div>
  );
}

interface StudentGradesViewProps {
  courseSectionId: string;
}

export function StudentGradesView({ courseSectionId }: StudentGradesViewProps) {
  const isStudent = useIsStudent();

  const { data: grades, isLoading, error, refetch } = useQuery<StudentGradeData>({
    queryKey: ['studentGrades', courseSectionId],
    queryFn: () => gradingApi.getStudentGrades(courseSectionId),
    enabled: !!courseSectionId && isStudent,
  });

  if (!isStudent) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">This view is only available to students.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load grades" onRetry={() => refetch()} />;

  const periods = grades?.periods || [];
  const finalGrade = grades?.final_grade;
  const finalGradeLetter = grades?.final_grade_letter;

  // Check if there are any periods configured
  if (periods.length === 0) {
    return <NoGradingPeriodsState />;
  }

  // Check if any grades are published
  const publishedPeriods = periods.filter(p => p.is_published);
  const hasPublishedGrades = publishedPeriods.length > 0;

  if (!hasPublishedGrades) {
    return <EmptyState />;
  }

  // Calculate semester group for Grades 11-12
  const gradeLevel = grades?.grade_level;
  const isSHS = gradeLevel === 'Grade 11' || gradeLevel === 'Grade 12';

  // For SHS, group periods by semester
  let displayPeriods: { period: GradingPeriod; score: number | null; is_published: boolean }[] = [];

  if (isSHS) {
    // For SHS, show periods grouped by semester
    displayPeriods = periods;
  } else {
    // For JHS, show all quarters
    displayPeriods = periods;
  }

  // Calculate overall status
  const passingPeriods = publishedPeriods.filter(p => p.score !== null && p.score >= 75);
  const allPassing = publishedPeriods.length > 0 && passingPeriods.length === publishedPeriods.length;
  const anyFailing = publishedPeriods.some(p => p.score !== null && p.score < 75);

  return (
    <div className="space-y-4">
      {/* Course Info Header */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex items-center gap-4">
          <BookOpen className="w-6 h-6 text-navy-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-navy-800">
              {grades?.course_code} - {grades?.course_title}
            </h3>
            <p className="text-sm text-gray-500">{grades?.grade_level}</p>
          </div>
          {/* Overall Status Badge */}
          <div className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium',
            allPassing ? 'bg-green-100 text-green-700' :
            anyFailing ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          )}>
            {allPassing ? 'All Passing' : anyFailing ? 'Needs Improvement' : 'In Progress'}
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                {displayPeriods.map((periodData) => (
                  <th
                    key={periodData.period.id}
                    className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{periodData.period.label}</span>
                      {!periodData.is_published && (
                        <span className="text-xs font-normal text-gray-400">(Unpublished)</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                  Final
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                {displayPeriods.map((periodData) => {
                  const isPublished = periodData.is_published;
                  const score = isPublished ? periodData.score : null;
                  const isPassing = score !== null && score >= 75;

                  return (
                    <td key={periodData.period.id} className="text-center px-4 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn(
                          'text-xl font-bold',
                          isPublished ? getGradeColorClass(score) : 'text-gray-400'
                        )}>
                          {isPublished ? formatGrade(score) : '--'}
                        </span>
                        {isPublished && score !== null && (
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            getGradeBgClass(score),
                            getGradeColorClass(score)
                          )}>
                            {isPassing ? 'Passing' : 'Failing'}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="text-center px-4 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      'text-xl font-bold',
                      finalGrade ? getGradeColorClass(finalGrade) : 'text-gray-400'
                    )}>
                      {formatGrade(finalGrade)}
                    </span>
                    {finalGradeLetter && (
                      <span className="text-xs text-gray-500">
                        {finalGradeLetter}
                      </span>
                    )}
                    {finalGrade !== null && finalGrade !== undefined && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        getGradeBgClass(finalGrade),
                        getGradeColorClass(finalGrade)
                      )}>
                        {(finalGrade as number) >= 75 ? 'Passing' : 'Failing'}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade Legend */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">Grade Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600">Passing (75-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-gray-600">Warning (50-74)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Failing (&lt;50)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-300"></span>
            <span className="text-gray-600">No Grade / Unpublished</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentGradesView;