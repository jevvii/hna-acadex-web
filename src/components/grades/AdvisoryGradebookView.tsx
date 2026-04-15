'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Send,
  RotateCcw,
  AlertTriangle,
  Users,
  BookOpen,
  Search,
  Filter,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { gradingApi } from '@/lib/api';
import type {
  AdvisoryGradeData,
  AdvisorySubmissionStatus,
  AdvisoryReportCardStatus,
} from '@/lib/types';
import { formatGrade } from '@/lib/gradeUtils';
import { cn } from '@/lib/utils';
import {
  StudentGradeCard,
  SubjectSubmissionPanel,
  ReportCardPublicationPanel,
} from './';

const EMPTY_STUDENTS: AdvisoryGradeData['students'] = [];
const EMPTY_PERIODS: AdvisoryGradeData['periods'] = [];
const EMPTY_SUBMISSION_STATUSES: AdvisoryGradeData['submission_status'] = [];
const EMPTY_REPORT_CARD_STATUSES: AdvisoryGradeData['report_card_status'] = [];

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-navy-600" />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-gray-500"
    >
      <AlertTriangle className="w-12 h-12 mb-3" />
      <p>{message}</p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700"
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stats Bar Component
// ---------------------------------------------------------------------------

function StatsBar({
  students,
  submissionStatuses,
}: {
  students: AdvisoryGradeData['students'];
  submissionStatuses: AdvisorySubmissionStatus[];
}) {
  // Calculate stats
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const atRiskCount = students.filter((s) =>
      s.subjects.some(
        (sub) => sub.final_grade !== null && sub.final_grade < 75
      )
    ).length;

    const totalPeriods = submissionStatuses.reduce(
      (acc, subject) => acc + subject.periods.length,
      0
    );
    const submittedPeriods = submissionStatuses.reduce(
      (acc, subject) =>
        acc +
        subject.periods.filter(
          (p) => p.status === 'submitted' || p.status === 'published'
        ).length,
      0
    );

    const validAverages = students
      .map((s) => s.final_average)
      .filter((avg): avg is number => avg !== null);
    const classAverage =
      validAverages.length > 0
        ? validAverages.reduce((a, b) => a + b, 0) / validAverages.length
        : null;

    return {
      totalStudents,
      atRiskCount,
      submissionProgress: totalPeriods > 0 ? submittedPeriods : 0,
      totalPeriods,
      classAverage,
    };
  }, [students, submissionStatuses]);

  const statItems = [
    {
      icon: Users,
      value: stats.totalStudents,
      label: 'Students',
      color: 'text-navy-900',
      bgColor: 'bg-navy-50',
      iconColor: 'text-navy-600',
    },
    {
      icon: AlertTriangle,
      value: stats.atRiskCount,
      label: 'At Risk',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      icon: BookOpen,
      value: `${stats.submissionProgress}/${stats.totalPeriods}`,
      label: 'Submitted',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      icon: RotateCcw,
      value: formatGrade(stats.classAverage),
      label: 'Class Average',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100"
    >
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
          className="flex items-center gap-3"
        >
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              stat.bgColor
            )}
          >
            <stat.icon className={cn('w-5 h-5', stat.iconColor)} />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Student Filters Component
// ---------------------------------------------------------------------------

