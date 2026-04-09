'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, Loader2, Edit2, Check, X, Users, BookOpen, Save } from 'lucide-react';
import { gradingApi, coursesApi } from '@/lib/api';
import { useIsTeacher } from '@/store/auth';
import type { SubjectGradeData, AdvisoryGradeData, GradingPeriod, GradeEntry, GradeLevel } from '@/lib/types';
import { getGradeColorClass, getGradeBgClass, formatGrade, getPeriodLabels, getLetterGrade } from '@/lib/gradeUtils';
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

// Subject Teacher Gradebook View
function SubjectGradebookView({ courseSectionId, gradeLevel }: { courseSectionId: string; gradeLevel?: GradeLevel }) {
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({});

  const { data: grades, isLoading, error, refetch } = useQuery<SubjectGradeData>({
    queryKey: ['subjectGrades', courseSectionId],
    queryFn: () => gradingApi.getSubjectGrades(courseSectionId),
    enabled: !!courseSectionId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ entryId, value }: { entryId: string; value: number | null }) =>
      gradingApi.updateGradeEntry(entryId, { override_score: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectGrades', courseSectionId] });
      setEditingEntry(null);
      setEditValue('');
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ entryId, isPublished }: { entryId: string; isPublished: boolean }) =>
      gradingApi.publishGradeEntry(entryId, isPublished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectGrades', courseSectionId] });
    },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: (periodId: string) =>
      gradingApi.bulkPublishGrades(courseSectionId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectGrades', courseSectionId] });
    },
  });

  const bulkPublishFinalMutation = useMutation({
    mutationFn: () => gradingApi.bulkPublishFinalGrades(courseSectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectGrades', courseSectionId] });
    },
  });

  const handleBulkPublish = (periodId: string) => {
    bulkPublishMutation.mutate(periodId);
  };

  const handleBulkPublishFinal = () => {
    bulkPublishFinalMutation.mutate();
  };

  const handleEdit = (entryId: string, currentValue: number | null) => {
    setEditingEntry(entryId);
    setEditValue(currentValue !== null ? String(currentValue) : '');
  };

  const handleSave = (entryId: string) => {
    const value = editValue === '' ? null : parseFloat(editValue);
    if (editValue !== '' && (isNaN(value!) || value! < 0 || value! > 100)) {
      return; // Invalid input
    }
    updateMutation.mutate({ entryId, value: value as number | null });
  };

  const handleCancel = () => {
    setEditingEntry(null);
    setEditValue('');
  };

  const handlePublish = (entryId: string, currentStatus: boolean) => {
    publishMutation.mutate({ entryId, isPublished: !currentStatus });
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load grades" onRetry={() => refetch()} />;

  const periods = grades?.periods || [];
  const students = grades?.students || [];
  const semesterGroup = grades?.semester_group;

  // Determine semester label for display
  const semesterLabel = semesterGroup === 1 ? '1st Semester' : semesterGroup === 2 ? '2nd Semester' : null;

  // Handle case where grading periods haven't been set up yet
  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-navy-800 mb-2">No Grading Periods Configured</h3>
        <p className="text-gray-500 mb-4">
          Grading periods need to be configured before grades can be entered.
          Please contact your administrator to set up grading periods (Quarters or Semesters) for the current school year.
        </p>
      </div>
    );
  }

  // Show empty state if no students or no periods configured
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No students enrolled in this course.</p>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No grading periods configured.</p>
        <p className="text-sm text-gray-400 mt-2">Contact your administrator to set up grading periods for this school year.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Semester indicator for Grades 11-12 */}
      {semesterLabel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
          <span className="font-medium">{semesterLabel}</span>
          <span className="text-blue-600 ml-2">({periods.map(p => p.label).join(', ')})</span>
        </div>
      )}

      {/* Header with period labels */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 z-10 text-left px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                  Student Name
                </th>
                {periods.map((period) => {
                  const periodEntries = students.flatMap(s => s.periods || []).filter(p => p.period_id === period.id);
                  const publishedCount = periodEntries.filter(p => p.is_published).length;
                  const totalCount = periodEntries.length;
                  const allPublished = totalCount > 0 && publishedCount === totalCount;
                  const hasGrades = periodEntries.some(p => p.score !== null);

                  return (
                    <th key={period.id} className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>{period.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal text-gray-400">
                            {publishedCount}/{totalCount}
                          </span>
                          {!allPublished && hasGrades && (
                            <button
                              onClick={() => handleBulkPublish(period.id)}
                              disabled={bulkPublishMutation.isPending}
                              className="text-xs px-2 py-0.5 bg-navy-600 text-white rounded hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Publish all grades for this period"
                            >
                              {bulkPublishMutation.isPending ? 'Publishing...' : 'Publish All'}
                            </button>
                          )}
                          {allPublished && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                              Published
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>Final</span>
                    {grades?.all_final_published ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Published
                      </span>
                    ) : (
                      <button
                        onClick={handleBulkPublishFinal}
                        disabled={bulkPublishFinalMutation.isPending}
                        className="text-xs px-2 py-0.5 bg-navy-600 text-white rounded hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Publish all final grades"
                      >
                        {bulkPublishFinalMutation.isPending ? 'Publishing...' : 'Publish Final'}
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.enrollment_id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-navy-800">
                    {student.student_name}
                  </td>
                  {(student.periods || []).map((period) => {
                    const entryId = period.grade_entry_id;
                    const isEditing = editingEntry === entryId;
                    const hasUnsavedChanges = entryId ? unsavedChanges[entryId] !== undefined : false;
                    const isPublishing = publishMutation.isPending;
                    const displayScore = hasUnsavedChanges && entryId
                      ? parseFloat(unsavedChanges[entryId])
                      : period.score;

                    return (
                      <td key={period.period_id} className="text-center px-4 py-3">
                        {entryId ? (
                          <div className="flex flex-col items-center gap-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-16 px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-navy-500"
                                />
                                <button
                                  onClick={() => handleSave(entryId)}
                                  disabled={updateMutation.isPending}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'font-semibold cursor-pointer px-2 py-1 rounded',
                                    getGradeColorClass(displayScore),
                                    hasUnsavedChanges && 'bg-amber-100',
                                    !hasUnsavedChanges && !period.is_published && 'opacity-60'
                                  )}
                                  onClick={() => handleEdit(entryId, period.score)}
                                  title="Click to edit"
                                >
                                  {formatGrade(displayScore)}
                                </span>
                              </div>
                            )}
                            {/* Publish button */}
                            <button
                              onClick={() => handlePublish(entryId, period.is_published)}
                              disabled={isPublishing}
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full transition-colors',
                                period.is_published
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                              )}
                            >
                              {period.is_published ? 'Published' : 'Publish'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-4 py-3">
                    <span className={cn('font-semibold', getGradeColorClass(student.final_grade))}>
                      {formatGrade(student.final_grade)}
                    </span>
                    {student.final_grade_letter && (
                      <span className="ml-2 text-sm text-gray-500">{student.final_grade_letter}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No students enrolled in this course.
          </div>
        )}
      </div>
    </div>
  );
}

// Advisory Teacher View (Read-only overview of all students across all subjects)
function AdvisoryGradebookView({ sectionId }: { sectionId: string }) {
  const { data: grades, isLoading, error, refetch } = useQuery<AdvisoryGradeData>({
    queryKey: ['advisoryGrades', sectionId],
    queryFn: () => gradingApi.getAdvisoryGrades(sectionId),
    enabled: !!sectionId,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load advisory grades" onRetry={() => refetch()} />;

  const students = grades?.students || [];
  const periods = grades?.periods || [];
  const subjects = students[0]?.subjects || [];

  return (
    <div className="space-y-6">
      {/* Section info */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex items-center gap-4">
          <Users className="w-6 h-6 text-navy-600" />
          <div>
            <h3 className="font-semibold text-navy-800">{grades?.section_name}</h3>
            <p className="text-sm text-gray-500">
              {grades?.grade_level} - {grades?.strand} | {grades?.school_year}
            </p>
          </div>
        </div>
      </div>

      {/* Advisory Overview Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 z-10 text-left px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[180px]">
                  Student Name
                </th>
                {subjects.map((subject) => (
                  <th key={subject.subject_id} className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                    <div className="flex flex-col items-center">
                      <span>{subject.subject_code}</span>
                      <span className="text-xs text-gray-400 font-normal">{subject.teacher_name}</span>
                    </div>
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                  Average
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.student_id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-navy-800">
                    {student.student_name}
                  </td>
                  {(student.subjects || []).map((subject) => (
                    <td key={subject.subject_id} className="text-center px-4 py-3">
                      <span className={cn('font-semibold', getGradeColorClass(subject.final_grade))}>
                        {formatGrade(subject.final_grade)}
                      </span>
                    </td>
                  ))}
                  <td className="text-center px-4 py-3">
                    <span className={cn('font-bold text-lg', getGradeColorClass(student.final_average))}>
                      {formatGrade(student.final_average)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No students in this advisory section.
          </div>
        )}
      </div>
    </div>
  );
}

interface TeacherGradesViewProps {
  courseSectionId: string;
  isAdvisory?: boolean;
  sectionId?: string;
}

export function TeacherGradesView({ courseSectionId, isAdvisory = false, sectionId }: TeacherGradesViewProps) {
  const isTeacher = useIsTeacher();

  if (!isTeacher) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">This view is only available to teachers.</p>
      </div>
    );
  }

  // Advisory teacher view - shows all students across all subjects
  if (isAdvisory && sectionId) {
    return <AdvisoryGradebookView sectionId={sectionId} />;
  }

  // Subject teacher view - editable gradebook for their subject
  return <SubjectGradebookView courseSectionId={courseSectionId} />;
}

export default TeacherGradesView;