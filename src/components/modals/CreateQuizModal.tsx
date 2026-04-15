'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quizzesApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeadlinePicker } from '@/components/DeadlinePicker';
import type { Dayjs } from 'dayjs';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

interface WeeklyModule {
  id: string;
  week_number: number;
  title: string;
}

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  modules: WeeklyModule[];
}

export function CreateQuizModal({ isOpen, onClose, courseId, modules }: CreateQuizModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [attemptLimit, setAttemptLimit] = useState('1');
  const [timeLimit, setTimeLimit] = useState('');
  const [scorePolicy, setScorePolicy] = useState<'highest' | 'latest'>('highest');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [openDate, setOpenDate] = useState<Dayjs | null>(null);
  const [closeDate, setCloseDate] = useState<Dayjs | null>(null);
  const [error, setError] = useState('');

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
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2',
      },
    },
  });

  const getInstructionsHtml = useCallback(() => {
    if (!editor) return '';
    const html = editor.getHTML();
    if (html === '<p></p>' || html === '' || editor.isEmpty) return '';
    return html;
  }, [editor]);

  const resetForm = useCallback(() => {
    setTitle('');
    setAttemptLimit('1');
    setTimeLimit('');
    setScorePolicy('highest');
    setSelectedModuleId('');
    setOpenDate(null);
    setCloseDate(null);
    setError('');
    editor?.commands.clearContent();
  }, [editor]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return quizzesApi.quickCreate(courseId, {
        title,
        instructions: getInstructionsHtml(),
        attempt_limit: parseInt(attemptLimit),
        score_selection_policy: scorePolicy,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : undefined,
        weekly_module_id: selectedModuleId || undefined,
        open_at: openDate?.toISOString(),
        close_at: closeDate?.toISOString(),
        questions: [],
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
      handleClose();
      // Redirect to quiz builder - response is { quiz: {...}, questions: [...] }
      const quizId = response.quiz?.id || response.id;
      if (quizId) {
        router.push(`/quizzes/${quizId}/build`);
      }
    },
    onError: (err: Error | { message?: string }) => {
      const errorMessage = err instanceof Error ? err.message : (err as { message?: string }).message;
      setError(errorMessage || 'Failed to create quiz');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!attemptLimit || parseInt(attemptLimit) <= 0) {
      setError('Attempt limit must be greater than 0');
      return;
    }
    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-600 text-white">
          <h2 className="text-lg font-semibold">Create Quiz</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Week 1 Quiz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors text-slate-900 placeholder-slate-400"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Instructions
              </label>
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
                .tiptap em {
                  font-style: italic;
                }
                .tiptap u {
                  text-decoration: underline;
                }
              `}</style>
            </div>

            {/* Week Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Week Topic
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedModuleId('')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    !selectedModuleId
                      ? 'bg-navy-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  Unassigned
                </button>
                {modules.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModuleId(m.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                      selectedModuleId === m.id
                        ? 'bg-navy-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    Week {m.week_number}: {m.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Attempts and Time Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Attempt Limit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={attemptLimit}
                  onChange={(e) => setAttemptLimit(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors text-slate-900 placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  min="1"
                  placeholder="No limit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Score Selection Policy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Score Selection
              </label>
              <div className="flex gap-2">
                {(['highest', 'latest'] as const).map((policy) => (
                  <button
                    key={policy}
                    type="button"
                    onClick={() => setScorePolicy(policy)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                      scorePolicy === policy
                        ? 'bg-navy-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {policy}
                  </button>
                ))}
              </div>
            </div>

            {/* Open Date */}
            <DeadlinePicker
              label="Set Open Date"
              value={openDate}
              onChange={(date) => setOpenDate(date)}
            />

            {/* Close Date */}
            <DeadlinePicker
              label="Set Close Date"
              value={closeDate}
              onChange={(date) => setCloseDate(date)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending ? 'Creating...' : 'Continue to Builder'}
              {!createMutation.isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
