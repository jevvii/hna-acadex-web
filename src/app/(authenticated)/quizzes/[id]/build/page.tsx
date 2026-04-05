'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical, Plus, ChevronDown, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { quizzesApi } from '@/lib/api';
import { Quiz, Question, QuizQuestionType } from '@/lib/types';
import { QuestionCard } from './QuestionCard';
import { QuestionEditor } from './QuestionEditor';
import { EmptyState } from './EmptyState';

const QUESTION_TYPES: { type: QuizQuestionType; label: string; color: string }[] = [
  { type: 'multiple_choice', label: 'Multiple Choice', color: 'bg-blue-100 text-blue-700' },
  { type: 'multi_select', label: 'Multiple Select', color: 'bg-purple-100 text-purple-700' },
  { type: 'true_false', label: 'True/False', color: 'bg-green-100 text-green-700' },
  { type: 'identification', label: 'Identification', color: 'bg-amber-100 text-amber-700' },
  { type: 'essay', label: 'Essay', color: 'bg-slate-100 text-slate-700' },
];

function generateId(): string {
  return `new-${crypto.randomUUID()}`;
}

function createEmptyQuestion(type: QuizQuestionType): Question {
  const base: Question = {
    id: generateId(),
    type,
    text: '',
    points: 1,
    sort_order: 0,
  };

  if (type === 'multiple_choice' || type === 'multi_select') {
    return {
      ...base,
      options: [
        { id: generateId(), text: '', is_correct: false, sort_order: 0 },
        { id: generateId(), text: '', is_correct: false, sort_order: 1 },
        { id: generateId(), text: '', is_correct: false, sort_order: 2 },
        { id: generateId(), text: '', is_correct: false, sort_order: 3 },
      ],
    };
  }

  if (type === 'true_false') {
    return {
      ...base,
      options: [
        { id: generateId(), text: 'True', is_correct: true, sort_order: 0 },
        { id: generateId(), text: 'False', is_correct: false, sort_order: 1 },
      ],
    };
  }

  if (type === 'identification') {
    return {
      ...base,
      correct_answer: '',
      alternate_answers: [],
      case_sensitive: false,
    };
  }

  return base;
}

export default function QuizBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const quizId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch quiz info - only run when quizId is available
  const { data: quiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizzesApi.getQuiz(quizId),
    enabled: !!quizId,
  });

  // Fetch existing questions - only run when quizId is available
  const { data: existingQuestions, isLoading } = useQuery({
    queryKey: ['quizQuestions', quizId],
    queryFn: () => quizzesApi.getQuestions(quizId),
    enabled: !!quizId,
  });

  // Initialize questions from server
  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      setQuestions(existingQuestions);
      setActiveQuestionId(existingQuestions[0].id);
    }
  }, [existingQuestions]);

  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }, [questions]);

  const activeQuestion = useMemo(() => {
    return questions.find(q => q.id === activeQuestionId) || null;
  }, [questions, activeQuestionId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, idx) => ({ ...item, sort_order: idx }));
      });
      setHasChanges(true);
    }
  }, []);

  const handleAddQuestion = useCallback((type: QuizQuestionType) => {
    const newQuestion = createEmptyQuestion(type);
    setQuestions(prev => [...prev, newQuestion]);
    setActiveQuestionId(newQuestion.id);
    setShowTypeDropdown(false);
    setHasChanges(true);
  }, []);

  const handleUpdateQuestion = useCallback((updated: Question) => {
    setQuestions(prev =>
      prev.map(q => (q.id === updated.id ? updated : q))
    );
    setHasChanges(true);
  }, []);

  const handleDeleteQuestion = useCallback((id: string) => {
    setQuestions(prev => {
      const filtered = prev.filter(q => q.id !== id);
      if (activeQuestionId === id && filtered.length > 0) {
        setActiveQuestionId(filtered[0].id);
      } else if (filtered.length === 0) {
        setActiveQuestionId(null);
      }
      return filtered;
    });
    setHasChanges(true);
  }, [activeQuestionId]);

  const handleDuplicateQuestion = useCallback((id: string) => {
    const question = questions.find(q => q.id === id);
    if (!question) return;

    const duplicate: Question = {
      ...question,
      id: generateId(),
      options: question.options?.map(o => ({ ...o, id: generateId() })),
    };
    setQuestions(prev => {
      const index = prev.findIndex(q => q.id === id);
      const newQuestions = [...prev];
      newQuestions.splice(index + 1, 0, duplicate);
      return newQuestions.map((q, idx) => ({ ...q, sort_order: idx }));
    });
    setActiveQuestionId(duplicate.id);
    setHasChanges(true);
  }, [questions]);

  const handleSave = useCallback(async (redirect: boolean) => {
    if (isSaving) return;

    // Validate that all questions have text
    const invalidQuestions = questions.filter(q => !q.text || q.text.trim() === '' || q.text === '<p></p>');
    if (invalidQuestions.length > 0) {
      setSaveError(`Please add text to all questions. ${invalidQuestions.length} question(s) are empty.`);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await quizzesApi.bulkUpdateQuestions(quizId, questions);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['quizQuestions', quizId] });

      if (redirect) {
        router.push(`/quizzes/${quizId}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save. Check connection and retry.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [quizId, questions, isSaving, router, queryClient]);

  // Guard against undefined quizId
  if (!quizId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Quiz not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/quizzes/${quizId}`)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Quiz</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="font-semibold text-slate-900">{quiz?.title || 'Quiz Builder'}</h1>
            <span className="text-sm text-slate-500">
              {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalPoints} pts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || !hasChanges}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                hasChanges
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || questions.length === 0}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                questions.length > 0
                  ? 'bg-navy-600 text-white hover:bg-navy-700'
                  : 'bg-navy-300 text-white cursor-not-allowed'
              )}
            >
              {isSaving ? 'Saving...' : 'Save & Finish'}
            </button>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
            {saveError}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto flex">
        {/* Left Panel */}
        <div className="w-[30%] min-w-[280px] max-w-[360px] bg-slate-50 border-r border-slate-200 min-h-[calc(100vh-57px)]">
          <div className="p-4">
            <h2 className="font-medium text-slate-700 mb-3">Questions</h2>

            {questions.length === 0 ? (
              <EmptyState onAddQuestion={handleAddQuestion} />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {questions.map((question, index) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        index={index + 1}
                        isActive={question.id === activeQuestionId}
                        onClick={() => setActiveQuestionId(question.id)}
                        onDelete={() => handleDeleteQuestion(question.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add Question Dropdown */}
            <div className="mt-4 relative">
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full px-4 py-2.5 bg-navy-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-navy-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Question
                <ChevronDown className="w-4 h-4" />
              </button>

              {showTypeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-20">
                  {QUESTION_TYPES.map(({ type, label }) => (
                    <button
                      key={type}
                      onClick={() => handleAddQuestion(type)}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 bg-white min-h-[calc(100vh-57px)]">
          {activeQuestion ? (
            <QuestionEditor
              question={activeQuestion}
              onUpdate={handleUpdateQuestion}
              onDelete={() => handleDeleteQuestion(activeQuestion.id)}
              onDuplicate={() => handleDuplicateQuestion(activeQuestion.id)}
            />
          ) : questions.length > 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              Select a question to edit
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}