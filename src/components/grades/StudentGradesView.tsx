'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { gradingApi } from '@/lib/api';
import { useIsStudent } from '@/store/auth';
import type { StudentGradeData, GradingPeriod } from '@/lib/types';
import { getGradeColorClass, getGradeBgClass, formatGrade, getPeriodLabels } from '@/lib/gradeUtils';

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
    <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
        <TrendingUp className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-lg font-medium">No Published Grades</p>
      <p className="text-sm mt-1">Grades haven't been published yet. Check back later.</p>
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

  // Filter to only published grades
  const publishedPeriods = grades?.periods?.filter(p => p.is_published) || [];
  const hasPublishedGrades = publishedPeriods.length > 0;

  // Calculate summary stats
  const periodScores = publishedPeriods
    .map(p => p.score)
    .filter((s): s is number => s !== null);

  const finalGrade = grades?.final_grade;
  const averageScore = periodScores.length > 0
    ? Math.round((periodScores.reduce((a, b) => a + b, 0) / periodScores.length) * 10) / 10
    : null;

  // Get period labels based on grade level
  const periodLabels = grades?.grade_level
    ? getPeriodLabels(grades.grade_level)
    : ['Q1', 'Q2', 'Q3', 'Q4'];

  if (!hasPublishedGrades) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Final Average Card */}
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Final Average</p>
          <p className={`text-3xl font-bold ${finalGrade ? getGradeColorClass(finalGrade) : 'text-gray-400'}`}>
            {formatGrade(finalGrade)}
          </p>
          {grades?.final_grade_letter && (
            <p className="text-sm text-gray-500 mt-1">{grades.final_grade_letter}</p>
          )}
        </div>

        {/* Period Average Cards */}
        {publishedPeriods.slice(0, 3).map((period, index) => (
          <div
            key={period.period.id}
            className="bg-white rounded-xl shadow-card p-4 text-center"
          >
            <p className="text-sm text-gray-500 mb-1">{period.period.label}</p>
            <p className={`text-3xl font-bold ${period.score ? getGradeColorClass(period.score) : 'text-gray-400'}`}>
              {formatGrade(period.score)}
            </p>
          </div>
        ))}

        {/* Fill remaining slots if needed */}
        {publishedPeriods.length < 3 && Array.from({ length: 3 - publishedPeriods.length }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white rounded-xl shadow-card p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">{periodLabels[publishedPeriods.length + i] || '--'}</p>
            <p className="text-3xl font-bold text-gray-400">--</p>
          </div>
        ))}
      </div>

      {/* Per-Subject Breakdown (placeholder for future enhancement) */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-navy-800">Grade Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Period</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Score</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {publishedPeriods.map((period) => (
                <tr key={period.period.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-navy-800">
                    {period.period.label}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-semibold ${getGradeColorClass(period.score)}`}>
                      {formatGrade(period.score)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getGradeBgClass(period.score)} ${getGradeColorClass(period.score)}`}>
                      {period.score !== null && period.score >= 75 ? 'Passing' : period.score !== null ? 'Failing' : 'No Grade'}
                    </span>
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

export default StudentGradesView;