'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import { format, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { quizzesApi, reminderApi } from '@/lib/api';
import { Quiz } from '@/lib/types';
import { CircularScore } from '@/components/CircularScore';
import {
  ChevronLeft,
  Clock,
  HelpCircle,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  Bell,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Lock,
  Play,
} from 'lucide-react';

// Helper functions
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set';
  return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
}

function formatDuration(minutes?: number): string {
  if (!minutes) return 'No limit';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
function RemindersSection({ quizId, deadline }: { quizId: string; deadline?: string }) {
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', 'quiz', quizId],
    queryFn: () => reminderApi.getByQuiz(quizId),
    enabled: !!quizId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { reminder_datetime: string; offset_minutes: number }) =>
      reminderApi.create({
        reminder_type: 'quiz',
        quiz_id: quizId,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', 'quiz', quizId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) => reminderApi.delete(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', 'quiz', quizId] });
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
            ? 'No reminders set. Add one to get notified before the quiz closes.'
            : 'No deadline set for this quiz.'}
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

// Attempt history item
function AttemptHistoryItem({
  attempt,
  isBest,
}: {
  attempt: { attempt_number: number; score?: number; max_score?: number; submitted_at?: string };
  isBest?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg',
        isBest ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
            isBest ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
          )}
        >
          {attempt.attempt_number}
        </div>
        <div>
          <p className="font-medium text-navy-800">
            Attempt {attempt.attempt_number}
            {isBest && <span className="ml-2 text-xs text-emerald-600 font-semibold">BEST</span>}
          </p>
          {attempt.submitted_at && (
            <p className="text-sm text-gray-500">{formatDate(attempt.submitted_at)}</p>
          )}
        </div>
      </div>
      {attempt.score !== undefined ? (
        <div className="text-right">
          <p className={cn('font-bold text-lg', isBest ? 'text-emerald-600' : 'text-navy-800')}>
            {attempt.score}
          </p>
          <p className="text-sm text-gray-500">/ {attempt.max_score || '—'}</p>
        </div>
      ) : (
        <span className="badge badge-info">In Progress</span>
      )}
    </div>
  );
}

