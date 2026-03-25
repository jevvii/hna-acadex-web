'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { quizzesApi } from '@/lib/api';
import { QuizQuestion, QuizQuestionType, QuizQuestionChoice } from '@/lib/types';
import type { QuizQuestionWithChoices } from '@/lib/types';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
  Flag,
  Send,
  AlertTriangle,
} from 'lucide-react';

// Timer display component
function TimerDisplay({ seconds, warning = false }: { seconds: number; warning?: boolean }) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const formatNumber = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold',
        warning
          ? 'bg-red-100 text-red-700 animate-pulse'
          : seconds < 300
          ? 'bg-amber-100 text-amber-700'
          : 'bg-green-100 text-green-700'
      )}
    >
      <Clock className="w-5 h-5" />
      {hours > 0 && <span>{formatNumber(hours)}:</span>}
      <span>{formatNumber(minutes)}:{formatNumber(secs)}</span>
    </div>
  );
}

// Question palette component
function QuestionPalette({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  flaggedQuestions,
  onQuestionSelect,
}: {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: Set<number>;
  flaggedQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-card p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="font-display font-semibold text-navy-800">Questions</span>
        <span className="text-sm text-gray-500">
          {answeredQuestions.size} / {totalQuestions} answered
        </span>
      </button>

      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isAnswered = answeredQuestions.has(idx);
          const isFlagged = flaggedQuestions.has(idx);
          const isCurrent = idx === currentQuestion;

          return (
            <button
              key={idx}
              onClick={() => onQuestionSelect(idx)}
              className={cn(
                'relative w-full aspect-square rounded-lg text-sm font-medium transition-colors',
                isCurrent
                  ? 'bg-navy-600 text-white'
                  : isAnswered
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {idx + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 rounded" />
          <span className="text-gray-600">Answered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-navy-600 rounded" />
          <span className="text-gray-600">Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded" />
          <span className="text-gray-600">Unanswered</span>
        </div>
      </div>
    </div>
  );
}

// Multiple Choice Question
function MultipleChoiceQuestion({
  question,
  choices,
  value,
  onChange,
}: {
  question: string;
  choices: { id: string; choice_text: string }[];
  value?: string;
  onChange: (choiceId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-navy-800">{question}</p>
      <div className="space-y-2">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => onChange(choice.id)}
            className={cn(
              'w-full text-left p-4 rounded-xl border-2 transition-all',
              value === choice.id
                ? 'border-navy-600 bg-navy-50'
                : 'border-gray-200 hover:border-navy-300 hover:bg-gray-50'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  value === choice.id
                    ? 'border-navy-600 bg-navy-600'
                    : 'border-gray-300'
                )}
              >
                {value === choice.id && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="text-gray-700">{choice.choice_text}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// True/False Question
function TrueFalseQuestion({
  question,
  value,
  onChange,
}: {
  question: string;
  value?: boolean;
  onChange: (answer: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-navy-800">{question}</p>
      <div className="flex gap-4">
        {[
          { label: 'True', value: true },
          { label: 'False', value: false },
        ].map((option) => (
          <button
            key={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 p-4 rounded-xl border-2 text-center font-medium transition-all',
              value === option.value
                ? 'border-navy-600 bg-navy-50 text-navy-800'
                : 'border-gray-200 hover:border-navy-300 hover:bg-gray-50 text-gray-600'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Fill in the Blank Question
function FillBlankQuestion({
  question,
  blanks,
  value,
  onChange,
}: {
  question: string;
  blanks: { id: string; correct_answer: string }[];
  value?: Record<string, string>;
  onChange: (blankId: string, answer: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-navy-800">{question}</p>
      <div className="space-y-4">
        {blanks.map((blank, idx) => (
          <div key={blank.id} className="flex items-center gap-3">
            <span className="text-gray-500 font-medium">{idx + 1}.</span>
            <input
              type="text"
              value={value?.[blank.id] || ''}
              onChange={(e) => onChange(blank.id, e.target.value)}
              placeholder="Your answer"
              className="flex-1 input"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Short Answer Question
function ShortAnswerQuestion({
  question,
  value,
  onChange,
}: {
  question: string;
  value?: string;
  onChange: (answer: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-navy-800">{question}</p>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        rows={6}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
      />
    </div>
  );
}

// Matching Question
function MatchingQuestion({
  question,
  matchingPairs,
  value,
  onChange,
}: {
  question: string;
  matchingPairs: { left: string; right: string }[];
  value?: Record<string, string>;
  onChange: (pairIndex: number, answer: string) => void;
}) {
  const rightOptions = matchingPairs.map((p) => p.right);

  return (
    <div className="space-y-4">
      <p className="text-lg text-navy-800">{question}</p>
      <div className="space-y-3">
        {matchingPairs.map((pair, idx) => (
          <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700 font-medium min-w-[200px]">{pair.left}</span>
            <select
              value={value?.[idx] || ''}
              onChange={(e) => onChange(idx, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
            >
              <option value="">Select match...</option>
              {rightOptions.map((option, optIdx) => (
                <option key={optIdx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// Question renderer based on type
function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const questionWithChoices = question as QuizQuestionWithChoices;
  switch (question.question_type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceQuestion
          question={question.question_text}
          choices={questionWithChoices.choices || []}
          value={value as string | undefined}
          onChange={onChange as (choiceId: string) => void}
        />
      );
    case 'true_false':
      return (
        <TrueFalseQuestion
          question={question.question_text}
          value={value as boolean | undefined}
          onChange={onChange as (answer: boolean) => void}
        />
      );
    case 'fill_in_the_blank':
      return (
        <FillBlankQuestion
          question={question.question_text}
          blanks={questionWithChoices.blanks || []}
          value={value as Record<string, string> | undefined}
          onChange={(blankId, answer) => {
            const newValue = { ...(value as Record<string, string> | undefined || {}), [blankId]: answer };
            onChange(newValue);
          }}
        />
      );
    case 'short_answer':
      return (
        <ShortAnswerQuestion
          question={question.question_text}
          value={value as string | undefined}
          onChange={onChange as (answer: string) => void}
        />
      );
    case 'matching':
      return (
        <MatchingQuestion
          question={question.question_text}
          matchingPairs={question.matching_pairs || []}
          value={value as Record<number, string> | undefined}
          onChange={(pairIndex, answer) => {
            const newValue = { ...(value as Record<number, string> | undefined || {}), [pairIndex]: answer };
            onChange(newValue);
          }}
        />
      );
    default:
      return <p>Unknown question type</p>;
  }
}

// Main page component
export default function QuizTakingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = params.id as string;
  const attemptId = searchParams.get('attempt');

  const queryClient = useQueryClient();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Fetch quiz data
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['quiz-taking', quizId, attemptId],
    queryFn: async () => {
      if (!attemptId) {
        // Start new attempt
        const data = await quizzesApi.takeQuiz(quizId);
        return data;
      }
      // Resume existing attempt
      const data = await quizzesApi.takeQuiz(quizId);
      return data;
    },
    enabled: !!quizId,
    retry: false,
  });

  // Initialize state when data loads
  useEffect(() => {
    if (quizData) {
      setQuestions(quizData.questions || []);
      if (quizData.time_remaining_seconds) {
        setTimeRemaining(quizData.time_remaining_seconds);
      }
    }
  }, [quizData]);

  // Timer ref to avoid recreating interval on every tick
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect - runs once, starts when timeRemaining is initialized
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    // Only start timer if not already running
    if (timerRef.current) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = (prev ?? 0) - 1;
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsTimeUp(true);
          setIsSubmitModalOpen(true);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining]);

  // Auto-save mutation
  const saveProgressMutation = useMutation({
    mutationFn: () => quizzesApi.saveProgress(quizId, answers),
  });

  // Auto-save function using useCallback to avoid stale closure issues
  const saveProgress = useCallback(() => {
    if (Object.keys(answers).length > 0) {
      saveProgressMutation.mutate();
    }
  }, [answers, saveProgressMutation]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  // Submit quiz
  const submitMutation = useMutation({
    mutationFn: () => quizzesApi.submitAttempt(quizId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      router.push(`/quizzes/${quizId}`);
    },
  });

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const answeredQuestions = new Set(
    Object.entries(answers)
      .filter(([_, value]) => {
        if (typeof value === 'string') return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value !== undefined && value !== null;
      })
      .map(([key]) => questions.findIndex((q) => q.id === key))
      .filter((idx) => idx !== -1)
  );

  const handleAnswerChange = (value: unknown) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleFlag = () => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  const confirmSubmit = () => {
    submitMutation.mutate();
  };

  if (isLoading || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  const currentAnswer = answers[currentQuestion.id];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/quizzes/${quizId}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-navy-600"
              >
                <ChevronLeft className="w-5 h-5" />
                Exit
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <span className="font-display font-semibold text-navy-800">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <TimerDisplay
                seconds={timeRemaining || 0}
                warning={!!timeRemaining && timeRemaining < 300}
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-navy-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question area */}
          <div className="lg:col-span-2">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-card p-8"
            >
              <div className="flex items-start justify-between mb-6">
                <span className="text-sm text-gray-500">
                  Points: {currentQuestion.points}
                </span>
                <button
                  onClick={handleFlag}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors',
                    flaggedQuestions.has(currentIndex)
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-400 hover:text-amber-600'
                  )}
                >
                  <Flag className="w-4 h-4" />
                  {flaggedQuestions.has(currentIndex) ? 'Flagged' : 'Flag'}
                </button>
              </div>

              <QuestionRenderer
                question={currentQuestion}
                value={currentAnswer}
                onChange={handleAnswerChange}
              />
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={handlePrevious}
                disabled={isFirst}
                className={cn(
                  'btn btn-outline flex items-center gap-2',
                  isFirst && 'opacity-50 cursor-not-allowed'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex gap-3">
                {!isLast ? (
                  <button
                    onClick={handleNext}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <QuestionPalette
              totalQuestions={totalQuestions}
              currentQuestion={currentIndex}
              answeredQuestions={answeredQuestions}
              flaggedQuestions={flaggedQuestions}
              onQuestionSelect={setCurrentIndex}
            />

            {/* Summary card */}
            <div className="bg-white rounded-xl shadow-card p-4">
              <h4 className="font-display font-semibold text-navy-800 mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Answered</span>
                  <span className="font-medium text-green-600">{answeredQuestions.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unanswered</span>
                  <span className="font-medium text-gray-600">
                    {totalQuestions - answeredQuestions.size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flagged</span>
                  <span className="font-medium text-amber-600">{flaggedQuestions.size}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submit confirmation modal */}
      <Dialog.Root open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-6 max-w-md w-full z-50">
            <Dialog.Title className="font-display text-xl font-bold text-navy-800 mb-2">
              {isTimeUp ? "Time's Up!" : 'Submit Quiz?'}
            </Dialog.Title>

            {isTimeUp ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                  <p className="text-amber-700">Your time has expired. Your answers will be submitted automatically.</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={confirmSubmit}
                    disabled={submitMutation.isPending}
                    className="btn btn-primary"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Submit Now'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Dialog.Description className="text-gray-600 mb-4">
                  You have answered {answeredQuestions.size} out of {totalQuestions} questions.
                </Dialog.Description>

                {answeredQuestions.size < totalQuestions && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg mb-4 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>You have {totalQuestions - answeredQuestions.size} unanswered questions.</span>
                  </div>
                )}

                {flaggedQuestions.size > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-4 text-sm text-gray-600">
                    <Flag className="w-4 h-4" />
                    <span>You have {flaggedQuestions.size} flagged questions to review.</span>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="btn btn-outline"
                  >
                    Continue Quiz
                  </button>
                  <button
                    onClick={confirmSubmit}
                    disabled={submitMutation.isPending}
                    className="btn btn-primary"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Submit Quiz'
                    )}
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
