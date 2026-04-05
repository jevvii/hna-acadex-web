'use client';

import { useCallback } from 'react';
import { Question } from '@/lib/types';

interface TrueFalseEditorProps {
  question: Question;
  onUpdate: (question: Question) => void;
}

export function TrueFalseEditor({ question, onUpdate }: TrueFalseEditorProps) {
  const options = question.options || [];

  const handleCorrectChange = useCallback((isTrue: boolean) => {
    const newOptions = [
      { id: options[0]?.id || `new-${crypto.randomUUID()}`, text: 'True', is_correct: isTrue, sort_order: 0 },
      { id: options[1]?.id || `new-${crypto.randomUUID()}`, text: 'False', is_correct: !isTrue, sort_order: 1 },
    ];
    onUpdate({ ...question, options: newOptions });
  }, [options, question, onUpdate]);

  const isTrueCorrect = options[0]?.is_correct ?? true;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Correct Answer
      </label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`tf-${question.id}`}
            checked={isTrueCorrect}
            onChange={() => handleCorrectChange(true)}
            className="w-4 h-4 text-green-600 focus:ring-green-500"
          />
          <span className="text-slate-900">True</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`tf-${question.id}`}
            checked={!isTrueCorrect}
            onChange={() => handleCorrectChange(false)}
            className="w-4 h-4 text-green-600 focus:ring-green-500"
          />
          <span className="text-slate-900">False</span>
        </label>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Students will see two options: True and False.
      </p>
    </div>
  );
}