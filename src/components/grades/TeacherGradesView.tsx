'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, AlertCircle, Loader2, Edit2, Check, X, Users, BookOpen, Send, RotateCcw, Lock, ShieldCheck } from 'lucide-react';
import { gradingApi, coursesApi } from '@/lib/api';
import { GradeWeightsConfig } from './GradeWeightsConfig';
import { AdvisoryGradebookView } from './AdvisoryGradebookView';
import { useIsTeacher } from '@/store/auth';
import type { SubjectGradeData, GradingPeriod, GradeEntry, GradeLevel, GradeSubmission } from '@/lib/types';
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

// Status badge for period submission status
function SubmissionStatusBadge({ status }: { status: GradeSubmission['status'] }) {
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
        <Edit2 className="w-3 h-3" />
        Draft
      </span>
    );
  }
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
        <Send className="w-3 h-3" />
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
      <ShieldCheck className="w-3 h-3" />
      Published
    </span>
  );
}

// Subject Teacher Gradebook View
function SubjectGradebookView({ courseSectionId, gradeLevel }: { courseSectionId: string; gradeLevel?: GradeLevel }) {
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'submit' | 'takeBack' | 'submitAll'; periodId?: string } | null>(null);

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

  const submitMutation = useMutation({
    mutationFn: (periodId: string) =>
      gradingApi.submitPeriodGrades(courseSectionId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectGrades', courseSectionId] });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      alert(`Failed to submit grades: ${err.message}`);
      setConfirmAction(null);
    },
  });

  const takeBackMutation = useMutation({
    mutationFn: (periodId: string) =>
      gradingApi.takeBackPeriodGrades(courseSectionId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectGrades', courseSectionId] });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      alert(`Failed to take back grades: ${err.message}`);
      setConfirmAction(null);
    },
  });

  // Get submission status for a period
  const getSubmissionStatus = (periodId: string): GradeSubmission['status'] => {
    const sub = grades?.submissions?.find(s => s.grading_period_id === periodId);
    return sub?.status ?? 'draft';
  };

  const handleEdit = (entryId: string, currentValue: number | null, periodId: string) => {
    // Only allow editing when period is in draft status
    const status = getSubmissionStatus(periodId);
    if (status !== 'draft') return;
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

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load grades" onRetry={() => refetch()} />;

  const periods = grades?.periods || [];
  const students = grades?.students || [];
  const semesterGroup = grades?.semester_group;
  const submissions = grades?.submissions || [];

  // Determine semester label for display
  const semesterLabel = semesterGroup === 1 ? '1st Semester' : semesterGroup === 2 ? '2nd Semester' : null;

  // Check how many periods are in draft
  const draftPeriods = periods.filter(p => getSubmissionStatus(p.id) === 'draft');

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

  const isAnyMutationPending = submitMutation.isPending || takeBackMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Semester indicator for Grades 11-12 */}
      {semesterLabel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
          <span className="font-medium">{semesterLabel}</span>
          <span className="text-blue-600 ml-2">({periods.map(p => p.label).join(', ')})</span>
        </div>
      )}

      {/* Grade Weights Configuration */}
      <GradeWeightsConfig courseSectionId={courseSectionId} />

      {/* Submit All Periods button */}
      {draftPeriods.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmAction({ type: 'submitAll' })}
            disabled={isAnyMutationPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Submit All Periods
          </button>
          <span className="text-xs text-gray-500">
            {draftPeriods.length} period{draftPeriods.length !== 1 ? 's' : ''} in draft
          </span>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-navy-800 mb-2">
              {confirmAction.type === 'submit' && 'Submit Period Grades'}
              {confirmAction.type === 'takeBack' && 'Take Back Period Grades'}
              {confirmAction.type === 'submitAll' && 'Submit All Period Grades'}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {confirmAction.type === 'submit' && 'Grades will be locked for editing until taken back. The adviser will be able to review and publish them.'}
              {confirmAction.type === 'takeBack' && 'Grades will be unlocked for editing. You will need to resubmit them when ready.'}
              {confirmAction.type === 'submitAll' && 'All draft period grades will be submitted and locked for editing. The adviser will be able to review and publish them.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'submitAll') {
                    // Submit all draft periods sequentially
                    const submitDrafts = async () => {
                      for (const period of draftPeriods) {
                        await gradingApi.submitPeriodGrades(courseSectionId, period.id);
                      }
                      queryClient.invalidateQueries({ queryKey: ['subjectGrades', courseSectionId] });
                      setConfirmAction(null);
                    };
                    submitDrafts().catch((err: Error) => {
                      alert(`Failed to submit all grades: ${err.message}`);
                      setConfirmAction(null);
                    });
                  } else if (confirmAction.type === 'submit' && confirmAction.periodId) {
                    submitMutation.mutate(confirmAction.periodId);
                  } else if (confirmAction.type === 'takeBack' && confirmAction.periodId) {
                    takeBackMutation.mutate(confirmAction.periodId);
                  }
                }}
                disabled={isAnyMutationPending}
                className={cn(
                  "px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed",
                  confirmAction.type === 'takeBack'
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-navy-600 hover:bg-navy-700"
                )}
              >
                {isAnyMutationPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  confirmAction.type === 'takeBack' ? 'Take Back' : 'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with period labels and submission controls */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 z-10 text-left px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                  Student Name
                </th>
                {periods.map((period) => {
                  const status = getSubmissionStatus(period.id);
                  const isDraft = status === 'draft';
                  const isSubmitted = status === 'submitted';
                  const isPublished = status === 'published';

                  return (
                    <th key={period.id} className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>{period.label}</span>
                        <SubmissionStatusBadge status={status} />
                        {isDraft && (
                          <button
                            onClick={() => setConfirmAction({ type: 'submit', periodId: period.id })}
                            disabled={isAnyMutationPending}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-navy-600 text-white rounded hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-3 h-3" />
                            Submit
                          </button>
                        )}
                        {isSubmitted && (
                          <button
                            onClick={() => setConfirmAction({ type: 'takeBack', periodId: period.id })}
                            disabled={isAnyMutationPending}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-amber-300 text-amber-700 rounded hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Take Back
                          </button>
                        )}
                        {isPublished && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400" title="Published by adviser. Contact adviser to make changes.">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                  Final
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
                    const status = getSubmissionStatus(period.period_id);
                    const isLocked = status !== 'draft';
                    const displayScore = period.score;

                    return (
                      <td key={period.period_id} className={cn(
                        "text-center px-4 py-3",
                        isLocked && "bg-slate-50"
                      )}>
                        {entryId ? (
                          <div className="flex flex-col items-center gap-1">
                            {isEditing && !isLocked ? (
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
                              <span
                                className={cn(
                                  'font-semibold px-2 py-1 rounded',
                                  getGradeColorClass(displayScore),
                                  isLocked
                                    ? 'cursor-not-allowed'
                                    : 'cursor-pointer hover:ring-2 hover:ring-navy-300'
                                )}
                                onClick={() => !isLocked && handleEdit(entryId, period.score, period.period_id)}
                                title={isLocked ? `Grades are locked (${status})` : 'Click to edit'}
                              >
                                {formatGrade(displayScore)}
                              </span>
                            )}
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

// Advisory Teacher View — delegates to the full-featured AdvisoryGradebookView component

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