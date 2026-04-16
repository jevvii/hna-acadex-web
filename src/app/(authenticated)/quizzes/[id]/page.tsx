'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { format, isBefore, isAfter, differenceInMinutes } from 'date-fns';
import dayjs, { Dayjs } from 'dayjs';
import { cn } from '@/lib/utils';
import { quizzesApi, reminderApi } from '@/lib/api';
import { Quiz, SubmissionStatus } from '@/lib/types';
import { CircularScore } from '@/components/CircularScore';
import { DateTimePickerTrigger, DeadlinePicker } from '@/components/DeadlinePicker';
import { useIsTeacher } from '@/store/auth';
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
  TrendingUp,
  Users,
  Award,
  Edit3,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap,
  BarChart3,
  Timer,
  RotateCcw,
  Save,
  XCircle as XIcon,
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

// Calculate class statistics for quiz
interface QuizAttemptStats {
  score?: number | null;
  status?: string;
}

function calculateQuizStats(attempts: QuizAttemptStats[], studentCount?: number) {
  const scoredAttempts = attempts.filter(a => a.score !== null && a.score !== undefined);
  if (scoredAttempts.length === 0) {
    return { average: null, highest: null, lowest: null, studentCount: studentCount ?? 0 };
  }
  const scores = scoredAttempts.map(a => a.score as number);
  const total = scores.reduce((sum, score) => sum + score, 0);
  return {
    average: total / scores.length,
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    studentCount: studentCount ?? 0,
  };
}

// Loading state
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
    </div>
  );
}

// Error state
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-gray-500">
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
function ReminderPicker({ deadline, onSelect, onClose }: { deadline?: string; onSelect: (reminderDate: Date, offsetMinutes: number) => void; onClose: () => void }) {
  const deadlineDate = deadline ? new Date(deadline) : new Date();
  const now = new Date();
  const isReminderAvailable = deadlineDate.getTime() > now.getTime();
  const minReminderDate = dayjs(now);
  const maxReminderDate = dayjs(deadlineDate);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customReminderDate, setCustomReminderDate] = useState<Dayjs>(minReminderDate);
  const [customPickerNonce, setCustomPickerNonce] = useState(0);

  if (!deadline) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-72">
      <h4 className="font-bold text-navy-800 mb-3">Set Reminder</h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {REMINDER_PRESETS.map((preset) => {
          const reminderDate = new Date(deadlineDate.getTime() - preset.offsetMinutes * 60 * 1000);
          const isPast = reminderDate < new Date();
          return (
            <button
              key={preset.offsetMinutes}
              disabled={isPast}
              onClick={() => { onSelect(reminderDate, preset.offsetMinutes); onClose(); }}
              className={cn('w-full text-left px-4 py-3 rounded-lg transition-colors', isPast ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-navy-50')}
            >
              <p className="font-medium text-navy-800">{preset.label}</p>
              <p className="text-sm text-gray-500">{format(reminderDate, 'MMM d, yyyy h:mm a')}</p>
            </button>
          );
        })}
        <button
          type="button"
          disabled={!isReminderAvailable}
          onClick={() => {
            const nextCustomDate = dayjs().isAfter(maxReminderDate) ? maxReminderDate : dayjs();
            setCustomReminderDate(nextCustomDate);
            setShowCustomPicker(true);
            setCustomPickerNonce((prev) => prev + 1);
          }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg transition-colors border',
            isReminderAvailable
              ? 'hover:bg-navy-50 border-navy-200 text-navy-800'
              : 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500'
          )}
        >
          <p className="font-medium">Custom</p>
          <p className="text-sm text-gray-500">Choose your own reminder time</p>
        </button>
        {showCustomPicker && isReminderAvailable ? (
          <div className="pt-2">
            <DateTimePickerTrigger
              key={customPickerNonce}
              label="Custom reminder time"
              value={customReminderDate}
              minDate={minReminderDate}
              maxDate={maxReminderDate}
              autoOpen
              onChange={(selectedDate) => {
                const boundedDate = selectedDate.isAfter(maxReminderDate)
                  ? maxReminderDate
                  : selectedDate.isBefore(minReminderDate)
                    ? minReminderDate
                    : selectedDate;
                setCustomReminderDate(boundedDate);
                const reminderDate = boundedDate.toDate();
                const offsetMinutes = Math.max(0, Math.round((deadlineDate.getTime() - reminderDate.getTime()) / 60000));
                onSelect(reminderDate, offsetMinutes);
                setShowCustomPicker(false);
                onClose();
              }}
            />
          </div>
        ) : null}
      </div>
      <button onClick={onClose} className="btn btn-outline w-full mt-4">Cancel</button>
    </div>
  );
}

