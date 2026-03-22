'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { format } from 'date-fns';
import { useIsStudent } from '@/store/auth';
import { cn } from '@/lib/utils';
import { activitiesApi, reminderApi, Reminder } from '@/lib/api';
import { Activity, SubmissionStatus } from '@/lib/types';
import { CircularScore } from '@/components/CircularScore';
import {
  ChevronLeft,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Bell,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Edit3,
} from 'lucide-react';

// Helper functions
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'No due date';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'h:mm a');
}

function isLate(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function getDaysRemaining(deadline?: string): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Loading state
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
    </div>
  );
}

// Error state
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
      <p className="mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-outline">
          Try Again
        </button>
      )}
    </div>
  );
}

// Status badge component
function StatusBadge({ status, submission }: { status: SubmissionStatus; submission?: Activity['my_submission'] }) {
  const configs = {
    not_submitted: {
      label: 'Not Submitted',
      className: 'badge badge-warning',
      icon: AlertCircle,
    },
    submitted: {
      label: 'Submitted',
      className: 'badge badge-info',
      icon: CheckCircle,
    },
    late: {
      label: 'Late',
      className: 'badge badge-error',
      icon: Clock,
    },
    graded: {
      label: submission?.score !== undefined ? `Graded: ${submission.score}` : 'Graded',
      className: 'badge badge-success',
      icon: CheckCircle,
    },
  };

  const config = configs[status] || configs.not_submitted;
  const Icon = config.icon;

  return (
    <span className={cn('flex items-center gap-1', config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// Reminder presets
const REMINDER_PRESETS = [
  { label: '5 minutes before', offsetMinutes: 5 },
  { label: '15 minutes before', offsetMinutes: 15 },
  { label: '30 minutes before', offsetMinutes: 30 },
  { label: '1 hour before', offsetMinutes: 60 },
  { label: '2 hours before', offsetMinutes: 120 },
  { label: '1 day before', offsetMinutes: 24 * 60 },
  { label: '1 week before', offsetMinutes: 7 * 24 * 60 },
];

// Reminder picker component
function ReminderPicker({
  deadline,
  onSelect,
  onClose,
}: {
  deadline?: string;
  onSelect: (reminderDate: Date, offsetMinutes: number) => void;
  onClose: () => void;
}) {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-72">
      <h4 className="font-display font-semibold text-navy-800 mb-3">Set Reminder</h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {REMINDER_PRESETS.map((preset) => {
          const reminderDate = new Date(deadlineDate.getTime() - preset.offsetMinutes * 60 * 1000);
          const isPast = reminderDate < new Date();

          return (
            <button
              key={preset.offsetMinutes}
              disabled={isPast}
              onClick={() => {
                onSelect(reminderDate, preset.offsetMinutes);
                onClose();
              }}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg transition-colors',
                isPast
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : 'hover:bg-navy-50'
              )}
            >
              <p className="font-medium text-navy-800">{preset.label}</p>
              <p className="text-sm text-gray-500">{format(reminderDate, 'MMM d, yyyy h:mm a')}</p>
            </button>
          );
        })}
      </div>
      <button onClick={onClose} className="btn btn-outline w-full mt-4">
        Cancel
      </button>
    </div>
  );
}

// Reminders section
function RemindersSection({
  activityId,
  deadline,
}: {
  activityId: string;
  deadline?: string;
}) {
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', 'activity', activityId],
    queryFn: () => reminderApi.getByActivity(activityId),
    enabled: !!activityId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { reminder_datetime: string; offset_minutes: number }) =>
      reminderApi.create({
        reminder_type: 'activity',
        activity_id: activityId,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', 'activity', activityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) => reminderApi.delete(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', 'activity', activityId] });
    },
  });

  const handleAddReminder = (reminderDate: Date, offsetMinutes: number) => {
    createMutation.mutate({
      reminder_datetime: reminderDate.toISOString(),
      offset_minutes: offsetMinutes,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-navy-600" />
          <h3 className="font-display font-semibold text-navy-800">Reminders</h3>
        </div>
        {deadline && (
          <Popover.Root open={isPickerOpen} onOpenChange={setIsPickerOpen}>
            <Popover.Trigger asChild>
              <button className="btn btn-outline text-sm py-2 px-3">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-50" side="bottom" align="end">
                <ReminderPicker
                  deadline={deadline}
                  onSelect={handleAddReminder}
                  onClose={() => setIsPickerOpen(false)}
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-gray-500">Loading reminders...</div>
      ) : reminders.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {deadline
            ? 'No reminders set. Add one to get notified before the deadline.'
            : 'No deadline set for this activity.'}
        </p>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-navy-700">
                  {format(new Date(reminder.reminder_datetime), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(reminder.id)}
                disabled={deleteMutation.isPending}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main page component
export default function ActivityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;
  const isStudent = useIsStudent();

  const {
    data: activity,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => activitiesApi.getActivity(activityId),
    enabled: !!activityId,
  });

  // Determine submission status
  const submission = activity?.my_submission;
  const submissionStatus: SubmissionStatus = submission?.status || 'not_submitted';
  const isGraded = submissionStatus === 'graded';
  const isSubmitted = submissionStatus === 'submitted' || submissionStatus === 'graded';

  // Get action button text and handler
  const getActionButton = () => {
    if (isGraded) {
      return {
        text: 'View Feedback',
        onClick: () => router.push(`/activities/${activityId}/submit`),
      };
    }
    if (isSubmitted) {
      return {
        text: 'View Submission',
        onClick: () => router.push(`/activities/${activityId}/submit`),
      };
    }
    return {
      text: 'Submit Assignment',
      onClick: () => router.push(`/activities/${activityId}/submit`),
      primary: true,
    };
  };

  const actionButton = getActionButton();
  const daysRemaining = getDaysRemaining(activity?.deadline);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <LoadingState />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen p-8">
        <ErrorState
          message="Failed to load activity details"
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-r from-navy-600 to-blue-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Course
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold">{activity.title}</h1>
                <p className="text-white/80 mt-2">
                  {activity.points} points
                </p>
              </div>
              <StatusBadge status={submissionStatus} submission={submission} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div
              className={cn(
                'rounded-xl shadow-card p-6',
                isGraded
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200'
                  : isSubmitted
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                  : daysRemaining !== null && daysRemaining < 0
                  ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
                  : daysRemaining !== null && daysRemaining <= 2
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200'
                  : 'bg-white'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center',
                      isGraded
                        ? 'bg-emerald-100'
                        : isSubmitted
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    )}
                  >
                    {isGraded ? (
                      <CheckCircle className="w-7 h-7 text-emerald-600" />
                    ) : isSubmitted ? (
                      <FileText className="w-7 h-7 text-blue-600" />
                    ) : (
                      <Clock className="w-7 h-7 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p
                      className={cn(
                        'font-semibold',
                        isGraded
                          ? 'text-emerald-700'
                          : isSubmitted
                          ? 'text-blue-700'
                          : 'text-gray-700'
                      )}
                    >
                      {isGraded
                        ? 'Graded'
                        : isSubmitted
                        ? 'Submitted'
                        : daysRemaining !== null && daysRemaining < 0
                        ? 'Late'
                        : 'Not Submitted'}
                    </p>
                  </div>
                </div>

                {isGraded && submission?.score !== undefined && (
                  <CircularScore score={submission.score} maxScore={activity.points} />
                )}
              </div>

              {!isSubmitted && activity.deadline && (
                <div className="mt-4 pt-4 border-t border-gray-200/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span
                      className={cn(
                        daysRemaining !== null && daysRemaining < 0
                          ? 'text-red-600'
                          : daysRemaining !== null && daysRemaining <= 2
                          ? 'text-amber-600'
                          : 'text-gray-600'
                      )}
                    >
                      {daysRemaining !== null && daysRemaining < 0
                        ? `Due ${Math.abs(daysRemaining)} days ago`
                        : daysRemaining !== null && daysRemaining === 0
                        ? 'Due today'
                        : daysRemaining !== null && daysRemaining === 1
                        ? 'Due tomorrow'
                        : `Due in ${daysRemaining} days`}
                    </span>
                    <span className="text-gray-400">• {formatDate(activity.deadline)} at {formatTime(activity.deadline)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {activity.description && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4">Description</h2>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {activity.description}
                </div>
              </div>
            )}

            {/* Instructions */}
            {activity.instructions && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4">Instructions</h2>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {activity.instructions}
                </div>
              </div>
            )}

            {/* Feedback section (when graded) */}
            {isGraded && submission?.feedback && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4">Feedback</h2>
                <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-400">
                  <div className="flex items-start gap-3">
                    <Edit3 className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <p className="text-gray-700">{submission.feedback}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Support file */}
            {activity.support_file_url && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4">Support File</h2>
                <a
                  href={activity.support_file_url}
                  download
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-navy-800">Support Document</p>
                    <p className="text-sm text-gray-500">Click to download</p>
                  </div>
                  <Download className="w-5 h-5 text-gray-400" />
                </a>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="bg-white rounded-xl shadow-card p-6">
              <button
                onClick={actionButton.onClick}
                className={cn(
                  'w-full btn',
                  actionButton.primary ? 'btn-primary' : 'btn-outline'
                )}
              >
                {actionButton.text}
              </button>

              {isStudent && !isSubmitted && activity.deadline && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  {activity.attempt_limit && activity.attempt_limit > 1
                    ? `${activity.attempt_limit} attempts allowed`
                    : 'Single attempt only'}
                </p>
              )}
            </div>

            {/* Reminders */}
            <RemindersSection activityId={activityId} deadline={activity.deadline} />

            {/* Submission Details (when submitted) */}
            {isSubmitted && submission?.submitted_at && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h3 className="font-display font-semibold text-navy-800 mb-4">Submission Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">
                      Submitted {formatDate(submission.submitted_at)} at {formatTime(submission.submitted_at)}
                    </span>
                  </div>
                  {submission.attempt_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        Attempt {submission.attempt_number}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allowed File Types */}
            {activity.allowed_file_types && activity.allowed_file_types.length > 0 && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h3 className="font-display font-semibold text-navy-800 mb-4">Allowed File Types</h3>
                <div className="flex flex-wrap gap-2">
                  {activity.allowed_file_types.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600"
                    >
                      {type.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
