'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useIsTeacher } from '@/store/auth';
import { cn, resolveFileUrl } from '@/lib/utils';
import { activitiesApi } from '@/lib/api';
import { Activity, Submission, SubmissionStatus } from '@/lib/types';
import { logger } from '@/lib/logger';
import { formatDateTime } from '@/lib/dateUtils';
import {
  ChevronLeft,
  FileText,
  Loader2,
  AlertCircle,
  Download,
  Paperclip,
  ExternalLink,
  GraduationCap,
  Clock,
  Award,
  Save,
  User,
  ChevronDown,
} from 'lucide-react';

// Extended submission type with student info
interface SubmissionWithStudent extends Submission {
  student_name?: string;
  student_email?: string;
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

        // Pre-signed URLs (like Storj) shouldn't use credentials: 'include' 
        // as it causes CORS errors when the server doesn't echo the Origin header.
        const isExternalUrl = url.startsWith('http') && !url.includes(window.location.host);

        const response = await fetch(url, {
          credentials: isExternalUrl ? 'omit' : 'include',
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

function getSubmissionStatus(submission?: Submission): { label: string; color: string } {
  if (!submission) return { label: 'Not Submitted', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  if (submission.graded_at) return { label: 'Graded', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  if (submission.status === 'late') return { label: 'Submitted Late', color: 'bg-amber-50 text-amber-600 border-amber-200' };
  return { label: 'Submitted', color: 'bg-blue-50 text-blue-600 border-blue-200' };
}

export default function GradeSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activityId = params.id as string;
  const studentId = params.studentId as string;
  const isTeacher = useIsTeacher();

  const [score, setScore] = useState<string>('');
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number>(0);

  // Tiptap editor for feedback
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
        placeholder: 'Enter feedback for the student...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-3 py-2',
      },
    },
  });

