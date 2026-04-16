'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { Question, QuizQuestionType } from '@/lib/types';
import { MCQEditor } from './editors/MCQEditor';
import { MultiSelectEditor } from './editors/MultiSelectEditor';
import { TrueFalseEditor } from './editors/TrueFalseEditor';
import { IdentificationEditor } from './editors/IdentificationEditor';
import { EssayEditor } from './editors/EssayEditor';

interface QuestionEditorProps {
  question: Question;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const QUESTION_TYPES: { type: QuizQuestionType; label: string }[] = [
  { type: 'multiple_choice', label: 'Multiple Choice' },
  { type: 'multi_select', label: 'Multiple Select' },
  { type: 'true_false', label: 'True/False' },
  { type: 'identification', label: 'Identification' },
  { type: 'essay', label: 'Essay' },
];

export function QuestionEditor({ question, onUpdate, onDelete, onDuplicate }: QuestionEditorProps) {
  const [pendingType, setPendingType] = useState<QuizQuestionType | null>(null);
  const [showConfirmTypeChange, setShowConfirmTypeChange] = useState(false);

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
        placeholder: 'Enter your question...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: question.text,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate({ ...question, text: editor.getHTML() });
    },
  });

  // Update editor content when question changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentContent = editor.getHTML();
      if (currentContent !== question.text) {
        editor.commands.setContent(question.text || '');
      }
    }
  }, [question.id, question.text, editor]);

  const handleTypeChange = useCallback((newType: QuizQuestionType) => {
    if (newType === question.type) return;

    // Check if we have content that would be lost
    const hasOptions = question.options && question.options.length > 0;
    const hasCorrectAnswer = question.correct_answer;
    const hasAlternateAnswers = question.alternate_answers && question.alternate_answers.length > 0;
    const hasContentToLose = hasOptions || hasCorrectAnswer || hasAlternateAnswers;

    if (hasContentToLose && newType !== question.type) {
      setPendingType(newType);
      setShowConfirmTypeChange(true);
    } else {
      // Switch immediately - preserve question text, reset type-specific fields
      const updated: Question = {
        ...question,
        type: newType,
        options: undefined,
        correct_answer: undefined,
        alternate_answers: undefined,
        case_sensitive: undefined,
        word_limit: undefined,
      };

      // Add default options for choice-based types
      if (newType === 'multiple_choice' || newType === 'multi_select') {
        updated.options = [
          { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 0 },
          { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 1 },
          { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 2 },
          { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 3 },
        ];
      } else if (newType === 'true_false') {
        updated.options = [
          { id: `new-${crypto.randomUUID()}`, text: 'True', is_correct: true, sort_order: 0 },
          { id: `new-${crypto.randomUUID()}`, text: 'False', is_correct: false, sort_order: 1 },
        ];
      } else if (newType === 'identification') {
        updated.correct_answer = '';
        updated.alternate_answers = [];
        updated.case_sensitive = false;
      } else if (newType === 'essay') {
        updated.word_limit = undefined;
      }

      onUpdate(updated);
    }
  }, [question, onUpdate]);

  const confirmTypeChange = useCallback(() => {
    if (!pendingType) return;

    const updated: Question = {
      ...question,
      type: pendingType,
      text: question.text, // Preserve text
      options: undefined,
      correct_answer: undefined,
      alternate_answers: undefined,
      case_sensitive: undefined,
      word_limit: undefined,
    };

    if (pendingType === 'multiple_choice' || pendingType === 'multi_select') {
      updated.options = [
        { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 0 },
        { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 1 },
        { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 2 },
        { id: `new-${crypto.randomUUID()}`, text: '', is_correct: false, sort_order: 3 },
      ];
    } else if (pendingType === 'true_false') {
      updated.options = [
        { id: `new-${crypto.randomUUID()}`, text: 'True', is_correct: true, sort_order: 0 },
        { id: `new-${crypto.randomUUID()}`, text: 'False', is_correct: false, sort_order: 1 },
      ];
    } else if (pendingType === 'identification') {
      updated.correct_answer = '';
      updated.alternate_answers = [];
      updated.case_sensitive = false;
    }

    onUpdate(updated);
    setShowConfirmTypeChange(false);
    setPendingType(null);
  }, [pendingType, question, onUpdate]);

  const handlePointsChange = useCallback((points: number) => {
    onUpdate({ ...question, points: Math.max(1, points) });
  }, [question, onUpdate]);

  return (
    <div className="p-6">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-slate-900">Question Editor</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Type Dropdown */}
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value as QuizQuestionType)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {QUESTION_TYPES.map(({ type, label }) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>

          {/* Points Input */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Points:</label>
            <input
              type="number"
              min="1"
              value={question.points}
              onChange={(e) => handlePointsChange(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Question Text Editor */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Question Text
        </label>
        <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border-b border-slate-200">
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
            color: #1e293b;
            background: white;
          }
          .tiptap p {
            margin: 0;
          }
          .tiptap p.is-editor-empty:first-child::before {
            color: #94a3b8;
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

      {/* Type-Specific Editor */}
      <div className="mb-6">
        {question.type === 'multiple_choice' && (
          <MCQEditor question={question} onUpdate={onUpdate} />
        )}
        {question.type === 'multi_select' && (
          <MultiSelectEditor question={question} onUpdate={onUpdate} />
        )}
        {question.type === 'true_false' && (
          <TrueFalseEditor question={question} onUpdate={onUpdate} />
        )}
        {question.type === 'identification' && (
          <IdentificationEditor question={question} onUpdate={onUpdate} />
        )}
        {question.type === 'essay' && (
          <EssayEditor question={question} onUpdate={onUpdate} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <button
          onClick={onDuplicate}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Duplicate
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete Question
        </button>
      </div>

      {/* Type Change Confirmation Modal */}
      {showConfirmTypeChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmTypeChange(false)} />
          <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-lg mb-2">Change Question Type?</h3>
            <p className="text-slate-600 mb-4">
              Changing the question type will clear the current answer options. Your question text will be preserved.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmTypeChange(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmTypeChange}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Change Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
