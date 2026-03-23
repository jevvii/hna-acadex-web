'use client';

import { useState } from 'react';
import { X, Calendar, Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { activitiesApi } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('100');
  const [attemptLimit, setAttemptLimit] = useState('1');
  const [scorePolicy, setScorePolicy] = useState<'highest' | 'latest'>('highest');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [fileTypes, setFileTypes] = useState<string[]>(['all']);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('instructions', description);
      formData.append('points', points);
      formData.append('attempt_limit', attemptLimit);
      formData.append('score_selection_policy', scorePolicy);
      formData.append('allowed_file_types', JSON.stringify(fileTypes));
      formData.append('is_published', 'true'); // Publish immediately
      if (hasDeadline && deadline) {
        formData.append('deadline', new Date(deadline).toISOString());
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
    onError: (err: any) => {
      setError(err.message || 'Failed to create activity');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPoints('100');
    setAttemptLimit('1');
    setScorePolicy('highest');
    setSelectedModuleId('');
    setHasDeadline(false);
    setDeadline('');
    setFileTypes(['all']);
    setError('');
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

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter activity description..."
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDeadline}
                  onChange={(e) => setHasDeadline(e.target.checked)}
                  className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                />
                <span className="text-sm font-medium text-gray-700">Set Deadline</span>
              </label>

              {hasDeadline && (
                <div className="mt-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-navy-600" />
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
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
              {createMutation.isPending ? 'Creating...' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