// Reminders section
function RemindersSection({ quizId, deadline }: { quizId: string; deadline?: string }) {
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const isReminderAvailable = Boolean(deadline && new Date(deadline).getTime() > Date.now());
  const { data: remindersData, isLoading } = useQuery({
    queryKey: ['reminders', 'quiz', quizId],
    queryFn: () => reminderApi.getByQuiz(quizId) as Promise<{ id: string; reminder_datetime: string }[] | { results: { id: string; reminder_datetime: string }[] }>,
    enabled: !!quizId,
    refetchInterval: 30000,
  });
  const reminders: { id: string; reminder_datetime: string }[] = Array.isArray(remindersData) ? remindersData : (remindersData?.results ?? []);
  const upcomingReminders = reminders.filter((reminder) => new Date(reminder.reminder_datetime).getTime() > Date.now());
  const createMutation = useMutation({
    mutationFn: (data: { reminder_datetime: string; offset_minutes: number }) => reminderApi.create({ reminder_type: 'quiz', quiz_id: quizId, ...data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', 'quiz', quizId] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) => reminderApi.delete(reminderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', 'quiz', quizId] }),
  });
  const handleAddReminder = (reminderDate: Date, offsetMinutes: number) => {
    createMutation.mutate({ reminder_datetime: reminderDate.toISOString(), offset_minutes: offsetMinutes });
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
              <button
                className="btn btn-outline text-sm py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isReminderAvailable}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-50" side="bottom" align="end">
                <ReminderPicker deadline={deadline} onSelect={handleAddReminder} onClose={() => setIsPickerOpen(false)} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>
      {isLoading ? (
        <div className="py-4 text-center text-gray-500">Loading reminders...</div>
      ) : upcomingReminders.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {deadline
            ? isReminderAvailable
              ? 'No reminders set. Add one to get notified before the quiz closes.'
              : 'Quiz deadline has passed. Reminders are no longer available.'
            : 'No deadline set for this quiz.'}
        </p>
      ) : (
        <div className="space-y-2">
          {upcomingReminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-navy-700">{format(new Date(reminder.reminder_datetime), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <button onClick={() => deleteMutation.mutate(reminder.id)} disabled={deleteMutation.isPending} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stats Card Component
function StatsCard({ label, value, colorClass, icon: Icon }: { label: string; value: string | number; colorClass?: string; icon?: React.ElementType }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center">
      {Icon && <Icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />}
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', colorClass || 'text-navy-700')}>{value}</p>
    </div>
  );
}

// Student status badge for quiz
function QuizStudentStatusBadge({ status, score, maxScore }: { status: SubmissionStatus; score?: number; maxScore?: number }) {
  const configs = {
    not_submitted: { label: 'Not Started', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
    submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-600 border border-blue-200' },
    late: { label: 'Late', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
    graded: { label: score !== undefined && maxScore ? `${score}/${maxScore}` : 'Graded', className: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  };
  const config = configs[status] || configs.not_submitted;
  return <span className={cn('px-3 py-1 rounded-full text-xs font-medium', config.className)}>{config.label}</span>;
}

// Quiz Attempt history item
function AttemptHistoryItem({
  attempt,
  isBest,
  maxPoints,
}: {
  attempt: {
    id: string;
    attempt_number: number;
    score?: number;
    max_score?: number;
    pending_manual_grading: boolean;
    is_submitted: boolean;
    submitted_at?: string;
  };
  isBest?: boolean;
  maxPoints?: number;
}) {
  // Determine status
  let status: 'graded' | 'pending' | 'in_progress' | null = 'in_progress';
  if (attempt.is_submitted) {
    status = attempt.pending_manual_grading ? 'pending' : 'graded';
  }

  // Only show "Graded" badge on the best attempt
  // Other graded attempts don't show a status badge
  // "Pending Review" and "In Progress" badges show for all attempts
  const showStatusBadge = status === 'pending' || status === 'in_progress' || (status === 'graded' && isBest);

  const statusConfig = {
    graded: { label: 'Graded', className: 'bg-blue-100 text-blue-700' },
    pending: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700' },
    in_progress: { label: 'In Progress', className: 'bg-slate-100 text-slate-600' },
  };

  return (
    <div className={cn('flex items-center justify-between p-4 rounded-lg gap-4', isBest ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50')}>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold', isBest ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600')}>
          {attempt.attempt_number}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-navy-800">
              Attempt {attempt.attempt_number}
            </p>
            {isBest && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                BEST
              </span>
            )}
          </div>
          {attempt.submitted_at && (
            <p className="text-xs text-slate-400">{formatDate(attempt.submitted_at)}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        {showStatusBadge && status && (
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusConfig[status].className)}>
            {statusConfig[status].label}
          </span>
        )}

        <div className="text-right min-w-[60px]">
          {attempt.score !== undefined && attempt.score !== null ? (
            <>
              <p className={cn('font-bold text-lg', isBest ? 'text-emerald-600' : 'text-navy-800')}>
                {attempt.score}
              </p>
              <p className="text-xs text-slate-400">/ {attempt.max_score || maxPoints || '—'}</p>
            </>
          ) : (
            <p className="text-slate-400 font-medium">— / {attempt.max_score || maxPoints || '—'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function QuizDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const queryClient = useQueryClient();
  const isTeacher = useIsTeacher();

  const [isStartingQuiz, setIsStartingQuiz] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    instructions: string;
    time_limit_minutes: number | null;
    attempt_limit: number;
    score_selection_policy: 'highest' | 'latest';
    open_date: Dayjs | null;
    close_date: Dayjs | null;
  }>({
    title: '',
    instructions: '',
    time_limit_minutes: null,
    attempt_limit: 1,
    score_selection_policy: 'highest',
    open_date: null,
    close_date: null,
  });
  const [editError, setEditError] = useState('');

  // Tiptap editor for instructions
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      Placeholder.configure({
        placeholder: 'Enter quiz instructions...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-slate-900',
      },
    },
  });

  const { data: quiz, isLoading, error, refetch } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizzesApi.getQuiz(quizId),
    enabled: !!quizId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: gradingData } = useQuery({
    queryKey: ['quiz-grading', quizId],
    queryFn: () => quizzesApi.getGradingList(quizId),
    enabled: !!quizId && isTeacher,
  });

  // Normalize gradingData to array (handle paginated response { results: [...] })
  const gradingList = Array.isArray(gradingData)
    ? gradingData
    : (gradingData as unknown as { results?: unknown[] })?.results ?? [];

  const groupedGradingList = useMemo(() => {
    const grouped = new Map<
      string,
      {
        student_id: string;
        student_name?: string;
        student_email?: string;
        attempts: Array<{
          attempt_id: string;
          student_id: string;
          student_name?: string;
          student_email?: string;
          score?: number;
          max_score?: number;
          submitted_at?: string;
          time_taken_seconds?: number;
          pending_manual_grading?: boolean;
        }>;
      }
    >();

    (gradingList as Array<{
      attempt_id: string;
      student_id: string;
      student_name?: string;
      student_email?: string;
      score?: number;
      max_score?: number;
      submitted_at?: string;
      time_taken_seconds?: number;
      pending_manual_grading?: boolean;
    }>).forEach((attempt) => {
      const existing = grouped.get(attempt.student_id);
      if (existing) {
        existing.attempts.push(attempt);
        return;
      }
      grouped.set(attempt.student_id, {
        student_id: attempt.student_id,
        student_name: attempt.student_name,
        student_email: attempt.student_email,
        attempts: [attempt],
      });
    });

    return Array.from(grouped.values()).map((student) => ({
      ...student,
      attempts: [...student.attempts].sort((a, b) => {
        const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return bTime - aTime;
      }),
    }));
  }, [gradingList]);

  const takeQuizMutation = useMutation({
    mutationFn: () => quizzesApi.takeQuiz(quizId),
    onSuccess: (data) => { router.push(`/quizzes/${quizId}/take?attempt=${data.attempt_id}`); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => quizzesApi.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      router.push('/courses');
    },
  });

  // Initialize edit form when entering edit mode
  const enterEditMode = useCallback(() => {
    if (!quiz) return;

    setEditForm({
      title: quiz.title || '',
      instructions: quiz.instructions || '',
      time_limit_minutes: quiz.time_limit_minutes ?? null,
      attempt_limit: quiz.attempt_limit ?? 1,
      score_selection_policy: (quiz.score_selection_policy as 'highest' | 'latest') || 'highest',
      open_date: quiz.open_at ? dayjs(quiz.open_at) : null,
      close_date: quiz.close_at ? dayjs(quiz.close_at) : null,
    });

    // Initialize Tiptap editor content
    if (editor) {
      editor.commands.setContent(quiz.instructions || '');
    }

    setEditError('');
    setIsEditing(true);
  }, [quiz, editor]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditError('');
    editor?.commands.clearContent();
  }, [editor]);

  const getEditorHtml = useCallback(() => {
    if (!editor) return '';
    const html = editor.getHTML();
    if (html === '<p></p>' || html === '' || editor.isEmpty) return '';
    return html;
  }, [editor]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return quizzesApi.updateQuiz(quizId, {
        title: editForm.title,
        instructions: getEditorHtml() || undefined,
        time_limit_minutes: editForm.time_limit_minutes || undefined,
        attempt_limit: editForm.attempt_limit,
        score_selection_policy: editForm.score_selection_policy,
        open_at: editForm.open_date?.toISOString() || undefined,
        close_at: editForm.close_date?.toISOString() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      setIsEditing(false);
      setEditError('');
    },
    onError: (err: Error | { message?: string }) => {
      const errorMessage = err instanceof Error ? err.message : (err as { message?: string }).message;
      setEditError(errorMessage || 'Failed to update quiz');
    },
  });

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) {
      setEditError('Title is required');
      return;
    }
    if (!editForm.attempt_limit || editForm.attempt_limit < 1) {
      setEditError('Attempt limit must be at least 1');
      return;
    }
    updateMutation.mutate();
  };

  // Sync editor content when entering edit mode
  useEffect(() => {
    if (isEditing && quiz && editor) {
      editor.commands.setContent(quiz.instructions || '');
    }
  }, [isEditing, quiz, editor]);

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

  const getActionConfig = () => {
    switch (quizStatus) {
      case 'in-progress':
        return {
          text: 'Resume Quiz',
          icon: Play,
          primary: true,
          color: 'bg-amber-600 hover:bg-amber-700',
          onClick: () => { if (quiz?.my_in_progress_attempt) router.push(`/quizzes/${quizId}/take?attempt=${quiz.my_in_progress_attempt.attempt_id}`); },
        };
      case 'completed':
        const canRetry = (quiz?.my_attempt?.attempts_used || 0) < (quiz?.attempt_limit || 1);
        return {
          text: canRetry ? 'Try Again' : 'View Results',
          icon: canRetry ? RotateCcw : Eye,
          primary: canRetry,
          color: canRetry ? 'bg-navy-600 hover:bg-navy-700' : 'bg-slate-600 hover:bg-slate-700',
          onClick: () => { if (canRetry) takeQuizMutation.mutate(); else alert('View results feature coming soon'); },
        };
      case 'available':
        return {
          text: 'Start Quiz',
          icon: Play,
          primary: true,
          color: 'bg-navy-600 hover:bg-navy-700',
          onClick: () => takeQuizMutation.mutate(),
        };
      case 'closed':
        return { text: 'Quiz Closed', icon: Lock, primary: false, color: 'bg-slate-500 cursor-not-allowed', disabled: true, onClick: () => {} };
      case 'not-open':
        return { text: 'Not Open Yet', icon: Lock, primary: false, color: 'bg-amber-500 cursor-not-allowed', disabled: true, onClick: () => {} };
      default:
        return { text: 'Loading...', icon: Loader2, primary: false, color: 'bg-gray-500 cursor-not-allowed', disabled: true, onClick: () => {} };
    }
  };

  const actionConfig = getActionConfig();
  const ActionIcon = actionConfig.icon;

  // All attempts for history display (sorted by attempt number ascending)
  const attemptHistory = quiz?.attempts
    ? [...quiz.attempts].sort((a, b) => a.attempt_number - b.attempt_number)
    : [];

  // Find the best attempt (highest score among graded attempts)
  const bestAttemptId = attemptHistory
    .filter(a => a.is_submitted && !a.pending_manual_grading && a.score !== undefined && a.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]?.id;

  // Calculate max points for display
  const maxPoints = quiz?.points ?? quiz?.my_attempt?.max_score;

  const stats = gradingList.length > 0 ? calculateQuizStats(gradingList as QuizAttemptStats[], quiz?.student_count) : null;
  const quizTabPath = quiz?.course_section_id ? `/courses/${quiz.course_section_id}?tab=quizzes` : '/courses';

  if (isLoading) return <LoadingState />;
  if (error || !quiz) return <ErrorState message="Failed to load quiz details" onRetry={refetch} />;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className={cn(
        'relative overflow-hidden',
        quizStatus === 'available' ? 'bg-gradient-to-r from-navy-700 to-navy-900' :
        quizStatus === 'in-progress' ? 'bg-gradient-to-r from-amber-600 to-orange-600' :
        quizStatus === 'completed' ? 'bg-gradient-to-r from-emerald-600 to-emerald-800' :
        'bg-gradient-to-r from-slate-600 to-slate-800'
      )}>
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
        <div className="relative px-4 lg:px-8 py-8 text-white">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => router.push(quizTabPath)} className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-2xl lg:text-3xl font-bold">{quiz.title}</h1>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium border',
                    quizStatus === 'available' ? 'bg-white/20 border-white/30 text-white' :
                    quizStatus === 'in-progress' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    quizStatus === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    'bg-gray-200 text-gray-600 border-gray-300'
                  )}>
                    {quizStatus === 'available' ? 'Available' : quizStatus === 'in-progress' ? 'In Progress' : quizStatus === 'completed' ? 'Completed' : quizStatus === 'closed' ? 'Closed' : 'Not Open'}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-white/80 flex-wrap">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    {quiz.question_count || 0} questions
                  </span>
                  <span className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    {formatDuration(quiz.time_limit_minutes)}
                  </span>
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    {quiz.attempt_limit} attempt{quiz.attempt_limit !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {!isTeacher && (
                <button
                  onClick={actionConfig.onClick}
                  disabled={actionConfig.disabled || takeQuizMutation.isPending}
                  className={cn('btn text-white border-0 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all', actionConfig.color)}
                >
                  {takeQuizMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ActionIcon className="w-5 h-5 mr-2" />
                      {actionConfig.text}
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="p-4 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-8 space-y-6">
            {/* Teacher Class Statistics */}
            {isTeacher && stats && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-navy-600" />
                  <h2 className="font-display font-semibold text-navy-800">Class Statistics</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard label="Average" value={stats.average !== null ? stats.average.toFixed(1) : '-'} colorClass="text-navy-700" icon={TrendingUp} />
                  <StatsCard label="Highest" value={stats.highest !== null ? stats.highest.toFixed(1) : '-'} colorClass="text-emerald-600" icon={Award} />
                  <StatsCard label="Lowest" value={stats.lowest !== null ? stats.lowest.toFixed(1) : '-'} colorClass="text-red-600" icon={TrendingUp} />
                  <StatsCard label="Students" value={stats.studentCount} colorClass="text-navy-700" icon={Users} />
                </div>
              </motion.div>
            )}

            {/* Student Score Card */}
            {!isTeacher && quizStatus === 'completed' && quiz.my_attempt?.score !== undefined && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-200 p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <CircularScore score={quiz.my_attempt.score} maxScore={quiz.my_attempt.max_score || quiz.points || 100} size={140} />
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-emerald-800 mb-2">Quiz Completed!</h2>
                    <p className="text-emerald-600 mb-4">Great job on completing this quiz.</p>
                    {quiz.my_attempt.attempts_used && quiz.attempt_limit > 1 && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 rounded-lg">
                        <span className="text-sm text-gray-600">Attempt {quiz.my_attempt.attempts_used} of {quiz.attempt_limit}</span>
                      </div>
                    )}
                    {(quiz.my_attempt?.attempts_used || 0) < quiz.attempt_limit && (
                      <button
                        onClick={() => takeQuizMutation.mutate()}
                        disabled={takeQuizMutation.isPending}
                        className="mt-4 w-full md:w-auto btn btn-outline flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quiz Details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-navy-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-navy-600" />
                  {isEditing ? 'Edit Quiz Details' : 'Quiz Details'}
                </h2>
              </div>

              {isEditing ? (
                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Quiz title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors text-slate-900"
                    />
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Instructions</label>
                    <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                      {/* Toolbar */}
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border-b border-slate-200">
                        {/* Bold */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleBold().run();
                          }}
                          className={cn(
                            'w-7 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors',
                            editor?.isActive('bold')
                              ? 'bg-slate-200 text-slate-900'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          )}
                          title="Bold (Ctrl+B)"
                        >
                          B
                        </button>
                        {/* Italic */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleItalic().run();
                          }}
                          className={cn(
                            'w-7 h-7 flex items-center justify-center rounded text-sm italic transition-colors',
                            editor?.isActive('italic')
                              ? 'bg-slate-200 text-slate-900'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          )}
                          title="Italic (Ctrl+I)"
                        >
                          I
                        </button>
                        {/* Underline */}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            editor?.chain().focus().toggleUnderline().run();
                          }}
                          className={cn(
                            'w-7 h-7 flex items-center justify-center rounded text-sm underline transition-colors',
                            editor?.isActive('underline')
                              ? 'bg-slate-200 text-slate-900'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                          )}
                          title="Underline (Ctrl+U)"
                        >
                          U
                        </button>
                      </div>
                      {/* Editor */}
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  {/* Time Limit and Attempts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        value={editForm.time_limit_minutes ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                        min="1"
                        placeholder="No limit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Attempts Allowed <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={editForm.attempt_limit}
                        onChange={(e) => setEditForm({ ...editForm, attempt_limit: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Score Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Score Selection
                    </label>
                    <div className="flex gap-2">
                      {(['highest', 'latest'] as const).map((policy) => (
                        <button
                          key={policy}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, score_selection_policy: policy })}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                            editForm.score_selection_policy === policy
                              ? 'bg-navy-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {policy}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Open/Close Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DeadlinePicker
                      label="Set Open Date"
                      value={editForm.open_date}
                      onChange={(date) => setEditForm({ ...editForm, open_date: date })}
                    />
                    <DeadlinePicker
                      label="Set Close Date"
                      value={editForm.close_date}
                      onChange={(date) => setEditForm({ ...editForm, close_date: date })}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <HelpCircle className="w-5 h-5 text-navy-500" />
                        <div>
                          <p className="text-sm text-gray-500">Questions</p>
                          <p className="font-medium text-navy-800">{quiz.question_count || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Award className="w-5 h-5 text-navy-500" />
                        <div>
                          <p className="text-sm text-gray-500">Points</p>
                          <p className="font-medium text-navy-800">{quiz.points || quiz.question_count || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {quiz.time_limit_minutes && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Timer className="w-5 h-5 text-navy-500" />
                          <div>
                            <p className="text-sm text-gray-500">Time Limit</p>
                            <p className="font-medium text-navy-800">{formatDuration(quiz.time_limit_minutes)}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <RotateCcw className="w-5 h-5 text-navy-500" />
                        <div>
                          <p className="text-sm text-gray-500">Attempts Allowed</p>
                          <p className="font-medium text-navy-800">{quiz.attempt_limit || 1}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {(quiz.open_at || quiz.close_at) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quiz.open_at && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-navy-500" />
                          <div>
                            <p className="text-sm text-gray-500">Opens</p>
                            <p className="font-medium text-navy-800">{formatDate(quiz.open_at)}</p>
                          </div>
                        </div>
                      )}
                      {quiz.close_at && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Lock className="w-5 h-5 text-navy-500" />
                          <div>
                            <p className="text-sm text-gray-500">Closes</p>
                            <p className="font-medium text-navy-800">{formatDate(quiz.close_at)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>

            {/* Instructions - only show when not editing */}
            {!isEditing && quiz.instructions && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-navy-600" />
                  Instructions
                </h2>
                <div
                  className="prose prose-slate max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: quiz.instructions }}
                />
              </motion.div>
            )}

            {/* Teacher Student Attempts - only show when not editing */}
            {isTeacher && !isEditing && groupedGradingList.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-semibold text-navy-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-navy-600" />
                      Student Attempts
                    </h2>
                    <span className="text-sm text-gray-500">
                      {gradingList.filter((a: { score?: number }) => a.score !== undefined).length} graded attempts
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedGradingList.map((student) => {
                    const isExpanded = expandedStudentId === student.student_id;
                    const latestAttempt = student.attempts[0];
                    return (
                      <div key={student.student_id} className="hover:bg-slate-50/50 transition-colors">
                        <button
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.student_id)}
                          className="w-full flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center">
                              <span className="text-navy-700 font-semibold text-sm">{(student.student_name || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-navy-800">{student.student_name || 'Unknown Student'}</p>
                              <p className="text-xs text-gray-500">{student.student_email}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{student.attempts.length} attempt{student.attempts.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <QuizStudentStatusBadge status={latestAttempt?.score !== undefined ? 'graded' : 'submitted'} score={latestAttempt?.score} maxScore={latestAttempt?.max_score || quiz.points} />
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                                {student.attempts.map((attempt, index) => (
                                  <div key={attempt.attempt_id} className="rounded-lg border border-gray-200 p-3 bg-white">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-sm font-semibold text-navy-800">Attempt {student.attempts.length - index}</p>
                                      <QuizStudentStatusBadge status={attempt.score !== undefined ? 'graded' : 'submitted'} score={attempt.score} maxScore={attempt.max_score || quiz.points} />
                                    </div>
                                    {attempt.submitted_at && (
                                      <div className="py-2 text-sm text-gray-600">
                                        <span className="font-medium">Submitted:</span> {formatDate(attempt.submitted_at)}
                                      </div>
                                    )}
                                    {attempt.time_taken_seconds && (
                                      <div className="pb-2 text-sm text-gray-600">
                                        <span className="font-medium">Time Taken:</span> {Math.round(attempt.time_taken_seconds / 60)} minutes
                                      </div>
                                    )}
                                    {attempt.pending_manual_grading && (
                                      <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-sm text-amber-800"><AlertCircle className="w-4 h-4 inline mr-1" />Requires manual grading</p>
                                      </div>
                                    )}
                                    <button onClick={() => router.push(`/quizzes/${quizId}/grade/${attempt.attempt_id}`)} className="mt-3 w-full flex items-center justify-center gap-2 btn btn-primary">
                                      <Edit3 className="w-4 h-4" />{attempt.score !== undefined ? 'Update Grade' : 'Grade Submission'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Student Attempt History */}
            {!isTeacher && attemptHistory.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-navy-600" />
                  Attempt History
                </h2>
                <div className="space-y-3">
                  {attemptHistory.map((attempt) => (
                    <AttemptHistoryItem
                      key={attempt.id}
                      attempt={attempt}
                      isBest={attempt.id === bestAttemptId}
                      maxPoints={maxPoints}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="xl:col-span-4 space-y-6">
            {/* Actions Card */}
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-display font-semibold text-navy-800 mb-4">{isTeacher ? 'Teacher Actions' : 'Actions'}</h3>
              <div className="space-y-3">
                {isTeacher ? (
                  <>
                    {isEditing ? (
                      <>
                        {editError && (
                          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-3">
                            {editError}
                          </div>
                        )}
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateMutation.isPending}
                          className="w-full btn btn-primary flex items-center justify-center gap-2"
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={updateMutation.isPending}
                          className="w-full btn btn-outline flex items-center justify-center gap-2"
                        >
                          <XIcon className="w-4 h-4" /> Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={enterEditMode}
                          className="w-full btn btn-primary flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" /> Edit Quiz
                        </button>
                        {!quiz.is_published && (
                          <button
                            onClick={() => router.push(`/quizzes/${quizId}/build`)}
                            className="w-full btn btn-outline flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" /> Edit Questions
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this quiz?')) deleteMutation.mutate();
                      }}
                      disabled={updateMutation.isPending && isEditing}
                      className="w-full btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Quiz
                    </button>
                  </>
                ) : (
                  <button
                    onClick={actionConfig.onClick}
                    disabled={actionConfig.disabled || takeQuizMutation.isPending}
                    className={cn('w-full btn text-white border-0 flex items-center justify-center gap-2', actionConfig.color)}
                  >
                    {takeQuizMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ActionIcon className="w-4 h-4" />}
                    {actionConfig.text}
                  </button>
                )}
              </div>
            </motion.div>

            {/* Teacher Submission Summary */}
            {isTeacher && gradingList.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-display font-semibold text-navy-800 mb-4">Attempt Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><Users className="w-4 h-4" /> Total Students</span>
                    <span className="font-semibold text-navy-800">{quiz.student_count ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><Play className="w-4 h-4" /> Started</span>
                    <span className="font-semibold text-blue-600">{gradingList.filter((a: { status?: string }) => a.status !== 'not_submitted').length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Graded</span>
                    <span className="font-semibold text-emerald-600">{gradingList.filter((a: { score?: number }) => a.score !== undefined).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Need Grading</span>
                    <span className="font-semibold text-amber-600">{gradingList.filter((a: { status?: string; score?: number }) => a.status !== 'not_submitted' && a.score === undefined).length}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Student Quiz Details */}
            {!isTeacher && (
              <>
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-display font-semibold text-navy-800 mb-4">Quiz Info</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Questions</span>
                      <span className="font-medium text-navy-800">{quiz.question_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Time Limit</span>
                      <span className="font-medium text-navy-800">{formatDuration(quiz.time_limit_minutes)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Attempts Allowed</span>
                      <span className="font-medium text-navy-800">{quiz.attempt_limit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Points</span>
                      <span className="font-medium text-navy-800">{quiz.points || '—'}</span>
                    </div>
                    {quiz.open_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Opens</span>
                        <span className="font-medium text-navy-800 text-sm">{formatDate(quiz.open_at)}</span>
                      </div>
                    )}
                    {quiz.close_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Closes</span>
                        <span className="font-medium text-navy-800 text-sm">{formatDate(quiz.close_at)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Score Policy</span>
                      <span className="font-medium text-navy-800 capitalize">{quiz.score_selection_policy || 'Highest'}</span>
                    </div>
                  </div>
                </motion.div>

                <RemindersSection quizId={quizId} deadline={quiz.close_at} />

                {quiz.my_attempt?.attempts_used !== undefined && quiz.attempt_limit > 1 && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-display font-semibold text-navy-800 mb-4">Attempts</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-navy-600 rounded-full" style={{ width: `${(quiz.my_attempt.attempts_used / quiz.attempt_limit) * 100}%` }} />
                      </div>
                      <span className="text-sm text-gray-600">{quiz.my_attempt.attempts_used} / {quiz.attempt_limit}</span>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
