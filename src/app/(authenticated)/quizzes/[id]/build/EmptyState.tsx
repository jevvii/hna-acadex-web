'use client';

import { HelpCircle } from 'lucide-react';
import { QuizQuestionType } from '@/lib/types';

interface EmptyStateProps {
  onAddQuestion: (type: QuizQuestionType) => void;
}

const QUESTION_TYPES: { type: QuizQuestionType; label: string; description: string }[] = [
  { type: 'multiple_choice', label: 'Multiple Choice', description: 'One correct answer' },
  { type: 'multi_select', label: 'Multiple Select', description: 'Multiple correct answers' },
  { type: 'true_false', label: 'True/False', description: 'True or False options' },
  { type: 'identification', label: 'Identification', description: 'Short text answer' },
  { type: 'essay', label: 'Essay', description: 'Long text answer (manual grading)' },
];

export function EmptyState({ onAddQuestion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <HelpCircle className="w-12 h-12 text-slate-300 mb-4" />
      <p className="text-slate-600 mb-4">Add your first question to get started</p>
      <div className="grid grid-cols-1 gap-2 w-full">
        {QUESTION_TYPES.map(({ type, label, description }) => (
          <button
            key={type}
            onClick={() => onAddQuestion(type)}
            className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <div>
              <p className="font-medium text-slate-900">{label}</p>
              <p className="text-sm text-slate-500">{description}</p>
            </div>
            <span className="text-blue-600 text-lg">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}