'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useIsTeacher } from '@/store/auth';
import { cn } from '@/lib/utils';
import { quizzesApi } from '@/lib/api';
import { Quiz, QuizQuestionType } from '@/lib/types';
import { logger } from '@/lib/logger';
import { formatDateTime } from '@/lib/dateUtils';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  GraduationCap,
  Clock,
  Award,
  Save,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';

// Answer type from grading list
interface GradingAnswer {
  answer_id: string;
  question_id: string;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  selected_choice_id?: string;
  selected_choice_text?: string;
  text_answer?: string;
  is_correct?: boolean;
  points_awarded?: number;
  needs_manual_grading: boolean;
}

// Extended grading attempt type with answers
interface QuizGradingAttemptWithAnswers {
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  score?: number;
  max_score?: number;
  submitted_at?: string;
  time_taken_seconds?: number;
  status: 'not_submitted' | 'submitted' | 'graded';
  pending_manual_grading?: boolean;
  attempt_number?: number;
  answers?: GradingAnswer[];
}

// Question types that are auto-graded
const AUTO_GRADED_TYPES: QuizQuestionType[] = ['multiple_choice', 'true_false', 'identification'];
// Question types that need manual grading
const MANUAL_GRADED_TYPES: QuizQuestionType[] = ['essay', 'multi_select'];

function isAutoGraded(type: QuizQuestionType): boolean {
  return AUTO_GRADED_TYPES.includes(type);
}

function isManualGraded(type: QuizQuestionType): boolean {
  return MANUAL_GRADED_TYPES.includes(type);
}

