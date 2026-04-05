'use client';

import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Question, QuestionOption } from '@/lib/types';

interface MultiSelectEditorProps {
  question: Question;
  onUpdate: (question: Question) => void;
}

export function MultiSelectEditor({ question, onUpdate }: MultiSelectEditorProps) {
  const options = question.options || [];

  const handleOptionChange = useCallback((index: number, field: 'text' | 'is_correct', value: string | boolean) => {
    const newOptions = [...options];
    if (field === 'text') {
      newOptions[index] = { ...newOptions[index], text: value as string };
    } else {
      // Multi-select: toggle is_correct
      newOptions[index] = { ...newOptions[index], is_correct: value as boolean };
    }
    onUpdate({ ...question, options: newOptions });
  }, [options, question, onUpdate]);

  const handleAddOption = useCallback(() => {
    if (options.length >= 6) return;
    const newOption: QuestionOption = {
      id: `new-${crypto.randomUUID()}`,
      text: '',
      is_correct: false,
      sort_order: options.length,
    };
    onUpdate({ ...question, options: [...options, newOption] });
  }, [options, question, onUpdate]);

  const handleRemoveOption = useCallback((index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    onUpdate({ ...question, options: newOptions });
  }, [options, question, onUpdate]);

  const hasCorrectAnswer = options.some(o => o.is_correct);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Answer Options
      </label>
      <p className="text-sm text-slate-500 mb-3">
        Students must select all correct answers to receive full points.
      </p>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={option.is_correct}
              onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <input
              type="text"
              value={option.text}
              onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {options.length > 2 && (
              <button
                onClick={() => handleRemoveOption(index)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button
          onClick={handleAddOption}
          className="mt-3 flex items-center gap-1.5 text-purple-600 hover:text-purple-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      )}
      {!hasCorrectAnswer && options.length >= 2 && (
        <p className="mt-2 text-sm text-amber-600">
          Select at least one correct answer
        </p>
      )}
    </div>
  );
}