  // Fetch activity data
  const { data: activity, isLoading: activityLoading, error: activityError, refetch } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => activitiesApi.getActivity(activityId),
    enabled: !!activityId,
  });

  // Fetch all submissions
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['activity-submissions', activityId],
    queryFn: () => activitiesApi.getAllSubmissions(activityId),
    enabled: !!activityId && isTeacher,
  });
  const activityTabPath = activity?.course_section_id
    ? `/courses/${activity.course_section_id}?tab=activities`
    : '/courses';

  // Filter for the specific student's submissions
  const studentSubmissions = (submissions as SubmissionWithStudent[]).filter(
    (s) => s.student_id === studentId
  );

  // Sort by attempt number (latest first)
  const sortedSubmissions = [...studentSubmissions].sort((a, b) => {
    const attemptA = a.attempt_number || 1;
    const attemptB = b.attempt_number || 1;
    return attemptB - attemptA;
  });

  // Get selected submission
  const selectedSubmission = sortedSubmissions[selectedAttemptIndex] || sortedSubmissions[0];

  // Get student info from first submission
  const studentInfo = studentSubmissions[0];

  // Initialize editor content with existing feedback when submission is graded
  useEffect(() => {
    if (selectedSubmission?.feedback && editor) {
      editor.commands.setContent(selectedSubmission.feedback);
    } else if (editor) {
      editor.commands.clearContent();
    }
  }, [selectedSubmission?.feedback, editor]);

  // Initialize score with existing score
  useEffect(() => {
    if (selectedSubmission?.score !== undefined && selectedSubmission?.score !== null) {
      setScore(String(selectedSubmission.score));
    }
  }, [selectedSubmission?.score]);

  // Grade mutation
  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmission?.id) throw new Error('No submission selected');
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum)) throw new Error('Please enter a valid score');
      if (scoreNum < 0) throw new Error('Score cannot be negative');
      if (activity && scoreNum > activity.points) throw new Error(`Score cannot exceed ${activity.points} points`);

      const feedbackHtml = editor?.getHTML() || '';
      const cleanFeedback = feedbackHtml === '<p></p>' || feedbackHtml === '' ? '' : feedbackHtml;

      return activitiesApi.gradeSubmission(selectedSubmission.id, {
        score: scoreNum,
        feedback: cleanFeedback || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-submissions', activityId] });
      queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
      router.push(activityTabPath);
    },
  });

  // Redirect non-teachers
  useEffect(() => {
    if (isTeacher === false) {
      router.push(activityTabPath);
    }
  }, [isTeacher, router, activityTabPath]);

  // Loading state
  if (activityLoading || submissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  // Error state
  if (activityError || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
        <p className="mb-4">Failed to load activity details</p>
        <button onClick={() => refetch()} className="btn btn-outline">Try Again</button>
      </div>
    );
  }

  // No submissions found
  if (studentSubmissions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-amber-500" />
        <p className="mb-4">No submission found for this student</p>
        <button onClick={() => router.push(activityTabPath)} className="btn btn-outline">
          Back to Activity
        </button>
      </div>
    );
  }

  const maxPoints = activity.points || 100;
  const statusInfo = getSubmissionStatus(selectedSubmission);

  // Get file URLs for preview
  const fileUrls = selectedSubmission?.file_urls || [];

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-8 py-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => router.push(activityTabPath)}
              className="flex items-center gap-2 text-gray-500 hover:text-navy-600 mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Activity
            </button>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-6 h-6 text-navy-600" />
                  <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy-900">Grade Submission</h1>
                </div>
                <p className="text-gray-600">{activity.title}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Submission Content */}
          <div className="xl:col-span-7 space-y-6">
            {/* Student Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="font-display font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-navy-600" /> Student Information
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center">
                  <span className="text-navy-700 font-semibold text-lg">
                    {(studentInfo?.student_name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-navy-800 text-lg">{studentInfo?.student_name || 'Unknown Student'}</p>
                  <p className="text-sm text-gray-500">{studentInfo?.student_email}</p>
                </div>
              </div>
            </motion.div>

            {/* Attempt Selector & Submission Details */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-navy-800 flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-navy-600" /> Submission Details
                </h2>
                {/* Attempt Selector */}
                {sortedSubmissions.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="attempt-select" className="text-sm text-gray-500">Attempt:</label>
                    <div className="relative">
                      <select
                        id="attempt-select"
                        value={selectedAttemptIndex}
                        onChange={(e) => setSelectedAttemptIndex(Number(e.target.value))}
                        className="text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500 appearance-none bg-white"
                      >
                        {sortedSubmissions.map((sub, idx) => (
                          <option key={sub.id || idx} value={idx}>
                            Attempt #{sub.attempt_number || sortedSubmissions.length - idx}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Submission Status & Time */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <span className={cn('px-3 py-1 rounded-full text-sm font-medium border', statusInfo.color)}>
                  {statusInfo.label}
                </span>
                {selectedSubmission?.submitted_at && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(selectedSubmission.submitted_at)}
                  </span>
                )}
                {selectedSubmission?.score !== undefined && selectedSubmission?.score !== null && (
                  <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                    <Award className="w-4 h-4" />
                    Current Score: {selectedSubmission.score}/{maxPoints}
                  </span>
                )}
              </div>

              {/* Files */}
              {fileUrls.length > 0 && (
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-medium text-navy-700">Submitted Files ({fileUrls.length})</p>
                  {fileUrls.map((url: string, index: number) => {
                    const resolvedUrl = resolveFileUrl(url);
                    const fileName = url.split('/').pop()?.split('?')[0] || `File ${index + 1}`;
                    const decodedName = decodeURIComponent(fileName);
                    const urlWithoutQuery = url.split('?')[0];
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlWithoutQuery);
                    const isPdf = /\.pdf$/i.test(urlWithoutQuery);
                    const isDocx = /\.docx?$/i.test(urlWithoutQuery);

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

              {/* Text Content */}
              {selectedSubmission?.text_content && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-navy-700 mb-2">Text Submission:</p>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                    {selectedSubmission.text_content}
                  </div>
                </div>
              )}

              {/* No files or text */}
              {fileUrls.length === 0 && !selectedSubmission?.text_content && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No files or text content submitted</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Grading Panel */}
          <div className="xl:col-span-5 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4"
            >
              <h2 className="font-display font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-navy-600" /> Grade Submission
              </h2>

              {/* Score Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Score (out of {maxPoints})
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max={maxPoints}
                    step="0.5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none text-lg font-semibold"
                    placeholder="0"
                  />
                  <span className="text-gray-500 text-lg">/ {maxPoints}</span>
                </div>
                {score && !isNaN(parseFloat(score)) && (
                  <p className="mt-2 text-sm text-gray-500">
                    Percentage: {((parseFloat(score) / maxPoints) * 100).toFixed(1)}%
                  </p>
                )}
              </div>

              {/* Feedback Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (Optional)
                </label>
                <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border-b border-slate-200">
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

              {/* Error Message */}
              {gradeMutation.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {gradeMutation.error instanceof Error ? gradeMutation.error.message : 'Failed to save grade'}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(activityTabPath)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => gradeMutation.mutate()}
                  disabled={gradeMutation.isPending || !score || isNaN(parseFloat(score))}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  {gradeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Grade
                    </>
                  )}
                </button>
              </div>

              {/* Existing Feedback */}
              {selectedSubmission?.feedback && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-500 mb-2">Previous Feedback:</p>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: selectedSubmission.feedback }}
                  />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tiptap Editor Styles */}
      <style jsx global>{`
        .tiptap {
          outline: none;
          color: #1e293b;
          background: white;
        }
        .tiptap p {
          margin: 0;
        }
        .tiptap p.is-editor-empty:first-child::before {
          color: #94a3b8;
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
