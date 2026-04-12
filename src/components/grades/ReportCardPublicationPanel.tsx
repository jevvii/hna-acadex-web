'use client';

import { motion } from 'framer-motion';
import {
  Check,
  Clock,
  Lock,
  Send,
  RotateCcw,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdvisoryReportCardStatus, AdvisorySubmissionStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportCardPublicationCardProps {
  period: AdvisoryReportCardStatus;
  submissionStatuses: AdvisorySubmissionStatus[];
  index: number;
  onPublish?: (periodId: string) => void;
  onUnpublish?: (periodId: string) => void;
  isPublishPending?: boolean;
  isUnpublishPending?: boolean;
}

// ---------------------------------------------------------------------------
// Status Helpers
// ---------------------------------------------------------------------------

interface ReportCardStatus {
  submittedCount: number;
  totalSubjects: number;
  allSubmitted: boolean;
  missingSubjects: string[];
  progress: number;
}

function getReportCardStatus(
  period: AdvisoryReportCardStatus,
  submissionStatuses: AdvisorySubmissionStatus[]
): ReportCardStatus {
  const totalSubjects = submissionStatuses.length;
  const submittedCount = submissionStatuses.filter((subject) => {
    const ps = subject.periods.find(
      (p) => p.grading_period_id === period.grading_period_id
    );
    return ps && ps.status !== 'draft';
  }).length;

  const missingSubjects = submissionStatuses
    .filter((subject) => {
      const ps = subject.periods.find(
        (p) => p.grading_period_id === period.grading_period_id
      );
      return !ps || ps.status === 'draft';
    })
    .map((s) => s.course_code);

  return {
    submittedCount,
    totalSubjects,
    allSubmitted: submittedCount === totalSubjects,
    missingSubjects,
    progress: totalSubjects > 0 ? (submittedCount / totalSubjects) * 100 : 0,
  };
}

function getCardState(
  isPublished: boolean,
  allSubmitted: boolean,
  submittedCount: number
): {
  variant: 'published' | 'ready' | 'pending' | 'locked';
  borderColor: string;
  bgColor: string;
  iconColor: string;
  icon: React.ElementType;
  statusText: string;
} {
  if (isPublished) {
    return {
      variant: 'published',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50/50',
      iconColor: 'bg-green-500',
      icon: Check,
      statusText: 'Published',
    };
  }

  if (allSubmitted) {
    return {
      variant: 'ready',
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50/50',
      iconColor: 'bg-amber-500',
      icon: Clock,
      statusText: 'Ready to Publish',
    };
  }

  if (submittedCount > 0) {
    return {
      variant: 'pending',
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50/50',
      iconColor: 'bg-amber-500',
      icon: Clock,
      statusText: 'Waiting for submissions',
    };
  }

  return {
    variant: 'locked',
    borderColor: 'border-slate-200',
    bgColor: 'bg-slate-50/50',
    iconColor: 'bg-slate-400',
    icon: Lock,
    statusText: 'Not available yet',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportCardPublicationCard({
  period,
  submissionStatuses,
  index,
  onPublish,
  onUnpublish,
  isPublishPending,
  isUnpublishPending,
}: ReportCardPublicationCardProps) {
  const status = getReportCardStatus(period, submissionStatuses);
  const state = getCardState(period.is_published, status.allSubmitted, status.submittedCount);
  const Icon = state.icon;
  const missingCount = status.totalSubjects - status.submittedCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'p-5 rounded-xl border-2',
        state.borderColor,
        state.bgColor
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shadow-sm',
              state.iconColor
            )}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h4 className="font-semibold text-navy-900">
              {period.period_label} Report Card
            </h4>
            <p
              className={cn(
                'text-xs',
                period.is_published ? 'text-green-700' : 'text-slate-500'
              )}
            >
              {state.statusText}
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 + 0.3 }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
            period.is_published
              ? 'bg-green-100'
              : status.allSubmitted
                ? 'bg-amber-100'
                : 'bg-slate-200'
          )}
        >
          {period.is_published ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle
              className={cn(
                'w-4 h-4',
                status.allSubmitted ? 'text-amber-600' : 'text-slate-500'
              )}
            />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              period.is_published
                ? 'text-green-700'
                : status.allSubmitted
                  ? 'text-amber-700'
                  : 'text-slate-600'
            )}
          >
            {status.submittedCount}/{status.totalSubjects} Ready
          </span>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-600">
            {period.is_published
              ? 'All subjects submitted'
              : status.allSubmitted
                ? 'Ready to publish'
                : status.submittedCount === 0
                  ? 'Grading period not started'
                  : `Waiting: ${status.missingSubjects.join(', ')}`}
          </span>
          <span
            className={cn(
              'font-semibold',
              period.is_published
                ? 'text-green-600'
                : status.allSubmitted
                  ? 'text-amber-600'
                  : 'text-slate-400'
            )}
          >
            {Math.round(status.progress)}%
          </span>
        </div>
        <div
          className={cn(
            'w-full h-2 rounded-full overflow-hidden',
            period.is_published ? 'bg-green-200' : 'bg-slate-200'
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${status.progress}%` }}
            transition={{ duration: 0.8, delay: index * 0.1 + 0.4 }}
            className={cn(
              'h-full rounded-full',
              period.is_published
                ? 'bg-green-500'
                : status.allSubmitted
                  ? 'bg-amber-500'
                  : 'bg-slate-300'
            )}
          />
        </div>
      </div>

      {/* Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (period.is_published) {
            onUnpublish?.(period.grading_period_id);
          } else {
            onPublish?.(period.grading_period_id);
          }
        }}
        disabled={
          (!period.is_published && !status.allSubmitted) ||
          isPublishPending ||
          isUnpublishPending
        }
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-medium',
          'flex items-center justify-center gap-2',
          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          period.is_published
            ? 'border-2 border-red-300 text-red-600 hover:bg-red-50'
            : status.allSubmitted
              ? 'bg-navy-600 text-white hover:bg-navy-700'
              : 'bg-slate-300 text-white'
        )}
      >
        {isPublishPending || isUnpublishPending ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RotateCcw className="w-4 h-4" />
            </motion.div>
            Processing...
          </>
        ) : period.is_published ? (
          <>
            <RotateCcw className="w-4 h-4" />
            Unpublish {period.period_label} Report Card
          </>
        ) : status.allSubmitted ? (
          <>
            <Send className="w-4 h-4" />
            Publish {period.period_label} Report Card
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Publish {period.period_label} Report Card
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Report Card Publication Panel
// ---------------------------------------------------------------------------

interface ReportCardPublicationPanelProps {
  periods: AdvisoryReportCardStatus[];
  submissionStatuses: AdvisorySubmissionStatus[];
  onPublish?: (periodId: string) => void;
  onUnpublish?: (periodId: string) => void;
  isPublishPending?: boolean;
  isUnpublishPending?: boolean;
}

export function ReportCardPublicationPanel({
  periods,
  submissionStatuses,
  onPublish,
  onUnpublish,
  isPublishPending,
  isUnpublishPending,
}: ReportCardPublicationPanelProps) {
  return (
    <section className="mb-8">
      <h3 className="font-display text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-navy-600" />
        Report Card Publication
      </h3>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {periods.map((period, index) => (
            <ReportCardPublicationCard
              key={period.grading_period_id}
              period={period}
              submissionStatuses={submissionStatuses}
              index={index}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
              isPublishPending={isPublishPending}
              isUnpublishPending={isUnpublishPending}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReportCardPublicationPanel;
