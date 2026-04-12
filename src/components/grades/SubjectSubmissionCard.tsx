'use client';

import { motion } from 'framer-motion';
import {
  Mic,
  MessageCircle,
  Calculator,
  FlaskConical,
  BookOpen,
  Palette,
  Globe,
  Dumbbell,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdvisorySubmissionStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubjectSubmissionCardProps {
  subject: AdvisorySubmissionStatus;
  index: number;
  onViewGrades?: (subjectId: string) => void;
  onSendReminder?: (subjectId: string, teacherName: string) => void;
}

// ---------------------------------------------------------------------------
// Subject Icon Mapping
// ---------------------------------------------------------------------------

const subjectIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  OralCom: { icon: Mic, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  FIL01: { icon: MessageCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
  MATH01: { icon: Calculator, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  SCI01: { icon: FlaskConical, color: 'text-violet-600', bg: 'bg-violet-100' },
  ENG01: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
  ART01: { icon: Palette, color: 'text-pink-600', bg: 'bg-pink-100' },
  SS01: { icon: Globe, color: 'text-amber-600', bg: 'bg-amber-100' },
  PE01: { icon: Dumbbell, color: 'text-orange-600', bg: 'bg-orange-100' },
};

function getSubjectIcon(subjectCode: string) {
  const key = Object.keys(subjectIcons).find((k) =>
    subjectCode.toUpperCase().includes(k.toUpperCase())
  );
  return subjectIcons[key || ''] || { icon: BookOpen, color: 'text-slate-600', bg: 'bg-slate-100' };
}

// ---------------------------------------------------------------------------
// Status Helpers
// ---------------------------------------------------------------------------

function getSubmissionStatus(subject: AdvisorySubmissionStatus): {
  label: string;
  variant: 'ready' | 'pending' | 'draft';
  readyCount: number;
  totalCount: number;
} {
  const periods = subject.periods;
  const submittedPeriods = periods.filter(
    (p) => p.status === 'submitted' || p.status === 'published'
  );
  const readyCount = submittedPeriods.length;
  const totalCount = periods.length;

  if (readyCount === totalCount) {
    return { label: 'Ready', variant: 'ready', readyCount, totalCount };
  }
  if (readyCount > 0) {
    return { label: 'Pending', variant: 'pending', readyCount, totalCount };
  }
  return { label: 'Draft', variant: 'draft', readyCount, totalCount };
}

function getStatusColors(variant: string) {
  switch (variant) {
    case 'ready':
      return {
        badge: 'bg-green-100 text-green-700',
        button: 'bg-navy-50 text-navy-700 hover:bg-navy-100',
      };
    case 'pending':
      return {
        badge: 'bg-amber-100 text-amber-700',
        button: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-600',
        button: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubjectSubmissionCard({
  subject,
  index,
  onViewGrades,
  onSendReminder,
}: SubjectSubmissionCardProps) {
  const status = getSubmissionStatus(subject);
  const colors = getStatusColors(status.variant);
  const { icon: Icon, color: iconColor, bg: iconBg } = getSubjectIcon(subject.course_code);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'bg-white rounded-xl shadow-card p-5 cursor-pointer',
        'border border-transparent hover:border-navy-200',
        'transition-all duration-200'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          <div>
            <h4 className="font-semibold text-navy-900">{subject.course_code}</h4>
            <p className="text-xs text-slate-500">{subject.teacher_name}</p>
          </div>
        </div>
        <span className={cn('px-2 py-1 text-xs font-medium rounded-full', colors.badge)}>
          {status.label}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mb-4">
        {subject.periods.map((period) => {
          const isReady = period.status === 'submitted' || period.status === 'published';
          const isPending = period.status === 'draft';

          return (
            <div key={period.grading_period_id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 w-8">{period.period_label}</span>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isReady ? '100%' : isPending ? '60%' : '0%' }}
                    transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                    className={cn(
                      'h-full rounded-full',
                      isReady ? 'bg-green-500' : isPending ? 'bg-amber-400' : 'bg-slate-300'
                    )}
                  />
                </div>
                {isReady ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : isPending ? (
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="mb-4 text-xs text-slate-500">
        {status.readyCount}/{status.totalCount} periods submitted
      </div>

      {/* Action Button */}
      <button
        onClick={() => {
          if (status.variant === 'ready') {
            onViewGrades?.(subject.course_section_id);
          } else {
            onSendReminder?.(subject.course_section_id, subject.teacher_name);
          }
        }}
        className={cn(
          'w-full py-2 rounded-lg text-sm font-medium transition-colors',
          'flex items-center justify-center gap-1',
          colors.button
        )}
      >
        {status.variant === 'ready' ? (
          <>
            View Grades
            <ChevronRight className="w-4 h-4" />
          </>
        ) : (
          <>
            Send Reminder
            <Send className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.div>
  );
}

export default SubjectSubmissionCard;