function StudentFilters({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  filterSubject,
  onFilterSubjectChange,
  subjects,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  filterSubject: string;
  onFilterSubjectChange: (value: string) => void;
  subjects: { subject_id: string; subject_code: string }[];
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent w-full sm:w-64"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 appearance-none cursor-pointer"
          >
            <option value="all">All Students</option>
            <option value="at-risk">At Risk</option>
            <option value="honors">Honor Students</option>
            <option value="pending">Pending Grades</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="relative">
          <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={filterSubject}
            onChange={(e) => onFilterSubjectChange(e.target.value)}
            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 appearance-none cursor-pointer"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>
                {subject.subject_code}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdvisoryGradebookView({
  sectionId,
}: {
  sectionId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'publish' | 'unpublish';
    periodId: string;
    periodLabel: string;
  } | null>(null);

  const { data, isPending, error, refetch } = useQuery<AdvisoryGradeData>({
    queryKey: ['advisoryGrades', sectionId],
    queryFn: () => gradingApi.getAdvisoryGrades(sectionId),
    enabled: !!sectionId,
  });

  const publishMutation = useMutation({
    mutationFn: ({ periodId }: { periodId: string }) =>
      gradingApi.publishReportCard(sectionId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['advisoryGrades', sectionId],
      });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      alert(`Failed to publish report card: ${err.message}`);
      setConfirmAction(null);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: ({ periodId }: { periodId: string }) =>
      gradingApi.unpublishReportCard(sectionId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['advisoryGrades', sectionId],
      });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      alert(`Failed to unpublish report card: ${err.message}`);
      setConfirmAction(null);
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({
      entryId,
      score,
    }: {
      entryId: string;
      score: number | null;
    }) => gradingApi.adviserOverrideGrade(entryId, score),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['advisoryGrades', sectionId],
      });
    },
    onError: (err: Error) => {
      alert(`Failed to override grade: ${err.message}`);
    },
  });

  const reminderMutation = useMutation({
    mutationFn: ({ subjectId }: { subjectId?: string }) =>
      gradingApi.sendAdvisorySubjectReminders(sectionId, subjectId),
    onSuccess: (result, variables) => {
      if (result.sent_count > 0) {
        alert(
          variables.subjectId
            ? `Reminder sent to subject teacher. (${result.sent_count})`
            : `Reminders sent to ${result.sent_count} subject teacher(s).`
        );
      } else {
        alert('No pending subject submissions to remind.');
      }
    },
    onError: (err: Error) => {
      alert(`Failed to send reminder: ${err.message}`);
    },
  });

  const students = data?.students ?? EMPTY_STUDENTS;
  const periods = data?.periods ?? EMPTY_PERIODS;
  const submissionStatuses = data?.submission_status ?? EMPTY_SUBMISSION_STATUSES;
  const reportCardStatuses = data?.report_card_status ?? EMPTY_REPORT_CARD_STATUSES;
  const subjects = students[0]?.subjects || [];

  // Keep hooks unconditional across loading/error states.
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search filter
      if (
        searchQuery &&
        !student.student_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        const hasGrades = student.subjects.some((s) =>
          s.periods.some((p) => p.score !== null)
        );
        const hasAtRisk = student.subjects.some(
          (s) => s.final_grade !== null && s.final_grade < 75
        );
        const isHonors =
          student.final_average !== null && student.final_average >= 90;

        if (filterStatus === 'pending' && hasGrades) return false;
        if (filterStatus === 'at-risk' && !hasAtRisk) return false;
        if (filterStatus === 'honors' && !isHonors) return false;
      }

      // Subject filter
      if (filterSubject !== 'all') {
        const hasSubject = student.subjects.some(
          (s) => s.subject_id === filterSubject
        );
        if (!hasSubject) return false;
      }

      return true;
    });
  }, [students, searchQuery, filterStatus, filterSubject]);

  if (isPending) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        message="Failed to load advisory grades"
        onRetry={() => refetch()}
      />
    );

  const reportCardMap = new Map<string, AdvisoryReportCardStatus>();
  reportCardStatuses.forEach((r) =>
    reportCardMap.set(r.grading_period_id, r)
  );

  const isPeriodPublished = (periodId: string): boolean =>
    reportCardMap.get(periodId)?.is_published ?? false;

  const isAnyMutationPending =
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    overrideMutation.isPending ||
    reminderMutation.isPending;

  if (periods.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-card p-8 text-center"
      >
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No grading periods configured.</p>
        <p className="text-sm text-gray-400 mt-2">
          Contact your administrator to set up grading periods.
        </p>
      </motion.div>
    );
  }

  if (students.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-card p-8 text-center"
      >
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No students in this advisory section.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-card p-6 relative overflow-hidden"
      >
        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-14 h-14 bg-gradient-to-br from-navy-700 to-navy-900 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Users className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h2 className="font-display text-2xl font-bold text-navy-900">
                  {data?.section_name}
                </h2>
                <p className="text-slate-500">
                  {data?.grade_level} — {data?.strand}{' '}
                  <span className="mx-2 text-slate-300">|</span>{' '}
                  {data?.school_year}
                </p>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
              <span className="text-sm font-medium text-green-700">Active</span>
            </motion.div>
          </div>

          {/* Stats Bar */}
          <StatsBar
            students={students}
            submissionStatuses={submissionStatuses}
          />
        </div>
      </motion.div>

      {/* Subject Submission Panel */}
      <SubjectSubmissionPanel
        subjects={submissionStatuses}
        onViewGrades={(subjectId) => {
          router.push(`/courses/${subjectId}`);
        }}
        onSendReminder={(subjectId) => {
          if (!reminderMutation.isPending) {
            reminderMutation.mutate({ subjectId });
          }
        }}
        onSendReminderToAll={() => {
          if (!reminderMutation.isPending) {
            reminderMutation.mutate({});
          }
        }}
      />

      {/* Report Card Publication Panel */}
      <ReportCardPublicationPanel
        periods={reportCardStatuses}
        submissionStatuses={submissionStatuses}
        onPublish={(periodId) => {
          const period = reportCardStatuses.find(
            (p) => p.grading_period_id === periodId
          );
          if (period) {
            setConfirmAction({
              type: 'publish',
              periodId,
              periodLabel: period.period_label,
            });
          }
        }}
        onUnpublish={(periodId) => {
          const period = reportCardStatuses.find(
            (p) => p.grading_period_id === periodId
          );
          if (period) {
            setConfirmAction({
              type: 'unpublish',
              periodId,
              periodLabel: period.period_label,
            });
          }
        }}
        isPublishPending={publishMutation.isPending}
        isUnpublishPending={unpublishMutation.isPending}
      />

      {/* Student Grade List */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <motion.h3
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display text-xl font-bold text-navy-900 flex items-center gap-2"
          >
            <Users className="w-5 h-5 text-navy-600" />
            Student Grades
          </motion.h3>
          <StudentFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            filterSubject={filterSubject}
            onFilterSubjectChange={setFilterSubject}
            subjects={subjects.map((s) => ({
              subject_id: s.subject_id,
              subject_code: s.subject_code,
            }))}
          />
        </div>

        {/* Student Cards */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.student_id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <StudentGradeCard
                  student={student}
                  periods={periods.map((p) => ({
                    id: p.id,
                    label: p.label,
                  }))}
                  isPeriodPublished={isPeriodPublished}
                  onOverrideGrade={(entryId, score) => {
                    overrideMutation.mutate({ entryId, score });
                  }}
                  isAnyMutationPending={isAnyMutationPending}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredStudents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-slate-500"
          >
            <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No students match your filters.</p>
          </motion.div>
        )}
      </section>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setConfirmAction(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                {confirmAction.type === 'publish' ? (
                  <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
                    <Send className="w-5 h-5 text-navy-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl font-bold text-navy-900">
                    {confirmAction.type === 'publish'
                      ? 'Publish Report Card'
                      : 'Unpublish Report Card'}
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-slate-600">
                  {confirmAction.type === 'publish'
                    ? `Publish ${confirmAction.periodLabel} report card? Students will be able to see their ${confirmAction.periodLabel} grades immediately.`
                    : `Unpublish ${confirmAction.periodLabel} report card? Students will no longer see their ${confirmAction.periodLabel} grades.`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (confirmAction.type === 'publish') {
                      publishMutation.mutate({
                        periodId: confirmAction.periodId,
                      });
                    } else {
                      unpublishMutation.mutate({
                        periodId: confirmAction.periodId,
                      });
                    }
                  }}
                  disabled={isAnyMutationPending}
                  className={cn(
                    'px-4 py-2 text-white rounded-lg text-sm font-medium',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    confirmAction.type === 'unpublish'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-navy-600 hover:bg-navy-700'
                  )}
                >
                  {isAnyMutationPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : confirmAction.type === 'publish' ? (
                    'Publish'
                  ) : (
                    'Unpublish'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdvisoryGradebookView;
