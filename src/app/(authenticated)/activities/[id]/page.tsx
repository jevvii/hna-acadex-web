'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { differenceInDays, differenceInHours } from 'date-fns';
import dayjs, { Dayjs } from 'dayjs';
import { useIsStudent, useIsTeacher } from '@/store/auth';
import { cn, resolveFileUrl } from '@/lib/utils';
import { activitiesApi, activityCommentsApi, reminderApi } from '@/lib/api';
import { Activity, ActivityComment, Submission, SubmissionStatus } from '@/lib/types';
import { CircularScore } from '@/components/CircularScore';
import { DateTimePickerTrigger, DeadlinePickerTrigger } from '@/components/DeadlinePicker';
import { logger } from '@/lib/logger';
import { formatDateTime } from '@/lib/dateUtils';
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
  Users,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Upload,
  FileUp,
  Send,
  X,
  Paperclip,
  Eye,
  CheckSquare,
  GraduationCap,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Save,
  XCircle,
} from 'lucide-react';

// Extended submission type with student info
interface SubmissionWithStudent extends Submission {
  student_name?: string;
  student_email?: string;
}

// Helper functions
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set';
  return formatDateTime(dateStr);
}

function getTimeStatus(dueDate?: string): { text: string; color: string; urgent: boolean } {
  if (!dueDate) return { text: 'No due date', color: 'text-gray-500', urgent: false };

  const now = new Date();
  const due = new Date(dueDate);
  const daysLeft = differenceInDays(due, now);
  const hoursLeft = differenceInHours(due, now);

  if (daysLeft < 0) {
    return { text: `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}`, color: 'text-red-600', urgent: true };
  }
  if (daysLeft === 0) {
    if (hoursLeft <= 0) {
      return { text: 'Due now', color: 'text-red-600', urgent: true };
    }
    return { text: `Due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`, color: 'text-amber-600', urgent: true };
  }
  if (daysLeft <= 3) {
    return { text: `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, color: 'text-amber-600', urgent: true };
  }
  return { text: `Due in ${daysLeft} days`, color: 'text-emerald-600', urgent: false };
}

// PDF Preview Component - Fetches PDF with auth and displays via blob URL
function PdfPreview({ url, fileName }: { url: string; fileName: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchPdf = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/pdf,*/*',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        logger.error('PDF fetch error:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPdf();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-600">Loading PDF...</span>
      </div>
    );
  }

  if (hasError || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-gray-50">
        <FileText className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-3">Could not preview PDF</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      className="w-full h-[600px]"
      title={`PDF Preview - ${fileName}`}
    />
  );
}

function getSubmissionStatus(submission?: { status: SubmissionStatus; graded_at?: string }): { label: string; color: string } {
  if (!submission) return { label: 'Not Submitted', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  if (submission.graded_at) return { label: 'Graded', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  if (submission.status === 'late') return { label: 'Submitted Late', color: 'bg-amber-50 text-amber-600 border-amber-200' };
  return { label: 'Submitted', color: 'bg-blue-50 text-blue-600 border-blue-200' };
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

// Submission Modal Component
function SubmissionModal({
  activity,
  isOpen,
  onClose,
}: {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const activityId = activity.id;
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [comments, setComments] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClose = () => {
    setFiles([]);
    setComments('');
    setIsSuccess(false);
    onClose();
  };

  const submitMutation = useMutation({
    mutationFn: async (data: { files: File[]; comments: string }) => {
      const formData = new FormData();
      data.files.forEach((file) => formData.append('files', file));
      formData.append('comments', data.comments);
      return activitiesApi.submitActivity(activityId, formData);
    },
    onSuccess: async () => {
      // Refetch activity data to update the submission status
      await queryClient.refetchQueries({ queryKey: ['activity', activityId] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsSuccess(true);
    },
  });

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const timeStatus = activity.deadline ? getTimeStatus(activity.deadline) : { text: '', color: '', urgent: false };
  const isLateSubmission = timeStatus.text.includes('Overdue');

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 md:w-full md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-navy-50/50 to-transparent">
            <div>
              <Dialog.Title className="text-xl font-bold text-navy-900">
                {isSuccess ? 'Submission Complete' : 'Submit Assignment'}
              </Dialog.Title>
              <p className="text-sm text-gray-500 mt-1">{activity.title}</p>
            </div>
            <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isSuccess ? (
              // Success state - matches React Native implementation
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-2">Successfully Submitted!</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Your submission has been received and is now waiting to be graded.
                </p>
              </div>
            ) : (
              <>
                {isLateSubmission && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Late Submission</p>
                      <p className="text-sm text-amber-700 mt-1">The due date has passed. Your submission will be marked as late.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-navy-800 mb-3">Upload Files</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
                      isDragging ? 'border-navy-500 bg-navy-50' : 'border-gray-300 hover:border-navy-400 hover:bg-gray-50'
                    )}
                  >
                    <div className="w-16 h-16 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-navy-600" />
                    </div>
                    <p className="text-navy-800 font-medium mb-2">Drag and drop files here</p>
                    <p className="text-gray-500 text-sm mb-4">or</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 cursor-pointer transition-colors">
                      <FileUp className="w-4 h-4" />
                      Browse Files
                      <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                    </label>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-navy-800">Selected Files ({files.length})</label>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Paperclip className="w-4 h-4 text-navy-500" />
                            <span className="text-sm text-navy-700 truncate max-w-xs">{file.name}</span>
                            <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          <button onClick={() => removeFile(index)} className="p-1 hover:bg-gray-200 rounded transition-colors">
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-navy-800 mb-2">Comments (Optional)</label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any comments for your instructor..."
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-navy-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            {isSuccess ? (
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium"
              >
                Done
              </button>
            ) : (
              <>
                <button onClick={handleClose} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium">
                  Cancel
                </button>
                <button
                  onClick={() => submitMutation.mutate({ files, comments })}
                  disabled={submitMutation.isPending || files.length === 0}
                  className="px-6 py-2.5 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                  Submit Assignment
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
              <p className="text-sm text-gray-500">{formatDateTime(reminderDate)}</p>
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
function RemindersSection({ activityId, deadline }: { activityId: string; deadline?: string }) {
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const isReminderAvailable = Boolean(deadline && new Date(deadline).getTime() > Date.now());
  const { data: remindersData, isLoading, error } = useQuery({
    queryKey: ['reminders', 'activity', activityId],
    queryFn: () => reminderApi.getByActivity(activityId) as Promise<{ id: string; reminder_datetime: string }[] | { results: { id: string; reminder_datetime: string }[] }>,
    enabled: !!activityId,
    refetchInterval: 30000,
  });
  const reminders: { id: string; reminder_datetime: string }[] = Array.isArray(remindersData)
    ? remindersData
    : (remindersData?.results ?? []);
  const upcomingReminders = reminders.filter((reminder) => new Date(reminder.reminder_datetime).getTime() > Date.now());
  const createMutation = useMutation({
    mutationFn: (data: { reminder_datetime: string; offset_minutes: number }) => reminderApi.create({ reminder_type: 'activity', activity_id: activityId, ...data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', 'activity', activityId] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) => reminderApi.delete(reminderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', 'activity', activityId] }),
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
              ? 'No reminders set. Add one to get notified before the deadline.'
              : 'Deadline has passed. Reminders are no longer available.'
            : 'No deadline set for this activity.'}
        </p>
      ) : (
        <div className="space-y-2">
          {upcomingReminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-navy-700">{formatDateTime(reminder.reminder_datetime)}</span>
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

// Student status badge
function StudentStatusBadge({ status, score, maxPoints = 100 }: { status: SubmissionStatus; score?: number; maxPoints?: number }) {
  const configs = {
    not_submitted: { label: 'Not Submitted', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
    submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-600 border border-blue-200' },
    late: { label: 'Late', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
    graded: { label: score !== undefined ? `${score}/${maxPoints}` : 'Graded', className: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  };
  const config = configs[status] || configs.not_submitted;
  return <span className={cn('px-3 py-1 rounded-full text-xs font-medium', config.className)}>{config.label}</span>;
}

function SubmissionCommentsPanel({
  activityId,
  submissionId,
  studentId,
  title = 'Private comments',
  allowActivityThread = false,
}: {
  activityId: string;
  submissionId?: string;
  studentId?: string;
  title?: string;
  allowActivityThread?: boolean;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const hasScope = allowActivityThread || Boolean(submissionId || studentId);
  const queryKey = ['activity-comments-thread', activityId, submissionId || `student:${studentId || 'activity'}`];
  const canSend = allowActivityThread || Boolean(submissionId || studentId);

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => activityCommentsApi.getByActivity(
      activityId,
      submissionId || studentId ? { submissionId, studentId } : undefined
    ),
    enabled: !!activityId && hasScope,
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content?: string; attachments: File[] }) => {
      const payload = {
        activity_id: activityId,
        submission_id: submissionId,
        student_id: !submissionId && studentId ? studentId : undefined,
        content,
      };
      if (attachments.length > 0) {
        return activityCommentsApi.createWithFiles(payload, attachments);
      }
      return activityCommentsApi.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    event.target.value = '';
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    const content = draft.trim();
    if (!canSend || (!content && files.length === 0)) return;
    const attachments = files;
    setDraft('');
    setFiles([]);
    createCommentMutation.mutate({ content: content || undefined, attachments });
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-navy-600" />
        <h4 className="text-sm font-semibold text-navy-800">{title}</h4>
      </div>

      {!hasScope ? (
        <p className="text-sm text-gray-500">Comments are not available for this context yet.</p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading comments...
        </div>
      ) : (
        <>
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet.</p>
            ) : (
              comments.map((comment: ActivityComment) => (
                <div key={comment.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-navy-700">{comment.author_name}</p>
                    <p className="text-[11px] text-gray-400">{formatDate(comment.created_at)}</p>
                  </div>
                  {comment.content ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p> : null}
                  {comment.file_urls?.length ? (
                    <div className="mt-2 space-y-1">
                      {comment.file_urls.map((url, idx) => (
                        <a
                          key={`${comment.id}-file-${idx}`}
                          href={resolveFileUrl(url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-navy-600 hover:underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          {decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Attachment')}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {canSend && (
            <div className="mt-4 space-y-2">
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs text-gray-600">
                      <span className="truncate pr-2">{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Write a private comment..."
                className="w-full resize-none rounded-lg border border-gray-200 bg-white p-2 text-sm text-slate-900 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach
                  <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                </label>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createCommentMutation.isPending || (!draft.trim() && files.length === 0)}
                  className="inline-flex items-center gap-1 rounded bg-navy-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createCommentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Main page component
export default function ActivityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = params.id as string;
  const queryClient = useQueryClient();
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();
  const openCommentThread = searchParams.get('open_comment_thread') === '1';
  const threadStudentId = searchParams.get('thread_student_id');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(() => (
    openCommentThread && threadStudentId ? threadStudentId : null
  ));
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number>(0);
  const [inlineExamScores, setInlineExamScores] = useState<Record<string, string>>({});
  const [inlineExamErrors, setInlineExamErrors] = useState<Record<string, string>>({});
  const [inlineExamSavingStudentId, setInlineExamSavingStudentId] = useState<string | null>(null);
  const [showActivityComments, setShowActivityComments] = useState<boolean>(() => openCommentThread && isStudent);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    instructions: string;
    points: number;
    attempt_limit: number;
    deadline: Dayjs | null;
    hasDeadline: boolean;
    allow_late_submissions: boolean;
    allowed_file_types: string[];
    score_selection_policy: 'highest' | 'latest';
    weekly_module_id: string;
    component_type: 'written_works' | 'performance_task' | 'quarterly_assessment' | null;
    is_exam: boolean;
    exam_type: 'monthly' | 'quarterly' | null;
  }>({
    title: '',
    instructions: '',
    points: 100,
    attempt_limit: 1,
    deadline: null,
    hasDeadline: false,
    allow_late_submissions: true,
    allowed_file_types: ['all'],
    score_selection_policy: 'highest',
    weekly_module_id: '',
    component_type: null,
    is_exam: false,
    exam_type: null,
  });
  const [editError, setEditError] = useState('');

  // Tiptap editor for description
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
        placeholder: 'Enter activity description...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2',
      },
    },
  });

  // Sync editor content with editForm
  useEffect(() => {
    if (editor && editForm.instructions !== editor.getHTML()) {
      // Only update if the content is different
    }
  }, [editor, editForm.instructions]);

  const { data: activity, isLoading, error, refetch } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => activitiesApi.getActivity(activityId),
    enabled: !!activityId,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['activity-submissions', activityId],
    queryFn: () => activitiesApi.getAllSubmissions(activityId),
    enabled: !!activityId && isTeacher,
  });

  const quickExamGradeMutation = useMutation({
    mutationFn: async ({ studentId, score }: { studentId: string; score: number }) => {
      return activitiesApi.gradeStudent(activityId, { student_id: studentId, score });
    },
    onMutate: ({ studentId }) => {
      setInlineExamSavingStudentId(studentId);
      setInlineExamErrors(prev => ({ ...prev, [studentId]: '' }));
    },
    onSuccess: (_, { studentId, score }) => {
      setInlineExamScores(prev => ({ ...prev, [studentId]: String(score) }));
      queryClient.invalidateQueries({ queryKey: ['activity-submissions', activityId] });
      queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
      queryClient.invalidateQueries({ queryKey: ['course-activities'] });
    },
    onError: (err: Error | { message?: string }, { studentId }) => {
      const errorMessage = err instanceof Error ? err.message : (err as { message?: string }).message;
      setInlineExamErrors(prev => ({ ...prev, [studentId]: errorMessage || 'Failed to save grade' }));
    },
    onSettled: () => {
      setInlineExamSavingStudentId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => activitiesApi.deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['course-activities'] });
      router.push('/courses');
    },
  });

  // Initialize edit form when entering edit mode
  const enterEditMode = useCallback(() => {
    if (!activity) return;

    // Initialize form state with activity data
    setEditForm({
      title: activity.title || '',
      instructions: activity.instructions || '',
      points: activity.points ?? 100,
      attempt_limit: activity.attempt_limit ?? 1,
      deadline: activity.deadline ? dayjs(activity.deadline) : null,
      hasDeadline: !!activity.deadline,
      allow_late_submissions: activity.allow_late_submissions !== false,
      allowed_file_types: activity.allowed_file_types || ['all'],
      score_selection_policy: (activity.score_selection_policy as 'highest' | 'latest') || 'highest',
      weekly_module_id: activity.weekly_module_id || '',
      component_type: activity.component_type ?? null,
      is_exam: activity.is_exam ?? false,
      exam_type: activity.exam_type ?? null,
    });

    // Initialize Tiptap editor content
    if (editor) {
      editor.commands.setContent(activity.instructions || '');
    }

    setEditError('');
    setIsEditing(true);
  }, [activity, editor]);

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
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('instructions', getEditorHtml());
      formData.append('points', String(editForm.points));
      formData.append('attempt_limit', String(editForm.attempt_limit));
      formData.append('score_selection_policy', editForm.score_selection_policy);
      formData.append('allowed_file_types', JSON.stringify(editForm.allowed_file_types));
      formData.append('allow_late_submissions', String(editForm.hasDeadline ? editForm.allow_late_submissions : true));
      if (editForm.hasDeadline && editForm.deadline) {
        formData.append('deadline', editForm.deadline.toISOString());
      }
      if (editForm.weekly_module_id) {
        formData.append('weekly_module_id', editForm.weekly_module_id);
      }
      formData.append('component_type', editForm.is_exam ? (editForm.exam_type === 'monthly' ? 'written_works' : 'quarterly_assessment') : (editForm.component_type || ''));
      formData.append('is_exam', String(editForm.is_exam));
      formData.append('exam_type', editForm.is_exam ? (editForm.exam_type || '') : '');
      return activitiesApi.updateActivity(activityId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
      queryClient.invalidateQueries({ queryKey: ['course-activities'] });
      setIsEditing(false);
      setEditError('');
    },
    onError: (err: Error | { message?: string }) => {
      const errorMessage = err instanceof Error ? err.message : (err as { message?: string }).message;
      setEditError(errorMessage || 'Failed to update activity');
    },
  });

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) {
      setEditError('Title is required');
      return;
    }
    if (!editForm.is_exam && !editForm.component_type) {
      setEditError('Please select a learning component (Written Works or Performance Task)');
      return;
    }
    if (editForm.is_exam && !editForm.exam_type) {
      setEditError('Please select an exam type (Monthly or Quarterly)');
      return;
    }
    if (!editForm.points || editForm.points <= 0) {
      setEditError('Points must be greater than 0');
      return;
    }
    updateMutation.mutate();
  };

  const handleInlineExamGrade = useCallback((submission: SubmissionWithStudent) => {
    if (!activity?.is_exam) return;

    const studentId = submission.student_id;
    const rawScore = (inlineExamScores[studentId] ?? (submission.score !== undefined && submission.score !== null
      ? String(submission.score)
      : '')).trim();

    if (!rawScore) {
      setInlineExamErrors(prev => ({ ...prev, [studentId]: 'Enter a score before saving.' }));
      return;
    }

    const score = Number(rawScore);
    if (!Number.isFinite(score)) {
      setInlineExamErrors(prev => ({ ...prev, [studentId]: 'Score must be a valid number.' }));
      return;
    }
    if (score < 0) {
      setInlineExamErrors(prev => ({ ...prev, [studentId]: 'Score cannot be negative.' }));
      return;
    }
    if (score > activity.points) {
      setInlineExamErrors(prev => ({ ...prev, [studentId]: `Score cannot exceed ${activity.points}.` }));
      return;
    }

    quickExamGradeMutation.mutate({ studentId, score });
  }, [activity, inlineExamScores, quickExamGradeMutation]);

  const timeStatus = activity?.deadline ? getTimeStatus(activity.deadline) : { text: '', color: '', urgent: false };
  const submissionStatus = activity?.my_submission
    ? getSubmissionStatus(activity.my_submission as unknown as Submission)
    : getSubmissionStatus(undefined);

  // Calculate stats for teacher view
  const calculateStats = (subs: SubmissionWithStudent[], studentCount?: number) => {
    const gradedSubs = subs.filter((s) => s.graded_at);
    const scores = gradedSubs.map((s) => s.score || 0).filter((s) => s > 0);
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const highest = scores.length > 0 ? Math.max(...scores) : null;
    const lowest = scores.length > 0 ? Math.min(...scores) : null;
    return { average, highest, lowest, studentCount: studentCount ?? 0 };
  };

  const stats = isTeacher && submissions.length > 0 ? calculateStats(submissions as SubmissionWithStudent[], activity?.student_count) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
        <p className="mb-4">Failed to load activity details</p>
        <button onClick={() => refetch()} className="btn btn-outline">Try Again</button>
      </div>
    );
  }

  // Check if resubmission is allowed (after activity is confirmed to exist)
  // Submission is detected by status OR submitted_at (backend may return either)
  const hasSubmitted = !!(
    activity.my_submission &&
    (activity.my_submission.status === 'submitted' ||
     activity.my_submission.status === 'graded' ||
     activity.my_submission.status === 'late' ||
     activity.my_submission.submitted_at)
  );
  const attemptLimit = activity.attempt_limit || 1;
  const attemptsUsed = activity.my_submission?.attempt_number || (hasSubmitted ? 1 : 0);
  const attemptsRemaining = attemptLimit - attemptsUsed;
  const canResubmit = hasSubmitted && attemptsRemaining > 0 && activity.my_submission?.status !== 'graded';
  const isGraded = activity.my_submission?.status === 'graded';
  const isStudentExamView = isStudent && activity.is_exam;
  const activityTabPath = activity.course_section_id
    ? `/courses/${activity.course_section_id}?tab=activities`
    : '/courses';

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-8 py-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => router.push(activityTabPath)} className="flex items-center gap-2 text-gray-500 hover:text-navy-600 mb-4 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy-900">{activity.title}</h1>
                  {activity.is_exam && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      {activity.exam_type === 'monthly' ? 'Monthly Exam' :
                       activity.exam_type === 'quarterly' ? 'Quarterly Exam' :
                       'Exam'}
                    </span>
                  )}
                  {!activity.is_exam && activity.component_type && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      {activity.component_type === 'written_works' ? 'Written Works' :
                       activity.component_type === 'performance_task' ? 'Performance Task' :
                       activity.component_type === 'quarterly_assessment' ? 'Quarterly Assessment' : null}
                    </span>
                  )}
                  {/* Status badge - only show for students */}
                  {isStudent && (isStudentExamView ? (
                    isGraded && activity.my_submission ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <Award className="w-4 h-4" /> Graded
                      </span>
                    ) : (
                      <span className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1', timeStatus.urgent ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                        <Clock className="w-4 h-4" /> {activity.deadline ? timeStatus.text : 'Exam details posted'}
                      </span>
                    )
                  ) : (isGraded && activity.my_submission ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1">
                      <Award className="w-4 h-4" /> Graded
                    </span>
                  ) : /* Submitted but not graded */ hasSubmitted ? (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Submitted
                    </span>
                  ) : /* Not submitted - show time status or missing */ (() => {
                    const deadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();
                    const allowLate = activity.allow_late_submissions !== false;
                    const isMissing = deadlinePassed && !allowLate;

                    if (isMissing) {
                      return (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Missing
                        </span>
                      );
                    }

                    return (
                      <span className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1', timeStatus.urgent ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                        <Clock className="w-4 h-4" /> {timeStatus.text}
                      </span>
                    );
                  })()))}
                </div>
                <p className="text-gray-600 max-w-3xl">{activity.description || 'No description provided.'}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="p-4 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-8 space-y-6">
            {/* Teacher Stats - hidden during edit mode */}
            {isTeacher && !isEditing && stats && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-navy-600" />
                  <h2 className="font-display font-semibold text-navy-800">Class Statistics</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard label="Average" value={stats.average !== null ? stats.average.toFixed(1) : '-'} colorClass="text-navy-700" icon={Award} />
                  <StatsCard label="Highest" value={stats.highest !== null ? stats.highest.toFixed(1) : '-'} colorClass="text-emerald-600" icon={TrendingUp} />
                  <StatsCard label="Lowest" value={stats.lowest !== null ? stats.lowest.toFixed(1) : '-'} colorClass="text-red-600" icon={TrendingUp} />
                  <StatsCard label="Students" value={stats.studentCount} colorClass="text-navy-700" icon={Users} />
                </div>
              </motion.div>
            )}

            {/* Assignment Details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-navy-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-navy-600" /> Assignment Details
                </h2>
              </div>

              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4 text-slate-900">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                    />
                  </div>

                  {/* Description/Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
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

                  {/* Points and Attempts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Points</label>
                      <input
                        type="number"
                        value={editForm.points}
                        onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Attempts Allowed</label>
                      <input
                        type="number"
                        value={editForm.attempt_limit}
                        onChange={(e) => setEditForm({ ...editForm, attempt_limit: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Score Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Score Selection</label>
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

                  {/* Learning Component / Exam Type */}
                  <div className="space-y-3">
                    {/* Mark as Exam toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_exam}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditForm({
                            ...editForm,
                            is_exam: checked,
                            ...(checked ? { component_type: null } : { exam_type: null }),
                          });
                        }}
                        className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                      />
                      <span className="text-sm font-medium text-gray-700">This is an Exam</span>
                    </label>

                    {/* Component Type selector - shown when NOT an exam */}
                    {!editForm.is_exam && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Learning Component <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          {([
                            { value: 'written_works', label: 'Written Works' },
                            { value: 'performance_task', label: 'Performance Task' },
                          ] as const).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, component_type: opt.value })}
                              className={cn(
                                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                editForm.component_type === opt.value
                                  ? 'bg-navy-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exam Type selector - shown when IS an exam */}
                    {editForm.is_exam && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Exam Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          {([
                            { value: 'monthly', label: 'Monthly Exam' },
                            { value: 'quarterly', label: 'Quarterly Exam' },
                          ] as const).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, exam_type: opt.value })}
                              className={cn(
                                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                editForm.exam_type === opt.value
                                  ? 'bg-navy-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {editForm.exam_type === 'monthly' ? 'Counts as Written Works' :
                           editForm.exam_type === 'quarterly' ? 'Counts as Quarterly Assessment' :
                           'Select an exam type to see component mapping'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Deadline */}
                  <div>
                    <DeadlinePickerTrigger
                      value={editForm.deadline}
                      onChange={(newValue: Dayjs | null) => setEditForm({ ...editForm, deadline: newValue })}
                      hasDeadline={editForm.hasDeadline}
                      onHasDeadlineChange={(val: boolean) => setEditForm({ ...editForm, hasDeadline: val })}
                      allowLate={editForm.allow_late_submissions}
                      onAllowLateChange={(val: boolean) => setEditForm({ ...editForm, allow_late_submissions: val })}
                    />
                  </div>

                  {/* Submission Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Accepted Submission Types</label>
                    <div className="flex flex-wrap gap-2">
                      {['all', 'text', 'image', 'pdf'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (type === 'all') {
                              setEditForm({ ...editForm, allowed_file_types: ['all'] });
                            } else {
                              setEditForm({
                                ...editForm,
                                allowed_file_types: editForm.allowed_file_types.includes(type)
                                  ? editForm.allowed_file_types.filter((t) => t !== type && t !== 'all')
                                  : [...editForm.allowed_file_types.filter((t) => t !== 'all'), type],
                              });
                            }
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors uppercase',
                            editForm.allowed_file_types.includes(type) || (type !== 'all' && editForm.allowed_file_types.includes('all'))
                              ? 'bg-navy-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Clock className="w-5 h-5 text-navy-500" />
                      <div>
                        <p className="text-sm text-gray-500">{isStudentExamView ? 'Exam Date' : 'Due Date'}</p>
                        <p className="font-medium text-navy-800">{activity.deadline ? formatDate(activity.deadline) : (isStudentExamView ? 'To be announced' : 'Not set')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-navy-500" />
                      <div>
                        <p className="text-sm text-gray-500">Points</p>
                        <p className="font-medium text-navy-800">{activity.points || 'Not graded'}</p>
                      </div>
                    </div>
                    {!isStudentExamView && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <RotateCcw className="w-5 h-5 text-navy-500" />
                        <div>
                          <p className="text-sm text-gray-500">Attempts Allowed</p>
                          <p className="font-medium text-navy-800">
                            {attemptLimit === 1 ? '1 attempt' : `${attemptLimit} attempts`}
                            {hasSubmitted && attemptsRemaining > 0 && (
                              <span className="text-sm text-emerald-600 ml-2">({attemptsRemaining} remaining)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-navy-500" />
                      <div>
                        <p className="text-sm text-gray-500">{isStudentExamView ? 'Exam Type' : 'Submission Type'}</p>
                        <p className="font-medium text-navy-800">
                          {isStudentExamView
                            ? (activity.exam_type === 'monthly' ? 'Monthly Exam' : activity.exam_type === 'quarterly' ? 'Quarterly Exam' : 'Exam')
                            : 'File Upload'}
                        </p>
                      </div>
                    </div>
                    {isStudentExamView ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-navy-500" />
                        <div>
                          <p className="text-sm text-gray-500">Scoring</p>
                          <p className="font-medium text-navy-800">Teacher-recorded grade</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-navy-500" />
                        <div>
                          <p className="text-sm text-gray-500">Late Submissions</p>
                          <p className="font-medium text-navy-800">
                            {activity.allow_late_submissions !== false ? 'Allowed' : 'Not Allowed'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Instructions - hidden during edit mode */}
            {!isEditing && activity.instructions && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="font-display font-semibold text-navy-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-navy-600" /> Instructions
                </h2>
                <div
                  className="prose prose-slate max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: activity.instructions }}
                />
              </motion.div>
            )}

            {/* Student's Submitted Files - Canvas Style with Attempt History */}
            {isStudent && !activity.is_exam && activity.my_submissions && activity.my_submissions.length > 0 && (() => {
              // Get all submissions sorted by attempt (latest first)
              const allAttempts = activity.my_submissions || [];
              const selectedSubmission = allAttempts[selectedAttemptIndex] || allAttempts[0];
              const fileUrls = selectedSubmission?.file_urls || [];

              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold text-navy-800 flex items-center gap-2">
                      <Paperclip className="w-5 h-5 text-navy-600" /> Your Submission Files
                    </h2>
                    <div className="flex items-center gap-3">
                      {/* Attempt Dropdown */}
                      {allAttempts.length > 1 && (
                        <div className="flex items-center gap-2">
                          <label htmlFor="attempt-select" className="text-sm text-gray-500">Attempt:</label>
                          <select
                            id="attempt-select"
                            value={selectedAttemptIndex}
                            onChange={(e) => setSelectedAttemptIndex(Number(e.target.value))}
                            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-navy-500"
                          >
                            {allAttempts.map((sub, idx) => (
                              <option key={sub.id || idx} value={idx}>
                                #{sub.attempt_number || allAttempts.length - idx} {sub.status === 'graded' ? '(Graded)' : sub.status === 'submitted' ? '(Submitted)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <span className="text-sm text-gray-500">
                        {fileUrls.length} file{fileUrls.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Attempt info */}
                  {selectedSubmission && (
                    <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
                      {selectedSubmission.submitted_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDateTime(selectedSubmission.submitted_at)}
                        </span>
                      )}
                      {selectedSubmission.status === 'graded' && selectedSubmission.score !== undefined && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                          Score: {selectedSubmission.score}/{activity.points || 100}
                        </span>
                      )}
                    </div>
                  )}

                  {fileUrls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No files in this attempt</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fileUrls.map((url: string, index: number) => {
                        const resolvedUrl = resolveFileUrl(url);
                        const fileName = url.split('/').pop()?.split('?')[0] || `File ${index + 1}`;
                        const decodedName = decodeURIComponent(fileName);
                        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                        const isPdf = /\.pdf$/i.test(url);
                        const isDocx = /\.docx?$/i.test(url);

                        return (
                          <div key={index} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                            {isImage ? (
                              <div className="relative group">
                                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-sm font-medium text-white truncate drop-shadow">{decodedName}</p>
                                  <a
                                    href={resolvedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-white/20 hover:bg-white/30 rounded backdrop-blur-sm transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                    Download
                                  </a>
                                </div>
                                <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="block">
                                  <img
                                    src={resolvedUrl}
                                    alt={decodedName}
                                    className="w-full h-auto max-h-96 object-contain bg-gray-100"
                                  />
                                </a>
                              </div>
                            ) : isPdf ? (
                              <div>
                                <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4 text-red-500" />
                                    </div>
                                    <p className="text-sm font-medium text-navy-800 truncate">{decodedName}</p>
                                  </div>
                                  <a
                                    href={resolvedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 rounded transition-colors shrink-0"
                                  >
                                    <Download className="w-3 h-3" />
                                    Download
                                  </a>
                                </div>
                                <PdfPreview url={resolvedUrl} fileName={decodedName} />
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-4 bg-white">
                                <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center shrink-0">
                                  {isDocx ? (
                                    <FileText className="w-5 h-5 text-blue-500" />
                                  ) : (
                                    <Paperclip className="w-5 h-5 text-navy-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-navy-800 truncate">{decodedName}</p>
                                  <p className="text-xs text-gray-500">{isDocx ? 'Word Document' : 'File'}</p>
                                </div>
                                <a
                                  href={resolvedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text content if any */}
                  {selectedSubmission?.text_content && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-navy-700 mb-2">Text Submission:</h3>
                      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedSubmission.text_content}
                      </div>
                    </div>
                  )}

                </motion.div>
              );
            })()}

            {/* Student Submission List (Teacher View) - hidden during edit mode */}
            {isTeacher && !isEditing && submissions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-semibold text-navy-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-navy-600" /> Student Submissions
                    </h2>
                    <span className="text-sm text-gray-500">{(submissions as SubmissionWithStudent[]).filter((s) => s.graded_at).length} of {submissions.length} graded</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {(submissions as SubmissionWithStudent[]).map((submission, index) => {
                    const isExpanded = expandedStudentId === submission.student_id;
                    const canOpenGradePage = Boolean(submission.id && submission.student_id);
                    // Use fallback key if id is null/undefined - prefer student_id as secondary key
                    const itemKey = submission.id ?? submission.student_id ?? `submission-${index}`;
                    return (
                      <div key={itemKey} className="hover:bg-slate-50/50 transition-colors">
                        <button
                          onClick={() => setExpandedStudentId(isExpanded ? null : submission.student_id || null)}
                          className="w-full flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center">
                              <span className="text-navy-700 font-semibold text-sm">{(submission.student_name || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-navy-800">{submission.student_name || 'Unknown Student'}</p>
                              <p className="text-xs text-gray-500">{submission.student_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StudentStatusBadge status={submission.status} score={submission.score} maxPoints={activity.points || 100} />
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                                {submission.file_urls && submission.file_urls.length > 0 && (
                                  <div className="mt-3 space-y-3">
                                    <p className="text-sm font-medium text-navy-700 mb-2">Submitted Files:</p>
                                    {submission.file_urls.map((url: string, index: number) => {
                                      const resolvedUrl = resolveFileUrl(url);
                                      const fileName = url.split('/').pop()?.split('?')[0] || `File ${index + 1}`;
                                      const decodedName = decodeURIComponent(fileName);
                                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                      const isPdf = /\.pdf$/i.test(url);

                                      return (
                                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                                          {/* File Header */}
                                          <a
                                            href={resolvedUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                          >
                                            <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center overflow-hidden">
                                              {isImage ? (
                                                <img src={resolvedUrl} alt={decodedName} className="w-full h-full object-cover rounded-lg" />
                                              ) : isPdf ? (
                                                <FileText className="w-5 h-5 text-red-500" />
                                              ) : (
                                                <Paperclip className="w-5 h-5 text-navy-600" />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-navy-800 truncate">{decodedName}</p>
                                              <p className="text-xs text-gray-500">Click to download</p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-gray-400" />
                                          </a>

                                          {/* Image Preview */}
                                          {isImage && (
                                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                                              <img
                                                src={resolvedUrl}
                                                alt={decodedName}
                                                className="max-w-full h-auto max-h-48 mx-auto rounded-lg shadow-sm"
                                              />
                                            </div>
                                          )}

                                          {/* PDF Preview */}
                                          {isPdf && (
                                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                                              <PdfPreview url={resolvedUrl} fileName={fileName} />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {submission.feedback && (
                                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                    <p className="text-sm font-medium text-navy-700 mb-1">Feedback:</p>
                                    <p className="text-sm text-gray-600">{submission.feedback}</p>
                                  </div>
                                )}

                                <SubmissionCommentsPanel
                                  activityId={activityId}
                                  submissionId={submission.id || undefined}
                                  studentId={submission.student_id}
                                  title="Private student-teacher thread"
                                />

                                <div className="mt-4 flex gap-2">
                                  {activity.is_exam ? (
                                    <div className="w-full rounded-lg border border-purple-200 bg-purple-50 p-3">
                                      <p className="text-xs text-purple-700 mb-2">
                                        Quick exam grading (no separate grading page needed)
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          max={activity.points}
                                          step="0.01"
                                          value={inlineExamScores[submission.student_id] ?? (
                                            submission.score !== undefined && submission.score !== null
                                              ? String(submission.score)
                                              : ''
                                          )}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setInlineExamScores(prev => ({ ...prev, [submission.student_id]: value }));
                                            setInlineExamErrors(prev => ({ ...prev, [submission.student_id]: '' }));
                                          }}
                                          placeholder={`0 - ${activity.points}`}
                                          className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        />
                                        <button
                                          onClick={() => handleInlineExamGrade(submission)}
                                          disabled={inlineExamSavingStudentId === submission.student_id}
                                          className="btn btn-primary text-sm"
                                        >
                                          {inlineExamSavingStudentId === submission.student_id ? (
                                            <span className="flex items-center gap-1">
                                              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1">
                                              <Save className="w-4 h-4" /> Save Grade
                                            </span>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-xs text-purple-700 mt-2">
                                        Max points: {activity.points}
                                      </p>
                                      {inlineExamErrors[submission.student_id] && (
                                        <p className="text-xs text-red-600 mt-2">
                                          {inlineExamErrors[submission.student_id]}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (!canOpenGradePage) return;
                                        router.push(`/activities/${activityId}/grade/${submission.student_id}`);
                                      }}
                                      disabled={!canOpenGradePage}
                                      className={cn(
                                        'btn text-sm flex-1',
                                        canOpenGradePage ? 'btn-primary' : 'btn-outline cursor-not-allowed opacity-70'
                                      )}
                                    >
                                      <Edit3 className="w-4 h-4 mr-1" />
                                      {canOpenGradePage
                                        ? (submission.graded_at ? 'Update Grade' : 'Grade Submission')
                                        : 'No Submission Yet'}
                                    </button>
                                  )}
                                </div>
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
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" /> Save Changes
                            </>
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={updateMutation.isPending}
                          className="w-full btn btn-outline flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={enterEditMode}
                        className="w-full btn btn-primary flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" /> Edit Activity
                      </button>
                    )}
                    <button onClick={() => { if (confirm('Are you sure you want to delete this activity?')) deleteMutation.mutate(); }} className="w-full btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> Delete Activity
                    </button>
                  </>
                ) : (
                  <>
                    {isStudentExamView ? (
                      activity.my_submission?.status === 'graded' ? (
                        <div className="p-4 bg-emerald-50 rounded-xl text-center">
                          <p className="text-sm text-emerald-600 mb-1">Your Score</p>
                          <p className="text-3xl font-bold text-emerald-700">
                            {activity.my_submission.score}<span className="text-lg text-emerald-500">/{activity.points || 100}</span>
                          </p>
                          {activity.my_submission.feedback && (
                            <div className="mt-3 p-3 bg-white rounded-lg text-left">
                              <p className="text-xs text-gray-500 mb-1">Feedback</p>
                              <p className="text-sm text-gray-700">{activity.my_submission.feedback}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-blue-50 rounded-xl text-center">
                          <GraduationCap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="font-medium text-blue-800">Exam in class</p>
                          <p className="text-sm text-blue-600 mt-1">Your teacher will post your score after checking.</p>
                        </div>
                      )
                    ) : activity.my_submission?.status === 'graded' ? (
                      /* Graded - show score */
                      <div className="p-4 bg-emerald-50 rounded-xl text-center">
                        <p className="text-sm text-emerald-600 mb-1">Your Score</p>
                        <p className="text-3xl font-bold text-emerald-700">
                          {activity.my_submission.score}<span className="text-lg text-emerald-500">/{activity.points || 100}</span>
                        </p>
                        {activity.my_submission.feedback && (
                          <div className="mt-3 p-3 bg-white rounded-lg text-left">
                            <p className="text-xs text-gray-500 mb-1">Feedback</p>
                            <p className="text-sm text-gray-700">{activity.my_submission.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : hasSubmitted ? (
                      /* Submitted but not graded - check if can resubmit */
                      activity.attempt_limit && (activity.my_submission?.attempt_number || 1) >= activity.attempt_limit ? (
                        <div className="p-4 bg-blue-50 rounded-xl text-center">
                          <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="font-medium text-blue-800">Submitted</p>
                          <p className="text-sm text-blue-600 mt-1">Waiting to be graded</p>
                        </div>
                      ) : (
                        /* Can resubmit */
                        <button
                          onClick={() => setIsSubmitModalOpen(true)}
                          className="w-full btn bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" /> Resubmit Assignment
                        </button>
                      )
                    ) : (
                      /* Not submitted yet */
                      (() => {
                        const deadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();
                        const allowLate = activity.allow_late_submissions !== false;
                        const canSubmit = !deadlinePassed || allowLate;

                        if (!canSubmit) {
                          return (
                            <div className="p-4 bg-red-50 rounded-xl text-center">
                              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                              <p className="font-medium text-red-800">Submission Closed</p>
                              <p className="text-sm text-red-600 mt-1">Late submissions are not allowed for this activity</p>
                            </div>
                          );
                        }

                        return (
                          <button
                            onClick={() => setIsSubmitModalOpen(true)}
                            className="w-full btn btn-primary flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4" /> Submit Assignment
                          </button>
                        );
                      })()
                    )}

                    <button
                      onClick={() => setShowActivityComments((prev) => !prev)}
                      className="w-full btn btn-outline flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {showActivityComments ? 'Hide Comments' : 'Add Comment'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>

            {isStudent && showActivityComments && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <SubmissionCommentsPanel
                  activityId={activityId}
                  title="Private student-teacher thread"
                  allowActivityThread
                />
              </motion.div>
            )}

            {/* Submission Summary (Teacher) */}
            {isTeacher && submissions.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-display font-semibold text-navy-800 mb-4">Submission Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><Users className="w-4 h-4" /> Total Students</span>
                    <span className="font-semibold text-navy-800">{activity.student_count ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><Upload className="w-4 h-4" /> Submitted</span>
                    <span className="font-semibold text-emerald-600">{(submissions as SubmissionWithStudent[]).filter((s) => s.submitted_at).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><Clock className="w-4 h-4" /> Not Submitted</span>
                    <span className="font-semibold text-amber-600">{(submissions as SubmissionWithStudent[]).filter((s) => !s.submitted_at).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Graded</span>
                    <span className="font-semibold text-blue-600">{(submissions as SubmissionWithStudent[]).filter((s) => s.graded_at).length}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Reminders (Student) */}
            {isStudent && <RemindersSection activityId={activityId} deadline={activity.deadline} />}
          </div>
        </div>
      </div>

      {/* Submission Modal */}
      {!activity.is_exam && (
        <SubmissionModal activity={activity} isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} />
      )}

      {/* Tiptap Editor Styles */}
      <style jsx global>{`
        .tiptap {
          outline: none;
          color: #1e293b; /* slate-800 - dark text for light background */
          background: white;
        }
        .tiptap p {
          margin: 0;
        }
        .tiptap p.is-editor-empty:first-child::before {
          color: #94a3b8; /* slate-400 */
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap strong {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
