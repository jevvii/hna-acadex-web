'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { X } from 'lucide-react';
import { Dayjs } from 'dayjs';
import { cn } from '@/lib/utils';
import { activitiesApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeadlinePickerTrigger } from '@/components/DeadlinePicker';

interface WeeklyModule {
  id: string;
  week_number: number;
  title: string;
}

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  modules: WeeklyModule[];
}

export function CreateActivityModal({ isOpen, onClose, courseId, modules }: CreateActivityModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('100');
  const [attemptLimit, setAttemptLimit] = useState('1');
  const [scorePolicy, setScorePolicy] = useState<'highest' | 'latest'>('highest');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState<Dayjs | null>(null);
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
  const [fileTypes, setFileTypes] = useState<string[]>(['all']);
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
        italic: false,
      }),
      Placeholder.configure({
        placeholder: 'Enter activity description...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[160px] px-3 py-2',
      },
    },
  });

  const getDescriptionHtml = useCallback(() => {
    if (!editor) return '';
    const html = editor.getHTML();
    // If editor is empty (just <p></p>), return empty string
    if (html === '<p></p>' || html === '' || editor.isEmpty) {
      return '';
    }
    return html;
  }, [editor]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('instructions', getDescriptionHtml());
      formData.append('points', points);
      formData.append('attempt_limit', attemptLimit);
      formData.append('score_selection_policy', scorePolicy);
      formData.append('allowed_file_types', JSON.stringify(fileTypes));
      formData.append('is_published', 'true');
      formData.append('allow_late_submissions', String(hasDeadline ? allowLateSubmissions : true));
      if (hasDeadline && deadline) {
        formData.append('deadline', deadline.toISOString());
      }
      if (selectedModuleId) {
        formData.append('weekly_module_id', selectedModuleId);
      }
      return activitiesApi.createActivity(courseId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
      resetForm();
      onClose();
    },
    onError: (err: Error | { message?: string }) => {
      const errorMessage = err instanceof Error ? err.message : (err as { message?: string }).message;
      setError(errorMessage || 'Failed to create activity');
    },
  });

  const resetForm = () => {
    setTitle('');
    setPoints('100');
    setAttemptLimit('1');
    setScorePolicy('highest');
    setSelectedModuleId('');
    setHasDeadline(false);
    setDeadline(null);
    setAllowLateSubmissions(true);
    setFileTypes(['all']);
    setError('');
    editor?.commands.clearContent();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!points || parseInt(points) <= 0) {
      setError('Points must be greater than 0');
      return;
    }
    createMutation.mutate();
  };

  const toggleFileType = (type: string) => {
    if (type === 'all') {
      setFileTypes(['all']);
    } else {
      setFileTypes((prev) => {
        const filtered = prev.filter((t) => t !== 'all');
        if (filtered.includes(type)) {
          return filtered.filter((t) => t !== type);
        }
        return [...filtered, type];
      });
    }
  };

  if (!isOpen) return null;

  const isBoldActive = editor?.isActive('bold') ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-600 text-white">
          <h2 className="text-lg font-semibold">Create Activity</h2>
          <button
            onClick={onClose}
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
                placeholder="e.g., Week 1 Assignment"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors"
              />
            </div>

            {/* Description with Tiptap Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={cn(
                    'px-2 py-1 text-xs font-bold rounded transition-colors',
                    isBoldActive
                      ? 'bg-navy-600 text-white'
                      : 'text-gray-600 hover:text-navy-600 hover:bg-gray-100'
                  )}
                  title="Bold (Ctrl+B)"
                >
                  B
                </button>
              </div>
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-navy-500 focus-within:ring-1 focus-within:ring-navy-500">
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

            {/* Points and Attempts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Points <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Attempts Allowed
                </label>
                <input
                  type="number"
                  value={attemptLimit}
                  onChange={(e) => setAttemptLimit(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors"
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

            {/* Submission Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Accepted Submission Types
              </label>
              <div className="flex flex-wrap gap-2">
                {['all', 'text', 'image', 'pdf'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleFileType(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors uppercase',
                      fileTypes.includes(type)
                        ? 'bg-navy-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline Toggle */}
            <div>
              <DeadlinePickerTrigger
                value={deadline}
                onChange={(newValue) => setDeadline(newValue)}
                hasDeadline={hasDeadline}
                onHasDeadlineChange={(val) => setHasDeadline(val)}
                onAllowLateChange={(val) => setAllowLateSubmissions(val)}
                allowLate={allowLateSubmissions}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}