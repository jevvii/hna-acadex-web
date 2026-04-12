'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  RotateCcw,
  Lock,
  AlertTriangle,
  Flag,
  Check,
  X,
  Loader2,
  Users,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { gradingApi } from '@/lib/api';
import type {
  AdvisoryGradeData,
  AdvisorySubmissionStatus,
  AdvisoryReportCardStatus,
} from '@/lib/types';
import {
  getGradeColorClass,
  getGradeBgClass,
  getGradeColorClasses,
  formatGrade,
  isAtRisk,
} from '@/lib/gradeUtils';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers (unified to gradeUtils.ts)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

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
      <AlertTriangle className="w-12 h-12 mb-3" />
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

// ---------------------------------------------------------------------------
// Local state types
// ---------------------------------------------------------------------------

type ConfirmAction =
  | { type: 'publish'; periodId: string; periodLabel: string }
  | { type: 'unpublish'; periodId: string; periodLabel: string };

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdvisoryGradebookView({ sectionId }: { sectionId: string }) {
  const queryClient = useQueryClient();

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [overriddenEntries, setOverriddenEntries] = useState<Set<string>>(new Set());

  const { data, isPending, error, refetch } = useQuery<AdvisoryGradeData>({
    queryKey: ['advisoryGrades', sectionId],
    queryFn: () => gradingApi.getAdvisoryGrades(sectionId),
    enabled: !!sectionId,
  });

  const publishMutation = useMutation({
    mutationFn: ({ periodId }: { periodId: string }) =>
      gradingApi.publishReportCard(sectionId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisoryGrades', sectionId] });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      alert(`Failed to publish report card: ${err.message}`);
      setConfirmAction(null);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: ({ periodId }: { periodId: string }) =>
      gradingApi.unpublishReportCard(sectionId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisoryGrades', sectionId] });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      alert(`Failed to unpublish report card: ${err.message}`);
      setConfirmAction(null);
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ entryId, score }: { entryId: string; score: number | null }) =>
      gradingApi.adviserOverrideGrade(entryId, score),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advisoryGrades', sectionId] });
      setEditingEntryId(null);
      setEditValue('');
      setOverriddenEntries((prev) => new Set(prev).add(variables.entryId));
    },
    onError: (err: Error) => {
      alert(`Failed to override grade: ${err.message}`);
    },
  });

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load advisory grades" onRetry={() => refetch()} />;

  const students = data?.students || [];
  const periods = data?.periods || [];
  const submissionStatuses = data?.submission_status || [];
  const reportCardStatuses = data?.report_card_status || [];
  const subjects = students[0]?.subjects || [];

  const submissionMap = new Map<string, AdvisorySubmissionStatus>();
  submissionStatuses.forEach((s) => submissionMap.set(s.course_section_id, s));

  const reportCardMap = new Map<string, AdvisoryReportCardStatus>();
  reportCardStatuses.forEach((r) => reportCardMap.set(r.grading_period_id, r));

  const isPeriodPublished = (periodId: string): boolean =>
    reportCardMap.get(periodId)?.is_published ?? false;

  const getSubmittedCount = (periodId: string): number =>
    submissionStatuses.filter((subject) => {
      const ps = subject.periods.find((p) => p.grading_period_id === periodId);
      return ps && ps.status !== 'draft';
    }).length;

  const getSubmissionStatus = (
    subjectId: string,
    periodId: string,
  ): 'draft' | 'submitted' | 'published' => {
    const subjectStatus = submissionMap.get(subjectId);
    if (!subjectStatus) return 'draft';
    const ps = subjectStatus.periods.find((p) => p.grading_period_id === periodId);
    return ps?.status ?? 'draft';
  };

  const handleStartEdit = (entryId: string, currentScore: number | null) => {
    setEditingEntryId(entryId);
    setEditValue(currentScore !== null ? String(currentScore) : '');
  };

  const handleSaveEdit = (entryId: string) => {
    if (editValue === '') {
      overrideMutation.mutate({ entryId, score: null });
      return;
    }
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0 || value > 100) return;
    overrideMutation.mutate({ entryId, score: value });
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditValue('');
  };

  const isAnyMutationPending =
    publishMutation.isPending || unpublishMutation.isPending || overrideMutation.isPending;

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No grading periods configured.</p>
        <p className="text-sm text-gray-400 mt-2">Contact your administrator to set up grading periods.</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No students in this advisory section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section info */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex items-center gap-4">
          <Users className="w-6 h-6 text-navy-600" />
          <div>
            <h3 className="font-semibold text-navy-800">{data?.section_name}</h3>
            <p className="text-sm text-gray-500">
              {data?.grade_level} &mdash; {data?.strand} | {data?.school_year}
            </p>
          </div>
        </div>
      </div>

      {/* Publish Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {periods.map((period) => {
          const published = isPeriodPublished(period.id);
          const submittedCount = getSubmittedCount(period.id);
          const totalSubjects = submissionStatuses.length;
          const allSubmitted = submittedCount === totalSubjects;
          const missingCount = totalSubjects - submittedCount;

          return (
            <div key={period.id} className="bg-white rounded-xl shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                {published ? (
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
                <h4 className="font-semibold text-navy-800">{period.label} Report Card</h4>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {submittedCount}/{totalSubjects} subjects submitted
              </p>

              {published ? (
                <button
                  onClick={() => setConfirmAction({ type: 'unpublish', periodId: period.id, periodLabel: period.label })}
                  disabled={unpublishMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Unpublish {period.label}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction({ type: 'publish', periodId: period.id, periodLabel: period.label })}
                  disabled={!allSubmitted || publishMutation.isPending}
                  title={!allSubmitted ? `Waiting for ${missingCount} subject(s) to be submitted` : `Publish ${period.label} report card`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  Publish {period.label} Report Card
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Advisory Grade Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead className="bg-gray-50">
              {/* Row 1: Subject headers */}
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 bg-gray-50 z-20 text-left px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[180px] border-b border-r border-gray-200"
                >
                  Student Name
                </th>
                {subjects.map((subject) => (
                  <th
                    key={subject.subject_id}
                    colSpan={periods.length + 1}
                    className="text-center px-2 py-3 text-sm font-semibold text-gray-700 border-b border-r border-gray-200"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{subject.subject_code}</span>
                      <span className="text-xs text-gray-400 font-normal">{subject.teacher_name}</span>
                    </div>
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="text-center px-4 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wider min-w-[80px] border-b border-gray-200"
                >
                  Average
                </th>
              </tr>

              {/* Row 2: Period labels with submission indicators */}
              <tr>
                {subjects.map((subject) => (
                  <Fragment key={`ph-${subject.subject_id}`}>
                    {periods.map((period) => {
                      const status = getSubmissionStatus(subject.subject_id, period.id);
                      const isReady = status === 'submitted' || status === 'published';
                      return (
                        <th
                          key={`p-${subject.subject_id}-${period.id}`}
                          className="text-center px-2 py-2 text-xs font-medium text-gray-500 border-b border-r border-gray-200 min-w-[64px]"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{period.label}</span>
                            {isReady ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th
                      key={`pf-${subject.subject_id}`}
                      className="text-center px-2 py-2 text-xs font-medium text-gray-500 border-b border-r border-gray-200 min-w-[72px]"
                    >
                      Final
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.student_id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-navy-800 border-r border-gray-200">
                    {student.student_name}
                  </td>

                  {student.subjects.map((subject) => (
                    <Fragment key={`s-${subject.subject_id}`}>
                      {subject.periods.map((periodGrade) => {
                        const published = isPeriodPublished(periodGrade.grading_period_id);
                        const entryId = periodGrade.grade_entry_id ?? null;
                        const isEditing = entryId !== null && editingEntryId === entryId;
                        const isOverridden = entryId !== null && overriddenEntries.has(entryId);
                        const atRisk = isAtRisk([periodGrade.score]);
                        const canEdit = !published && entryId !== null && !isAnyMutationPending;

                        return (
                          <td
                            key={`c-${subject.subject_id}-${periodGrade.grading_period_id}`}
                            className={cn(
                              'text-center px-2 py-2 border-r border-gray-100',
                              atRisk && 'bg-red-50',
                              !atRisk && published && 'bg-gray-50',
                              isOverridden && !published && 'border border-amber-400',
                            )}
                          >
                            {isEditing && canEdit ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(entryId!);
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  className="w-16 px-2 py-1 text-center text-sm border rounded focus:outline-none focus:ring-2 focus:ring-navy-500 text-slate-900"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(entryId!)}
                                  disabled={overrideMutation.isPending}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Save override"
                                >
                                  {overrideMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  'flex items-center justify-center gap-1 min-h-[28px]',
                                  canEdit && 'cursor-pointer hover:ring-2 hover:ring-navy-300 rounded',
                                )}
                                onClick={() => {
                                  if (canEdit && entryId) handleStartEdit(entryId, periodGrade.score);
                                }}
                                title={
                                  published
                                    ? 'Report card published - grades are locked'
                                    : canEdit
                                      ? 'Click to override grade'
                                      : 'No grade entry'
                                }
                              >
                                <span
                                  className={cn(
                                    'font-semibold text-sm',
                                    atRisk ? 'text-red-700' : getGradeColorClass(periodGrade.score),
                                  )}
                                >
                                  {formatGrade(periodGrade.score)}
                                </span>
                                {atRisk && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                                {isOverridden && !published && <Flag className="w-3 h-3 text-amber-500 shrink-0" />}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Final grade for this subject */}
                      <td
                        key={`f-${subject.subject_id}`}
                        className={cn(
                          'text-center px-2 py-2 font-semibold text-sm border-r border-gray-100',
                          getGradeBgClass(subject.final_grade),
                        )}
                      >
                        <div className="flex flex-col items-center">
                          <span className={getGradeColorClass(subject.final_grade)}>
                            {formatGrade(subject.final_grade)}
                          </span>
                          {subject.final_grade_letter && (
                            <span className="text-[10px] text-gray-400">{subject.final_grade_letter}</span>
                          )}
                        </div>
                      </td>
                    </Fragment>
                  ))}

                  {/* Overall average */}
                  <td className={cn('text-center px-4 py-3', getGradeColorClasses(student.final_average).bg)}>
                    <span className={cn('font-bold text-lg', getGradeColorClasses(student.final_average).text)}>
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

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              {confirmAction.type === 'publish' ? (
                <Send className="w-6 h-6 text-navy-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              )}
              <h3 className="text-lg font-semibold text-navy-800">
                {confirmAction.type === 'publish' ? 'Publish Report Card' : 'Unpublish Report Card'}
              </h3>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              {confirmAction.type === 'publish'
                ? `Publish ${confirmAction.periodLabel} report card? Students will be able to see their ${confirmAction.periodLabel} grades immediately.`
                : `Unpublish ${confirmAction.periodLabel} report card? Students will no longer see their ${confirmAction.periodLabel} grades.`}
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
                  if (confirmAction.type === 'publish') {
                    publishMutation.mutate({ periodId: confirmAction.periodId });
                  } else {
                    unpublishMutation.mutate({ periodId: confirmAction.periodId });
                  }
                }}
                disabled={isAnyMutationPending}
                className={cn(
                  'px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                  confirmAction.type === 'unpublish'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-navy-600 hover:bg-navy-700',
                )}
              >
                {isAnyMutationPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : confirmAction.type === 'publish' ? (
                  'Publish'
                ) : (
                  'Unpublish'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvisoryGradebookView;