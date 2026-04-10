'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Edit2, RotateCcw, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { gradingApi } from '@/lib/api';
import type { GradeWeightConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DEPED_DEFAULT_WEIGHTS } from '@/lib/gradeConstants';

interface GradeWeightsConfigProps {
  courseSectionId: string;
}

export function GradeWeightsConfig({ courseSectionId }: GradeWeightsConfigProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    written_works: 0,
    performance_tasks: 0,
    quarterly_assessment: 0,
  });

  const { data: config, isLoading, error, refetch } = useQuery<GradeWeightConfig>({
    queryKey: ['gradeWeights', courseSectionId],
    queryFn: () => gradingApi.getGradeWeights(courseSectionId),
    enabled: !!courseSectionId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { written_works: number; performance_tasks: number; quarterly_assessment: number }) =>
      gradingApi.updateGradeWeights(courseSectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradeWeights', courseSectionId] });
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    if (config) {
      setEditValues({
        written_works: config.written_works,
        performance_tasks: config.performance_tasks,
        quarterly_assessment: config.quarterly_assessment,
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleResetToDefault = () => {
    const category = config?.subject_category;
    const defaults = category && DEPED_DEFAULT_WEIGHTS[category]
      ? DEPED_DEFAULT_WEIGHTS[category]
      : DEPED_DEFAULT_WEIGHTS.default;
    setEditValues({
      written_works: defaults.written_works,
      performance_tasks: defaults.performance_tasks,
      quarterly_assessment: defaults.quarterly_assessment,
    });
  };

  const handleSave = () => {
    updateMutation.mutate(editValues);
  };

  const total = editValues.written_works + editValues.performance_tasks + editValues.quarterly_assessment;
  const isValid = total === 100;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-navy-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Failed to load grade weights</span>
          <button
            onClick={() => refetch()}
            className="text-xs text-navy-600 hover:underline ml-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <h3 className="text-sm font-semibold text-navy-800 uppercase tracking-wider">
          Grade Weights
        </h3>
        {config.is_customized && (
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
            Customized
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Warning when subject category is not set */}
          {!config.subject_category && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Subject type not set. Using 25/50/25 defaults. Contact admin to classify this subject.
              </p>
            </div>
          )}

          {!isEditing ? (
            <>
              {/* Read-only display */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Written Works</p>
                  <p className="text-2xl font-bold text-navy-800">{config.written_works}%</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Performance Tasks</p>
                  <p className="text-2xl font-bold text-navy-800">{config.performance_tasks}%</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Quarterly Assessment</p>
                  <p className="text-2xl font-bold text-navy-800">{config.quarterly_assessment}%</p>
                </div>
              </div>

              {/* Category info */}
              {config.subject_category && config.category_label && (
                <p className="text-xs text-gray-500 text-center">
                  Based on: {config.category_label} (DepEd)
                </p>
              )}

              {/* Edit button */}
              <div className="flex justify-end">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Edit mode */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 text-center">Written Works (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editValues.written_works}
                    onChange={(e) => setEditValues({ ...editValues, written_works: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 text-center">Performance Tasks (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editValues.performance_tasks}
                    onChange={(e) => setEditValues({ ...editValues, performance_tasks: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 text-center">Quarterly Assessment (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editValues.quarterly_assessment}
                    onChange={(e) => setEditValues({ ...editValues, quarterly_assessment: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Total validation */}
              <div className="text-center">
                <span
                  className={cn(
                    'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold',
                    isValid
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  Total: {total}%
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to DepEd Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isValid || updateMutation.isPending}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-1.5 text-sm text-white rounded-lg transition-colors',
                      isValid && !updateMutation.isPending
                        ? 'bg-navy-600 hover:bg-navy-700'
                        : 'bg-gray-300 cursor-not-allowed'
                    )}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                </div>
              </div>

              {/* Confirmation warning */}
              {isValid && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    This will recompute all period grades.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default GradeWeightsConfig;