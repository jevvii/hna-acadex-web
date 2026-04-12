'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Award,
  Clock,
  FileText,
  Flag,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGradeColorClass, formatGrade, isAtRisk } from '@/lib/gradeUtils';
import type { AdvisoryStudentGrade } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StudentGradeCardProps {
  student: AdvisoryStudentGrade;
  periods: { id: string; label: string }[];
  isPeriodPublished: (periodId: string) => boolean;
  onOverrideGrade?: (entryId: string, score: number | null) => void;
  isAnyMutationPending?: boolean;
}

interface StudentGradeDetailModalProps {
  student: AdvisoryStudentGrade | null;
  isOpen: boolean;
  onClose: () => void;
  periods: { id: string; label: string }[];
  isPeriodPublished: (periodId: string) => boolean;
  onOverrideGrade?: (entryId: string, score: number | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStudentStatus(student: AdvisoryStudentGrade): {
  label: string;
  variant: 'at-risk' | 'on-track' | 'honors' | 'pending';
  icon: React.ReactNode;
} {
  const hasGrades = student.subjects.some((s) =>
    s.periods.some((p) => p.score !== null)
  );

  if (!hasGrades) {
    return {
      label: 'Pending',
      variant: 'pending',
      icon: <Clock className="w-3 h-3" />,
    };
  }

  const allSubjectsAtRisk = student.subjects.some((subject) =>
    isAtRisk([subject.final_grade])
  );

  if (allSubjectsAtRisk) {
    return {
      label: 'At Risk',
      variant: 'at-risk',
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  }

  if (student.final_average && student.final_average >= 90) {
    return {
      label: 'Honors',
      variant: 'honors',
      icon: <Award className="w-3 h-3" />,
    };
  }

  return {
    label: 'On Track',
    variant: 'on-track',
    icon: <TrendingUp className="w-3 h-3" />,
  };
}

function getStatusColors(variant: string) {
  switch (variant) {
    case 'at-risk':
      return {
        border: 'border-red-400',
        bg: 'bg-red-50',
        badge: 'bg-red-100 text-red-700',
        text: 'text-red-600',
        avgBg: 'bg-red-50',
      };
    case 'on-track':
      return {
        border: 'border-emerald-400',
        bg: 'bg-emerald-50',
        badge: 'bg-emerald-100 text-emerald-700',
        text: 'text-emerald-600',
        avgBg: 'bg-emerald-50',
      };
    case 'honors':
      return {
        border: 'border-navy-400',
        bg: 'bg-navy-50',
        badge: 'bg-navy-100 text-navy-700',
        text: 'text-navy-600',
        avgBg: 'bg-navy-50',
      };
    default:
      return {
        border: 'border-amber-400',
        bg: 'bg-amber-50',
        badge: 'bg-amber-100 text-amber-700',
        text: 'text-amber-600',
        avgBg: 'bg-slate-100',
      };
  }
}

// ---------------------------------------------------------------------------
// Student Grade Detail Modal
// ---------------------------------------------------------------------------

export function StudentGradeDetailModal({
  student,
  isOpen,
  onClose,
  periods,
  isPeriodPublished,
  onOverrideGrade,
}: StudentGradeDetailModalProps) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!student) return null;

  const status = getStudentStatus(student);
  const colors = getStatusColors(status.variant);

  const handleStartEdit = (entryId: string, currentScore: number | null) => {
    setEditingEntryId(entryId);
    setEditValue(currentScore !== null ? String(currentScore) : '');
  };

  const handleSaveEdit = (entryId: string) => {
    if (editValue === '') {
      onOverrideGrade?.(entryId, null);
    } else {
      const value = parseFloat(editValue);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        onOverrideGrade?.(entryId, value);
      }
    }
    setEditingEntryId(null);
    setEditValue('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center',
                  colors.bg
                )}
              >
                <span className={cn('font-bold text-lg', colors.text)}>
                  {student.student_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-navy-900">
                    {student.student_name}
                  </h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1',
                      colors.badge
                    )}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  ID: {student.student_id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
            {/* Subject Grades */}
            <div className="space-y-4">
              {student.subjects.map((subject, subjectIndex) => (
                <motion.div
                  key={subject.subject_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: subjectIndex * 0.05 }}
                  className="bg-slate-50 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
                        <FileText className="w-5 h-5 text-navy-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-navy-900">
                          {subject.subject_code}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {subject.teacher_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Final Grade</p>
                      <p
                        className={cn(
                          'font-bold text-lg',
                          getGradeColorClass(subject.final_grade)
                        )}
                      >
                        {formatGrade(subject.final_grade)}
                      </p>
                      {subject.final_grade_letter && (
                        <p className="text-[10px] text-slate-400">{subject.final_grade_letter}</p>
                      )}
                    </div>
                  </div>

                  {/* Period Grades Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {subject.periods.map((periodGrade) => {
                      const published = isPeriodPublished(
                        periodGrade.grading_period_id
                      );
                      const entryId = periodGrade.grade_entry_id ?? null;
                      const isEditing =
                        entryId !== null && editingEntryId === entryId;
                      const atRisk = isAtRisk([periodGrade.score]);

                      return (
                        <div
                          key={periodGrade.grading_period_id}
                          className={cn(
                            'bg-white rounded-lg p-3',
                            atRisk && 'bg-red-50/50',
                            published && 'bg-emerald-50/50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-500">
                              {periodGrade.period_label}
                            </span>
                            {published && (
                              <span className="text-xs text-green-600 font-medium">
                                Published
                              </span>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(entryId!);
                                  if (e.key === 'Escape') {
                                    setEditingEntryId(null);
                                    setEditValue('');
                                  }
                                }}
                                onBlur={() => handleSaveEdit(entryId!)}
                                className="w-full px-1 py-0.5 text-center text-sm border rounded focus:outline-none focus:ring-2 focus:ring-navy-500"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  'font-semibold',
                                  atRisk ? 'text-red-600' : 'text-navy-900'
                                )}
                              >
                                {formatGrade(periodGrade.score)}
                              </span>
                              {!published && entryId && (
                                <button
                                  onClick={() =>
                                    handleStartEdit(entryId, periodGrade.score)
                                  }
                                  className="text-xs text-navy-600 hover:underline"
                                >
                                  Override
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Student Grade Card
// ---------------------------------------------------------------------------

export function StudentGradeCard({
  student,
  periods,
  isPeriodPublished,
  onOverrideGrade,
  isAnyMutationPending,
}: StudentGradeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const status = getStudentStatus(student);
  const colors = getStatusColors(status.variant);

  const handleStartEdit = (entryId: string, currentScore: number | null) => {
    setEditingEntryId(entryId);
    setEditValue(currentScore !== null ? String(currentScore) : '');
  };

  const handleSaveEdit = (entryId: string) => {
    if (editValue === '') {
      onOverrideGrade?.(entryId, null);
    } else {
      const value = parseFloat(editValue);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        onOverrideGrade?.(entryId, value);
      }
    }
    setEditingEntryId(null);
    setEditValue('');
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'bg-white rounded-xl shadow-card hover:shadow-card-hover overflow-hidden',
          'border-l-4 cursor-pointer transition-all duration-200',
          colors.border
        )}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Main Card Content */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            {/* Student Info */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  colors.bg
                )}
              >
                <span className={cn('font-bold text-sm', colors.text)}>
                  {student.student_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-navy-900">
                    {student.student_name}
                  </h4>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1',
                      colors.badge
                    )}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  ID: {student.student_id}
                </p>
              </div>
            </div>

            {/* Quick Grade Preview */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-sm">
                {student.subjects.slice(0, 4).map((subject) => (
                  <div key={subject.subject_id} className="text-center">
                    <p className="text-xs text-slate-400 mb-1">
                      {subject.subject_code}
                    </p>
                    <p
                      className={cn(
                        'font-semibold',
                        isAtRisk([subject.final_grade])
                          ? 'text-red-600'
                          : subject.final_grade
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                      )}
                    >
                      {formatGrade(subject.final_grade)}
                    </p>
                  </div>
                ))}
                <div className="h-10 w-px bg-slate-200" />
                <div className={cn('text-center px-3 py-2 rounded-lg', colors.avgBg)}>
                  <p className="text-xs text-slate-500 mb-1">Average</p>
                  <p className={cn('font-bold', colors.text)}>
                    {formatGrade(student.final_average)}
                  </p>
                </div>
              </div>

              {/* Expand Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-2 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="border-t border-slate-100 bg-slate-50/50"
            >
              <div className="p-5">
                {/* Subject Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.subjects.map((subject) => (
                    <div
                      key={subject.subject_id}
                      className="bg-white rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="font-semibold text-navy-900">
                            {subject.subject_code}
                          </h5>
                          <p className="text-xs text-slate-500">
                            {subject.teacher_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Final</p>
                          <p
                            className={cn(
                              'font-bold',
                              getGradeColorClass(subject.final_grade)
                            )}
                          >
                            {formatGrade(subject.final_grade)}
                          </p>
                        </div>
                      </div>

                      {/* Period Grades */}
                      <div className="grid grid-cols-3 gap-2">
                        {subject.periods.map((periodGrade) => {
                          const published = isPeriodPublished(
                            periodGrade.grading_period_id
                          );
                          const entryId = periodGrade.grade_entry_id ?? null;
                          const isEditing =
                            entryId !== null && editingEntryId === entryId;
                          const atRisk = isAtRisk([periodGrade.score]);

                          return (
                            <div
                              key={periodGrade.grading_period_id}
                              className={cn(
                                'bg-slate-50 rounded p-2 text-center',
                                atRisk && 'bg-red-50',
                                published && 'bg-emerald-50/50'
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-xs text-slate-400 mb-1">
                                {periodGrade.period_label}
                              </p>
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={editValue}
                                  onChange={(e) =>
                                    setEditValue(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                      handleSaveEdit(entryId!);
                                    if (e.key === 'Escape') {
                                      setEditingEntryId(null);
                                      setEditValue('');
                                    }
                                  }}
                                  onBlur={() => handleSaveEdit(entryId!)}
                                  className="w-full px-1 py-0.5 text-center text-sm border rounded focus:outline-none focus:ring-2 focus:ring-navy-500"
                                  autoFocus
                                />
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span
                                    className={cn(
                                      'font-semibold text-sm',
                                      atRisk
                                        ? 'text-red-600'
                                        : 'text-navy-900'
                                    )}
                                  >
                                    {formatGrade(periodGrade.score)}
                                  </span>
                                  {atRisk && (
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                  )}
                                  {!published && entryId && (
                                    <button
                                      onClick={() =>
                                        handleStartEdit(
                                          entryId,
                                          periodGrade.score
                                        )
                                      }
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Override grade"
                                    >
                                      <Flag className="w-3 h-3 text-amber-500" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    View Full Details
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Detail Modal */}
      <StudentGradeDetailModal
        student={student}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        periods={periods}
        isPeriodPublished={isPeriodPublished}
        onOverrideGrade={onOverrideGrade}
      />
    </>
  );
}

export default StudentGradeCard;
