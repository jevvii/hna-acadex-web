'use client';

import { motion } from 'framer-motion';
import {
  Mic,
  MessageCircle,
  Calculator,
  FlaskConical,
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Bell,
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
  onSendReminder?: (subjectId: string) => void;
}

// ---------------------------------------------------------------------------
// Subject Icons Map
// ---------------------------------------------------------------------------

const SUBJECT_ICONS: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  OralCom: {
    icon: Mic,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
  },
  FIL01: {
    icon: MessageCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-100',
  },
  MATH01: {
    icon: Calculator,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  SCI01: {
    icon: FlaskConical,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  default: {
    icon: BookOpen,
    color: 'text-navy-600',
    bg: 'bg-navy-100',
  },
};

// ---------------------------------------------------------------------------
// Status Helpers
// ---------------------------------------------------------------------------

function getSubjectStatus(
  periods: AdvisorySubmissionStatus['periods']
): {
  label: string;
  variant: 'ready' | 'pending' | 'draft';
  progress: number;
} {
  const total = periods.length;
  const submitted = periods.filter(
    (p) => p.status === 'submitted' || p.status === 'published'
  ).length;
  const progress = total > 0 ? (submitted / total) * 100 : 0;

  if (submitted === total) {
    return { label: 'Ready', variant: 'ready', progress };
  }
  if (submitted > 0) {
    return { label: 'Pending', variant: 'pending', progress };
  }
  return { label: 'Draft', variant: 'draft', progress };
}

function getStatusColors(variant: string) {
  switch (variant) {
    case 'ready':
      return {
        badge: 'bg-green-100 text-green-700',
        button: 'bg-navy-50 text-navy-700 hover:bg-navy-100',
        progress: 'bg-green-500',
      };
    case 'pending':
      return {
        badge: 'bg-amber-100 text-amber-700',
        button: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
        progress: 'bg-amber-400',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-600',
        button: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        progress: 'bg-slate-300',
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
  const status = getSubjectStatus(subject.periods);
  const colors = getStatusColors(status.variant);
  const iconConfig =
    SUBJECT_ICONS[subject.course_code] || SUBJECT_ICONS.default;
  const Icon = iconConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'bg-white rounded-xl shadow-card p-5 cursor-pointer',
        'border border-transparent hover:border-navy-200',
        'transition-all duration-200'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              iconConfig.bg
            )}
          >
            <Icon className={cn('w-5 h-5', iconConfig.color)} />
          </motion.div>
          <div>
            <h4 className="font-semibold text-navy-900">{subject.course_code}</h4>
            <p className="text-xs text-slate-500">{subject.teacher_name}</p>
          </div>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            colors.badge
          )}
        >
          {status.label}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mb-4">
        {subject.periods.map((period) => {
          const isReady =
            period.status === 'submitted' || period.status === 'published';
          return (
            <div
              key={period.grading_period_id}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-slate-500 w-8">{period.period_label}</span>
              <div className="flex items-center gap-1 flex-1">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isReady ? '100%' : '0%' }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                    className={cn(
                      'h-full rounded-full',
                      isReady ? colors.progress : 'bg-slate-300'
                    )}
                  />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.4 }}
                >
                  {isReady ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (status.variant === 'ready') {
            onViewGrades?.(subject.course_section_id);
          } else {
            onSendReminder?.(subject.course_section_id);
          }
        }}
        className={cn(
          'w-full py-2 rounded-lg text-sm font-medium',
          'flex items-center justify-center gap-1',
          'transition-colors',
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
            <Bell className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Subject Submission Panel
// ---------------------------------------------------------------------------

interface SubjectSubmissionPanelProps {
  subjects: AdvisorySubmissionStatus[];
  onViewGrades?: (subjectId: string) => void;
  onSendReminder?: (subjectId: string) => void;
  onSendReminderToAll?: () => void;
}

export function SubjectSubmissionPanel({
  subjects,
  onViewGrades,
  onSendReminder,
  onSendReminderToAll,
}: SubjectSubmissionPanelProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl font-bold text-navy-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-navy-600" />
          Subject Submission Status
        </h3>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSendReminderToAll}
          className="text-sm font-medium text-navy-600 hover:text-navy-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-navy-50 transition-colors"
        >
          Send Reminder to All
          <Bell className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {subjects.map((subject, index) => (
          <div key={subject.course_section_id}>
            <SubjectSubmissionCard
              subject={subject}
              index={index}
              onViewGrades={onViewGrades}
              onSendReminder={onSendReminder}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default SubjectSubmissionPanel;