// Main page component
export default function QuizDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const queryClient = useQueryClient();

  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  const {
    data: quiz,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizzesApi.getQuiz(quizId),
    enabled: !!quizId,
  });

  const takeQuizMutation = useMutation({
    mutationFn: () => quizzesApi.takeQuiz(quizId),
    onSuccess: (data) => {
      router.push(`/quizzes/${quizId}/take?attempt=${data.attempt_id}`);
    },
  });

  // Determine quiz status
  const getQuizStatus = () => {
    if (!quiz) return 'loading';

    const now = new Date();
    const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
    const closeAt = quiz.close_at ? new Date(quiz.close_at) : null;

    if (closeAt && isAfter(now, closeAt)) return 'closed';
    if (openAt && isBefore(now, openAt)) return 'not-open';
    if (quiz.my_in_progress_attempt) return 'in-progress';
    if (quiz.my_attempt?.is_submitted) return 'completed';
    return 'available';
  };

  const quizStatus = getQuizStatus();

  // Get action button config
  const getActionConfig = () => {
    switch (quizStatus) {
      case 'in-progress':
        return {
          text: 'Resume Quiz',
          icon: Play,
          primary: true,
          gradient: 'from-navy-600 to-navy-800',
          onClick: () => {
            if (quiz?.my_in_progress_attempt) {
              router.push(`/quizzes/${quizId}/take?attempt=${quiz.my_in_progress_attempt.attempt_id}`);
            }
          },
        };
      case 'completed':
        const canRetry = (quiz?.my_attempt?.attempts_used || 0) < (quiz?.attempt_limit || 1);
        return {
          text: canRetry ? 'Try Again' : 'View Results',
          icon: canRetry ? RefreshCw : Eye,
          primary: canRetry,
          gradient: canRetry ? 'from-navy-600 to-navy-800' : 'from-slate-600 to-slate-800',
          onClick: () => {
            if (canRetry) {
              takeQuizMutation.mutate();
            } else {
              // TODO: Navigate to results page
              alert('View results feature coming soon');
            }
          },
        };
      case 'available':
        return {
          text: 'Start Quiz',
          icon: Play,
          primary: true,
          gradient: 'from-navy-600 to-navy-800',
          onClick: () => {
            takeQuizMutation.mutate();
          },
        };
      case 'closed':
        return {
          text: 'Quiz Closed',
          icon: Lock,
          primary: false,
          gradient: 'from-slate-500 to-slate-700',
          disabled: true,
          onClick: () => {},
        };
      case 'not-open':
        return {
          text: 'Not Open Yet',
          icon: Lock,
          primary: false,
          gradient: 'from-amber-500 to-amber-700',
          disabled: true,
          onClick: () => {},
        };
      default:
        return {
          text: 'Loading...',
          icon: Loader2,
          primary: false,
          gradient: 'from-gray-500 to-gray-700',
          disabled: true,
          onClick: () => {},
        };
    }
  };

  const actionConfig = getActionConfig();
  const ActionIcon = actionConfig.icon;

  // Mock attempt history (would come from API)
  const attemptHistory = quiz?.my_attempt
    ? [
        {
          attempt_number: quiz.my_attempt.attempt_number,
          score: quiz.my_attempt.score,
          max_score: quiz.my_attempt.max_score,
        },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <LoadingState />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen p-8">
        <ErrorState message="Failed to load quiz details" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div
        className={cn(
          'relative h-48 overflow-hidden',
          quizStatus === 'available'
            ? 'bg-gradient-to-r from-navy-600 to-navy-800'
            : quizStatus === 'in-progress'
            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
            : quizStatus === 'completed'
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-700'
            : 'bg-gradient-to-r from-slate-500 to-slate-700'
        )}
      >
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold">{quiz.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-white/80">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-4 h-4" />
                    {quiz.question_count || 0} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(quiz.time_limit_minutes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-4 h-4" />
                    {quiz.attempt_limit} attempt{quiz.attempt_limit !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <span
                className={cn(
                  'badge',
                  quizStatus === 'available'
                    ? 'badge-navy'
                    : quizStatus === 'in-progress'
                    ? 'badge-warning'
                    : quizStatus === 'completed'
                    ? 'badge-success'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {quizStatus === 'available'
                  ? 'Available'
                  : quizStatus === 'in-progress'
                  ? 'In Progress'
                  : quizStatus === 'completed'
                  ? 'Completed'
                  : quizStatus === 'closed'
                  ? 'Closed'
                  : 'Not Open'}
              </span>
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
            {/* Hero action card */}
            <div
              className={cn(
                'rounded-xl shadow-card p-8 text-center',
                quizStatus === 'completed' && quiz.my_attempt?.score !== undefined
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200'
                  : 'bg-white'
              )}
            >
              {quizStatus === 'completed' && quiz.my_attempt?.score !== undefined ? (
                <div className="flex flex-col items-center">
                  <p className="text-emerald-600 font-semibold mb-4">Your Score</p>
                  <CircularScore
                    score={quiz.my_attempt.score}
                    maxScore={quiz.my_attempt.max_score || quiz.points || 100}
                    size={150}
                  />
                  {quiz.my_attempt.attempts_used && quiz.attempt_limit > 1 && (
                    <p className="text-gray-500 mt-4">
                      Attempt {quiz.my_attempt.attempts_used} of {quiz.attempt_limit}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center mb-4',
                      quizStatus === 'available'
                        ? 'bg-navy-100'
                        : quizStatus === 'in-progress'
                        ? 'bg-amber-100'
                        : 'bg-gray-100'
                    )}
                  >
                    <ActionIcon
                      className={cn(
                        'w-10 h-10',
                        quizStatus === 'available'
                          ? 'text-navy-600'
                          : quizStatus === 'in-progress'
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      )}
                    />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-navy-800">
                    {quizStatus === 'available'
                      ? 'Ready to Start'
                      : quizStatus === 'in-progress'
                      ? 'Continue Your Attempt'
                      : quizStatus === 'completed'
                      ? 'Quiz Completed'
                      : quizStatus === 'closed'
                      ? 'Quiz Closed'
                      : 'Not Open Yet'}
                  </h3>
                  <p className="text-gray-500 mt-2">
                    {quizStatus === 'available'
                      ? 'Click the button below to begin the quiz'
                      : quizStatus === 'in-progress'
                      ? 'You have an attempt in progress'
                      : quizStatus === 'completed'
                      ? 'Great job! View your results below'
                      : quizStatus === 'closed'
                      ? 'This quiz is no longer available'
                      : `Opens ${formatDate(quiz.open_at)}`}
                  </p>
                  <button
                    onClick={actionConfig.onClick}
                    disabled={actionConfig.disabled || takeQuizMutation.isPending}
                    className={cn(
                      'btn mt-6',
                      actionConfig.primary ? 'btn-primary' : 'btn-outline'
                    )}
                  >
                    {takeQuizMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ActionIcon className="w-4 h-4 mr-2" />
                        {actionConfig.text}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Instructions */}
            {quiz.instructions && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4">Instructions</h2>
                <div className="prose prose-sm max-w-none text-gray-700">{quiz.instructions}</div>
              </div>
            )}

            {/* Attempt History */}
            {attemptHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4">Attempt History</h2>
                <div className="space-y-3">
                  {attemptHistory.map((attempt, index) => (
                    <AttemptHistoryItem
                      key={index}
                      attempt={attempt}
                      isBest={quiz.score_selection_policy === 'highest'}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quiz Details */}
            <div className="bg-white rounded-xl shadow-card p-6">
              <h3 className="font-display font-semibold text-navy-800 mb-4">Quiz Details</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Questions</span>
                  <span className="font-medium text-navy-800">{quiz.question_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Time Limit</span>
                  <span className="font-medium text-navy-800">{formatDuration(quiz.time_limit_minutes)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Attempts Allowed</span>
                  <span className="font-medium text-navy-800">{quiz.attempt_limit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Points</span>
                  <span className="font-medium text-navy-800">{quiz.points || '—'}</span>
                </div>
                {quiz.open_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Opens</span>
                    <span className="font-medium text-navy-800">{formatDate(quiz.open_at)}</span>
                  </div>
                )}
                {quiz.close_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Closes</span>
                    <span className="font-medium text-navy-800">{formatDate(quiz.close_at)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Score Policy</span>
                  <span className="font-medium text-navy-800 capitalize">
                    {quiz.score_selection_policy || 'Highest'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reminders */}
            <RemindersSection quizId={quizId} deadline={quiz.close_at} />

            {/* Stats (if available) */}
            {quiz.my_attempt?.attempts_used !== undefined && quiz.attempt_limit > 1 && (
              <div className="bg-white rounded-xl shadow-card p-6">
                <h3 className="font-display font-semibold text-navy-800 mb-4">Attempts</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy-600 rounded-full"
                      style={{
                        width: `${(quiz.my_attempt.attempts_used / quiz.attempt_limit) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {quiz.my_attempt.attempts_used} / {quiz.attempt_limit}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
