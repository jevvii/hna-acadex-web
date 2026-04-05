'use client';

import { useCallback, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Question } from '@/lib/types';

interface IdentificationEditorProps {
  question: Question;
  onUpdate: (question: Question) => void;
}

export function IdentificationEditor({ question, onUpdate }: IdentificationEditorProps) {
  const [newAlternate, setNewAlternate] = useState('');

  const correctAnswer = question.correct_answer || '';
  const alternateAnswers = question.alternate_answers || [];
  const caseSensitive = question.case_sensitive ?? false;

  const handleCorrectAnswerChange = useCallback((value: string) => {
    onUpdate({ ...question, correct_answer: value });
  }, [question, onUpdate]);

  const handleCaseSensitiveChange = useCallback((checked: boolean) => {
    onUpdate({ ...question, case_sensitive: checked });
  }, [question, onUpdate]);

  const handleAddAlternate = useCallback(() => {
    if (!newAlternate.trim()) return;
    onUpdate({
      ...question,
      alternate_answers: [...alternateAnswers, newAlternate.trim()],
    });
    setNewAlternate('');
  }, [newAlternate, alternateAnswers, question, onUpdate]);

  const handleRemoveAlternate = useCallback((index: number) => {
    const newAlternates = alternateAnswers.filter((_, i) => i !== index);
    onUpdate({ ...question, alternate_answers: newAlternates });
  }, [alternateAnswers, question, onUpdate]);

  return (
    <div>
      {/* Correct Answer */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Correct Answer <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={correctAnswer}
          onChange={(e) => handleCorrectAnswerChange(e.target.value)}
          placeholder="Enter the correct answer"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Alternate Answers */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Alternate Answers
        </label>
        <p className="text-sm text-slate-500 mb-2">
          Add other acceptable answers (optional)
        </p>

        {alternateAnswers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {alternateAnswers.map((answer, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
              >
                {answer}
                <button
                  onClick={() => handleRemoveAlternate(index)}
                  className="p-0.5 hover:bg-amber-200 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newAlternate}
            onChange={(e) => setNewAlternate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAlternate();
              }
            }}
            placeholder="Add alternate answer"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleAddAlternate}
            disabled={!newAlternate.trim()}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      {/* Case Sensitive Toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => handleCaseSensitiveChange(e.target.checked)}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
          />
          <span className="text-sm text-slate-700">
            Case sensitive
          </span>
        </label>
        <p className="mt-1 text-sm text-slate-500 ml-6">
          {caseSensitive
            ? 'Students must match the exact capitalization'
            : 'Answers will be compared case-insensitively (Paris = paris = PARIS)'}
        </p>
      </div>

      {/* Validation */}
      {!correctAnswer && (
        <p className="text-sm text-amber-600">
          Please enter a correct answer
        </p>
      )}
    </div>
  );
}