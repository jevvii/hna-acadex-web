'use client';

import { useCallback } from 'react';
import { Question } from '@/lib/types';

interface EssayEditorProps {
  question: Question;
  onUpdate: (question: Question) => void;
}

export function EssayEditor({ question, onUpdate }: EssayEditorProps) {
  const wordLimit = question.word_limit;

  const handleWordLimitChange = useCallback((value: string) => {
    const numValue = parseInt(value);
    if (value === '' || (numValue > 0 && !isNaN(numValue))) {
      onUpdate({
        ...question,
        word_limit: value === '' ? undefined : numValue,
      });
    }
  }, [question, onUpdate]);

  return (
    <div>
      {/* Manually Graded Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
          Manually Graded
        </span>
        <p className="mt-2 text-sm text-slate-500">
          Essay questions require manual grading. Students will type their response in a text area.
        </p>
      </div>

      {/* Word Limit */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Word Limit (optional)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={wordLimit ?? ''}
            onChange={(e) => handleWordLimitChange(e.target.value)}
            placeholder="No limit"
            className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <span className="text-sm text-slate-500">words</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {wordLimit
            ? `Students will see a "${wordLimit} words maximum" hint`
            : 'No word limit will be shown to students'}
        </p>
      </div>
    </div>
  );
}