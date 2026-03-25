'use client';

import { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quizzesApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [attemptLimit, setAttemptLimit] = useState('1');
  const [timeLimit, setTimeLimit] = useState('');
  const [scorePolicy, setScorePolicy] = useState<'highest' | 'latest'>('highest');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [hasOpenDate, setHasOpenDate] = useState(false);
  const [openDate, setOpenDate] = useState('');
  const [hasCloseDate, setHasCloseDate] = useState(false);
  const [closeDate, setCloseDate] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      return quizzesApi.quickCreate(courseId, {
        title,
        instructions,
        attempt_limit: parseInt(attemptLimit),
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : undefined,
        questions: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
      resetForm();
      onClose();
    },
    onError: (err: Error | { message?: string }) => {
      const errorMessage = err instanceof Error ? err.message : (err as { message?: string }).message;
      setError(errorMessage || 'Failed to create quiz');
    },
  });

  const resetForm = () => {
    setTitle('');
    setInstructions('');
    setAttemptLimit('1');
    setTimeLimit('');
    setScorePolicy('highest');
    setSelectedModuleId('');
    setHasOpenDate(false);
    setOpenDate('');
    setHasCloseDate(false);
    setCloseDate('');
    setError('');
  };

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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-600 text-white">
          <h2 className="text-lg font-semibold">Create Quiz</h2>
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
                placeholder="e.g., Week 1 Quiz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter quiz instructions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors resize-none"
              />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors"
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

            {/* Open Date */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasOpenDate}
                  onChange={(e) => setHasOpenDate(e.target.checked)}
                  className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                />
                <span className="text-sm font-medium text-gray-700">Set Open Date</span>
              </label>

              {hasOpenDate && (
                <div className="mt-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-navy-600" />
                  <input
                    type="datetime-local"
                    value={openDate}
                    onChange={(e) => setOpenDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Close Date */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCloseDate}
                  onChange={(e) => setHasCloseDate(e.target.checked)}
                  className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                />
                <span className="text-sm font-medium text-gray-700">Set Close Date</span>
              </label>

              {hasCloseDate && (
                <div className="mt-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-navy-600" />
                  <input
                    type="datetime-local"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors"
                  />
                </div>
              )}
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
              {createMutation.isPending ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
