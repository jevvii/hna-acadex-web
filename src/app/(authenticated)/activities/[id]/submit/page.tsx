'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { activitiesApi, activityCommentsApi } from '@/lib/api';
import { Activity, ActivityComment, Submission } from '@/lib/types';
import {
  ChevronLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';

// Helper functions
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(type?: string) {
  const lower = type?.toLowerCase();
  if (lower?.includes('image')) return ImageIcon;
  return FileText;
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
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
      <p>{message}</p>
    </div>
  );
}

// File upload zone component
function FileUploadZone({
  onFilesSelected,
  disabled,
}: {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
        isDragging
          ? 'border-navy-600 bg-navy-50'
          : 'border-gray-300 hover:border-navy-400 hover:bg-gray-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-navy-800 font-medium">Click to upload or drag and drop</p>
      <p className="text-sm text-gray-500 mt-2">Support files up to 50MB</p>
    </div>
  );
}

// File preview item
function FilePreviewItem({
  file,
  onRemove,
  uploading,
}: {
  file: File;
  onRemove: () => void;
  uploading?: boolean;
}) {
  const Icon = getFileIcon(file.type);
  const isImage = file.type.startsWith('image/');
  const [preview, setPreview] = useState<string | null>(null);

  if (isImage && !preview) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
      {isImage && preview ? (
        <img
          src={preview}
          alt={file.name}
          className="w-12 h-12 object-cover rounded-lg"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-navy-800 truncate">{file.name}</p>
        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
      </div>
      {uploading ? (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// Comment component
function CommentItem({
  comment,
  onReply,
  depth = 0,
}: {
  comment: ActivityComment;
  onReply: (parentId: string) => void;
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={cn('border-l-2 border-gray-100 pl-4', depth > 0 && 'mt-4')}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 font-semibold text-sm">
          {comment.author_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy-800">{comment.author_name}</span>
            <span className="text-sm text-gray-500">{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-gray-700 mt-1">{comment.content}</p>

          {/* Attachments */}
          {comment.file_urls && comment.file_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {comment.file_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  download
                  className="flex items-center gap-1 text-sm text-navy-600 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  Attachment {idx + 1}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onReply(comment.id)}
              className="text-sm text-navy-600 hover:text-navy-800"
            >
              Reply
            </button>
            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {showReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {hasReplies && showReplies && (
        <div className="mt-4">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Comments section
function CommentsSection({ activityId }: { activityId: string }) {
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['activity-comments', activityId],
    queryFn: () => activityCommentsApi.getByActivity(activityId),
    enabled: !!activityId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { content: string; parent_id?: string }) =>
      activityCommentsApi.create({
        activity_id: activityId,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-comments', activityId] });
      setCommentText('');
      setReplyingTo(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    createMutation.mutate({
      content: commentText,
      parent_id: replyingTo || undefined,
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Comment form */}
      <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4">
        {replyingTo && (
          <div className="flex items-center justify-between mb-3 px-3 py-2 bg-navy-50 rounded-lg">
            <span className="text-sm text-navy-700">Replying to comment</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !commentText.trim()}
            className="btn btn-primary flex items-center gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Post Comment
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No comments yet</p>
            <p className="text-sm">Be the first to comment</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={setReplyingTo}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Main page component
export default function ActivitySubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;

  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [textContent, setTextContent] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: activity,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => activitiesApi.getActivity(activityId),
    enabled: !!activityId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (textContent) formData.append('text_content', textContent);
      uploadedFiles.forEach((file) => formData.append('files', file));
      return activitiesApi.submitActivity(activityId, formData);
    },
    onSuccess: async () => {
      // Refetch activity data to ensure fresh submission status before navigation
      await queryClient.refetchQueries({ queryKey: ['activity', activityId] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      router.push(`/activities/${activityId}`);
    },
  });

  const handleFilesSelected = (files: FileList) => {
    setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  const confirmSubmit = () => {
    submitMutation.mutate();
    setIsSubmitModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <LoadingState />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen p-8">
        <ErrorState message="Failed to load activity" />
      </div>
    );
  }

  const hasContent = uploadedFiles.length > 0 || textContent.trim().length > 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <button
                onClick={() => router.push(`/activities/${activityId}`)}
                className="flex items-center gap-2 text-gray-500 hover:text-navy-600 mb-2 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Activity
              </button>
              <h1 className="font-display text-2xl font-bold text-navy-800">
                Submit Assignment
              </h1>
              <p className="text-gray-600 mt-1">{activity.title}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Points</p>
                <p className="font-semibold text-navy-800">{activity.points}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{activity.deadline ? 'Due' : 'No due date'}</p>
                <p className="font-semibold text-navy-800">
                  {activity.deadline ? formatDate(activity.deadline) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex gap-1">
              {[
                { id: 'upload', label: 'Upload Files', icon: Upload },
                { id: 'text', label: 'Text Entry', icon: FileText },
                { id: 'comments', label: 'Comments', icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <Tabs.Trigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors outline-none',
                      activeTab === tab.id
                        ? 'border-navy-600 text-navy-600'
                        : 'border-transparent text-gray-500 hover:text-navy-600 hover:border-gray-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Tabs.Trigger>
                );
              })}
            </Tabs.List>
          </Tabs.Root>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
                disabled={submitMutation.isPending}
              />

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-navy-800">
                    Files to Submit ({uploadedFiles.length})
                  </h3>
                  {uploadedFiles.map((file, index) => (
                    <FilePreviewItem
                      key={`${file.name}-${index}`}
                      file={file}
                      onRemove={() => handleRemoveFile(index)}
                      uploading={submitMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="bg-white rounded-xl shadow-card p-6">
              <h3 className="font-display font-semibold text-navy-800 mb-4">Text Submission</h3>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your submission here..."
                rows={15}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
              />
              <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                <span>{textContent.length} characters</span>
                <span>Markdown supported</span>
              </div>
            </div>
          )}

          {activeTab === 'comments' && <CommentsSection activityId={activityId} />}

          {/* Submit button - only show on upload/text tabs */}
          {(activeTab === 'upload' || activeTab === 'text') && (
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {hasContent ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Ready to submit
                  </span>
                ) : (
                  <span>Add files or text to submit</span>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!hasContent || submitMutation.isPending}
                className="btn btn-primary"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>Submit Assignment</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Submit confirmation modal */}
      <Dialog.Root open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-6 max-w-md w-full z-50">
            <Dialog.Title className="font-display text-xl font-bold text-navy-800 mb-2">
              Submit Assignment?
            </Dialog.Title>
            <Dialog.Description className="text-gray-600 mb-6">
              You are about to submit {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
              {textContent ? ' with a text entry' : ''}. This action cannot be undone.
            </Dialog.Description>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitMutation.isPending}
                className="btn btn-primary"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
