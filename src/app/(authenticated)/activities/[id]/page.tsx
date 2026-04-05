'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { differenceInDays, differenceInHours } from 'date-fns';
import dayjs, { Dayjs } from 'dayjs';
import { useIsStudent, useIsTeacher } from '@/store/auth';
import { cn, resolveFileUrl } from '@/lib/utils';
import { activitiesApi, reminderApi } from '@/lib/api';
import { Activity, Submission, SubmissionStatus } from '@/lib/types';
import { CircularScore } from '@/components/CircularScore';
import { DeadlinePickerTrigger } from '@/components/DeadlinePicker';
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
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
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
      </div>
      <button onClick={onClose} className="btn btn-outline w-full mt-4">Cancel</button>
    </div>
  );
}

// Reminders section
function RemindersSection({ activityId, deadline }: { activityId: string; deadline?: string }) {
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { data: remindersData, isLoading, error } = useQuery({ queryKey: ['reminders', 'activity', activityId], queryFn: () => reminderApi.getByActivity(activityId), enabled: !!activityId });
  // Ensure reminders is always an array, even if API returns error object
  const reminders = Array.isArray(remindersData) ? remindersData : [];
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
              <button className="btn btn-outline text-sm py-2 px-3"><Plus className="w-4 h-4 mr-1" />Add</button>
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
      ) : reminders.length === 0 ? (
        <p className="text-gray-500 text-sm">{deadline ? 'No reminders set. Add one to get notified before the deadline.' : 'No deadline set for this activity.'}</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
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
function StudentStatusBadge({ status, score }: { status: SubmissionStatus; score?: number }) {
  const configs = {
    not_submitted: { label: 'Not Submitted', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
    submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-600 border border-blue-200' },
    late: { label: 'Late', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
    graded: { label: score !== undefined ? `${score}/100` : 'Graded', className: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  };
  const config = configs[status] || configs.not_submitted;
  return <span className={cn('px-3 py-1 rounded-full text-xs font-medium', config.className)}>{config.label}</span>;
}

// Main page component
export default function ActivityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;
  const queryClient = useQueryClient();
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number>(0);

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
      Underline,
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
    if (!editForm.points || editForm.points <= 0) {
      setEditError('Points must be greater than 0');
      return;
    }
    updateMutation.mutate();
  };

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

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-8 py-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-navy-600 mb-4 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy-900">{activity.title}</h1>
                  {/* Status badge - only show for students */}
                  {isStudent && (isGraded && activity.my_submission ? (
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
                  })())}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Attempts Allowed</label>
                      <input
                        type="number"
                        value={editForm.attempt_limit}
                        onChange={(e) => setEditForm({ ...editForm, attempt_limit: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
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
                        <p className="text-sm text-gray-500">Due Date</p>
                        <p className="font-medium text-navy-800">{formatDate(activity.deadline)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-navy-500" />
                      <div>
                        <p className="text-sm text-gray-500">Points</p>
                        <p className="font-medium text-navy-800">{activity.points || 'Not graded'}</p>
                      </div>
                    </div>
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
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-navy-500" />
                      <div>
                        <p className="text-sm text-gray-500">Submission Type</p>
                        <p className="font-medium text-navy-800">File Upload</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-navy-500" />
                      <div>
                        <p className="text-sm text-gray-500">Late Submissions</p>
                        <p className="font-medium text-navy-800">
                          {activity.allow_late_submissions !== false ? 'Allowed' : 'Not Allowed'}
                        </p>
                      </div>
                    </div>
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
            {isStudent && activity.my_submissions && activity.my_submissions.length > 0 && (() => {
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
                            <StudentStatusBadge status={submission.status} score={submission.score} />
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
                                <div className="mt-4 flex gap-2">
                                  <button onClick={() => router.push(`/activities/${activityId}/submissions/${submission.id}/grade`)} className="btn btn-primary text-sm flex-1">
                                    <Edit3 className="w-4 h-4 mr-1" /> {submission.graded_at ? 'Update Grade' : 'Grade Submission'}
                                  </button>
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
                    {activity.my_submission?.status === 'graded' ? (
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
                  </>
                )}
              </div>
            </motion.div>

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
      <SubmissionModal activity={activity} isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} />

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
