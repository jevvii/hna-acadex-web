'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Question, QuizQuestionType } from '@/lib/types';

interface QuestionCardProps {
  question: Question;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const TYPE_COLORS: Record<QuizQuestionType, string> = {
  multiple_choice: 'bg-blue-100 text-blue-700',
  multi_select: 'bg-purple-100 text-purple-700',
  true_false: 'bg-green-100 text-green-700',
  identification: 'bg-amber-100 text-amber-700',
  essay: 'bg-slate-100 text-slate-700',
};

const TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: 'MCQ',
  multi_select: 'Multi',
  true_false: 'T/F',
  identification: 'ID',
  essay: 'Essay',
};

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').substring(0, 50);
}

export function QuestionCard({ question, index, isActive, onClick, onDelete }: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeColor = TYPE_COLORS[question.type] || 'bg-slate-100 text-slate-700';
  const typeLabel = TYPE_LABELS[question.type] || question.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-white rounded-lg cursor-pointer transition-all',
        isActive
          ? 'border-l-4 border-blue-500 shadow-sm'
          : 'border border-slate-200 hover:border-slate-300',
        isDragging && 'opacity-50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start p-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 mr-2 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Question Number */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400 font-medium">Q{index}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeColor)}>
              {typeLabel}
            </span>
          </div>

          {/* Preview Text */}
          <p className="text-sm text-slate-600 truncate">
            {stripHtml(question.text) || 'Empty question'}
          </p>

          {/* Points */}
          <p className="text-xs text-slate-400 mt-1">
            {question.points} pt{question.points !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}