export default function QuizManualGradingPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const quizId = params.id as string;
  const attemptId = params.attemptId as string;
  const isTeacher = useIsTeacher();

  // Track scores for each answer that needs manual grading
  const [answerScores, setAnswerScores] = useState<Record<string, string>>({});
  // Track which answers are being saved
  const [savingAnswers, setSavingAnswers] = useState<Set<string>>(new Set());
  // Track grading errors
  const [gradingError, setGradingError] = useState<{ answerId: string; message: string } | null>(null);

  // Fetch quiz data
  const { data: quiz, isLoading: quizLoading, error: quizError, refetch } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizzesApi.getQuiz(quizId),
    enabled: !!quizId,
  });

  // Fetch grading list
  const { data: gradingData, isLoading: gradingLoading } = useQuery({
    queryKey: ['quiz-grading', quizId],
    queryFn: () => quizzesApi.getGradingList(quizId),
    enabled: !!quizId && isTeacher,
  });

  // Normalize grading data to array
  const gradingList = Array.isArray(gradingData)
    ? gradingData
    : (gradingData as unknown as { results?: unknown[] })?.results ?? [];

  // Find the specific attempt - try by attempt_id first, then by student_id
  const attempt = (gradingList as QuizGradingAttemptWithAnswers[]).find(
    (a) => a.attempt_id === attemptId || a.student_id === attemptId
  );

  // Initialize answer scores when attempt data loads
  useEffect(() => {
    if (attempt?.answers) {
      const scores: Record<string, string> = {};
      attempt.answers.forEach((answer) => {
        if (isManualGraded(answer.question_type)) {
          scores[answer.answer_id] = String(answer.points_awarded ?? 0);
        }
      });
      setAnswerScores(scores);
    }
  }, [attempt?.answers]);

  // Grade answer mutation
  const gradeMutation = useMutation({
    mutationFn: async ({ answerId, pointsAwarded }: { answerId: string; pointsAwarded: number }) => {
      return quizzesApi.gradeAnswer(answerId, { points_awarded: pointsAwarded });
    },
    onSuccess: (_, { answerId }) => {
      setSavingAnswers((prev) => {
        const next = new Set(prev);
        next.delete(answerId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['quiz-grading', quizId] });
    },
    onError: (error, { answerId }) => {
      setSavingAnswers((prev) => {
        const next = new Set(prev);
        next.delete(answerId);
        return next;
      });
      setGradingError({
        answerId,
        message: error instanceof Error ? error.message : 'Failed to save grade',
      });
    },
  });

  // Handle grading an answer
  const handleGradeAnswer = async (answerId: string, maxPoints: number) => {
    const scoreStr = answerScores[answerId];
    const score = parseFloat(scoreStr);

    if (isNaN(score) || score < 0 || score > maxPoints) {
      return;
    }

    setGradingError(null);
    setSavingAnswers((prev) => new Set(prev).add(answerId));
    gradeMutation.mutate({ answerId, pointsAwarded: score });
  };

  // Redirect non-teachers
  useEffect(() => {
    if (isTeacher === false) {
      router.push(`/quizzes/${quizId}`);
    }
  }, [isTeacher, router, quizId]);

  // Loading state
  if (quizLoading || gradingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  // Error state
  if (quizError || !quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
        <p className="mb-4">Failed to load quiz details</p>
        <button onClick={() => refetch()} className="btn btn-outline">Try Again</button>
      </div>
    );
  }

  // No attempt found
  if (!attempt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3 text-amber-500" />
        <p className="mb-4">No submission found for this student</p>
        <button onClick={() => router.push(`/quizzes/${quizId}`)} className="btn btn-outline">
          Back to Quiz
        </button>
      </div>
    );
  }

  // Get answers
  const answers = attempt.answers || [];
  const sortedAnswers = [...answers];

  // Calculate total score
  const autoGradedScore = sortedAnswers
    .filter((a) => isAutoGraded(a.question_type) && a.points_awarded !== undefined)
    .reduce((sum, a) => sum + (a.points_awarded || 0), 0);

  const manualGradedScore = sortedAnswers
    .filter((a) => isManualGraded(a.question_type) && a.points_awarded !== undefined)
    .reduce((sum, a) => sum + (a.points_awarded || 0), 0);

  const totalScore = autoGradedScore + manualGradedScore;
  const maxScore = attempt.max_score || quiz.points || 100;

  // Check if any answers still need grading
  const hasPendingGrading = sortedAnswers.some((a) => a.needs_manual_grading);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-8 py-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => router.push(`/quizzes/${quizId}`)}
              className="flex items-center gap-2 text-gray-500 hover:text-navy-600 mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Quiz
            </button>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-6 h-6 text-navy-600" />
                  <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy-900">Grade Quiz Submission</h1>
                </div>
                <p className="text-gray-600">{quiz.title}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Questions */}
          <div className="xl:col-span-8 space-y-6">
            {/* Student Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="font-display font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-navy-600" /> Student Information
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center">
                  <span className="text-navy-700 font-semibold text-lg">
                    {(attempt.student_name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-navy-800 text-lg">{attempt.student_name || 'Unknown Student'}</p>
                  <p className="text-sm text-gray-500">{attempt.student_email}</p>
                </div>
              </div>
            </motion.div>

            {/* Manual Grading Notice */}
            {attempt.pending_manual_grading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Manual Grading Required</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Some questions require manual grading. Please review and assign scores for essay and multi-select questions below.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Questions List */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="font-display font-semibold text-navy-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-navy-600" /> Questions
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {sortedAnswers.map((answer, index) => {
                  const questionNum = index + 1;
                  const isAuto = isAutoGraded(answer.question_type);
                  const isManual = isManualGraded(answer.question_type);
                  const isCorrect = answer.is_correct === true;
                  const isIncorrect = answer.is_correct === false;
                  const needsGrading = answer.needs_manual_grading;
                  const currentScore = answerScores[answer.answer_id] ?? String(answer.points_awarded ?? 0);
                  const isSaving = savingAnswers.has(answer.answer_id);

                  return (
                    <div
                      key={answer.answer_id}
                      className={cn(
                        'p-6 transition-colors',
                        isAuto && isCorrect && 'bg-green-50 border-l-4 border-l-green-400',
                        isAuto && isIncorrect && 'bg-red-50 border-l-4 border-l-red-400',
                        isManual && needsGrading && 'bg-amber-50 border-l-4 border-l-amber-400',
                        isManual && !needsGrading && 'bg-slate-50 border-l-4 border-l-slate-300'
                      )}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-navy-700">Question {questionNum}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                              {answer.question_type.replace('_', ' ')}
                            </span>
                            {isManual && needsGrading && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                Needs Grading
                              </span>
                            )}
                          </div>
                          <div
                            className="prose prose-slate prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: answer.question_text }}
                          />
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-gray-500">Points</p>
                          <p className="font-semibold text-navy-800">{answer.points}</p>
                        </div>
                      </div>

                      {/* Student Answer */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Student Answer</p>
                        {answer.question_type === 'essay' ? (
                          <div className="prose prose-sm max-w-none text-gray-700">
                            {answer.text_answer ? (
                              <div dangerouslySetInnerHTML={{ __html: answer.text_answer }} />
                            ) : (
                              <p className="text-gray-400 italic">No answer provided</p>
                            )}
                          </div>
                        ) : answer.question_type === 'multi_select' ? (
                          <div className="text-gray-700">
                            {answer.selected_choice_text ? (
                              <p>{answer.selected_choice_text}</p>
                            ) : (
                              <p className="text-gray-400 italic">No selections made</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : isIncorrect ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : null}
                            <p className={cn(
                              'font-medium',
                              isCorrect && 'text-green-700',
                              isIncorrect && 'text-red-700',
                              !isCorrect && !isIncorrect && 'text-gray-700'
                            )}>
                              {answer.selected_choice_text || answer.text_answer || 'No answer'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Grading Section */}
                      {isAuto ? (
                        /* Auto-graded - Show result */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Correct</span>
                              </>
                            ) : isIncorrect ? (
                              <>
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-medium text-red-700">Incorrect</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">Auto-graded</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-lg font-semibold',
                              isCorrect ? 'text-green-600' : isIncorrect ? 'text-red-600' : 'text-gray-600'
                            )}>
                              {answer.points_awarded ?? 0}
                            </span>
                            <span className="text-sm text-gray-500">/ {answer.points}</span>
                          </div>
                        </div>
                      ) : (
                        /* Manual grading - Show input */
                        <>
                          {gradingError?.answerId === answer.answer_id && (
                            <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              {gradingError.message}
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Score:</label>
                            <input
                              type="number"
                              min="0"
                              max={answer.points}
                              step="0.5"
                              value={currentScore}
                              onChange={(e) => {
                                setAnswerScores((prev) => ({
                                  ...prev,
                                  [answer.answer_id]: e.target.value,
                                }));
                              }}
                              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none text-sm"
                            />
                            <span className="text-sm text-gray-500">/ {answer.points}</span>
                          </div>
                          <button
                            onClick={() => handleGradeAnswer(answer.answer_id, answer.points)}
                            disabled={isSaving || currentScore === '' || parseFloat(currentScore) < 0 || parseFloat(currentScore) > answer.points}
                            className={cn(
                              'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                              needsGrading
                                ? 'bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-300'
                                : 'bg-navy-600 text-white hover:bg-navy-700 disabled:bg-navy-300'
                            )}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                {answer.points_awarded !== undefined ? 'Update' : 'Save'}
                              </>
                            )}
                          </button>
                        </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Score Summary */}
          <div className="xl:col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4"
            >
              <h2 className="font-display font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-navy-600" /> Score Summary
              </h2>

              {/* Submission Info */}
              <div className="mb-6 space-y-3">
                {attempt.attempt_number && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Attempt</span>
                    <span className="font-medium text-navy-800">#{attempt.attempt_number}</span>
                  </div>
                )}
                {attempt.submitted_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Submitted
                    </span>
                    <span className="font-medium text-navy-800">{formatDateTime(attempt.submitted_at)}</span>
                  </div>
                )}
                {attempt.time_taken_seconds && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Time Taken</span>
                    <span className="font-medium text-navy-800">{Math.round(attempt.time_taken_seconds / 60)} min</span>
                  </div>
                )}
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Auto-graded</span>
                  <span className="font-semibold text-green-800">{autoGradedScore}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="text-sm text-amber-700">Manual graded</span>
                  <span className="font-semibold text-amber-800">{manualGradedScore}</span>
                </div>
              </div>

              {/* Total Score */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Score</span>
                  <span className={cn(
                    'text-2xl font-bold',
                    hasPendingGrading ? 'text-amber-600' : 'text-navy-800'
                  )}>
                    {totalScore.toFixed(1)} / {maxScore}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={cn(
                      'h-2.5 rounded-full transition-all duration-300',
                      hasPendingGrading ? 'bg-amber-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min((totalScore / maxScore) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {((totalScore / maxScore) * 100).toFixed(1)}%
                </p>
              </div>

              {/* Pending Notice */}
              {hasPendingGrading && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Some questions still need grading
                  </p>
                </div>
              )}

              {/* Back Button */}
              <button
                onClick={() => router.push(`/quizzes/${quizId}`)}
                className="w-full mt-6 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-gray-700"
              >
                Back to Quiz
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}