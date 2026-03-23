'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoursesStore } from '@/store/courses';
import { useIsStudent, useIsTeacher } from '@/store/auth';
import { cn, getInitials } from '@/lib/utils';
import {
  coursesApi,
  attendanceApi,
  gradesApi,
} from '@/lib/api';
import {
  WeeklyModule,
  ModuleItem,
  Activity,
  Quiz,
  CourseFile,
  Announcement,
  AttendanceRecord,
  MeetingSession,
  GradebookData,
} from '@/lib/types';
import {
  BookOpen,
  FileText,
  ClipboardCheck,
  FolderOpen,
  Megaphone,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Eye,
  Layers,
  CheckSquare,
  HelpCircle,
  User,
} from 'lucide-react';

const tabs = [
  { id: 'modules', label: 'Modules', icon: BookOpen },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'quizzes', label: 'Quizzes', icon: ClipboardCheck },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'attendance', label: 'Attendance', icon: Users },
  { id: 'grades', label: 'Grades', icon: TrendingUp },
];

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'No date';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <AlertCircle className="w-12 h-12 mb-3" />
      <p>{message}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
        <FolderOpen className="w-8 h-8 text-gray-400" />
      </div>
      <p>{message}</p>
    </div>
  );
}

// Modules Tab
function ModulesTab({
  modules,
  activities,
  quizzes,
  files
}: {
  modules: WeeklyModule[];
  activities: Activity[];
  quizzes: Quiz[];
  files: CourseFile[];
}) {
  const router = useRouter();
  // Track which modules are expanded - all expanded by default when modules load
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Expand all modules when data loads
  useEffect(() => {
    if (modules?.length) {
      setExpandedModules(new Set(modules.map(m => m.id)));
    }
  }, [modules]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Get activity icon config based on status
  const getActivityConfig = (activity: Activity) => {
    const submission = activity.my_submission;
    const isLate = activity.deadline && new Date(activity.deadline) < new Date() && !submission;

    if (!submission) {
      return {
        iconColor: isLate ? 'text-red-500' : 'text-amber-500',
        iconBg: isLate ? 'bg-red-50' : 'bg-amber-50',
        status: isLate ? 'late' : 'not-started',
      };
    }

    switch (submission.status) {
      case 'graded':
        return { iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50', status: 'graded' };
      case 'submitted':
        return { iconColor: 'text-blue-500', iconBg: 'bg-blue-50', status: 'submitted' };
      case 'late':
        return { iconColor: 'text-red-500', iconBg: 'bg-red-50', status: 'late-submitted' };
      default:
        return { iconColor: 'text-amber-500', iconBg: 'bg-amber-50', status: 'not-started' };
    }
  };

  // Get quiz icon config based on status
  const getQuizConfig = (quiz: Quiz) => {
    const now = new Date();
    const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
    const closeAt = quiz.close_at ? new Date(quiz.close_at) : null;

    if (closeAt && now > closeAt) {
      return { iconColor: 'text-gray-500', iconBg: 'bg-gray-100', status: 'closed' };
    }

    if (openAt && now < openAt) {
      return { iconColor: 'text-amber-500', iconBg: 'bg-amber-50', status: 'not-open' };
    }

    if (quiz.my_attempt?.is_submitted) {
      return { iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50', status: 'completed' };
    }

    if (quiz.my_in_progress_attempt) {
      return { iconColor: 'text-blue-500', iconBg: 'bg-blue-50', status: 'in-progress' };
    }

    return { iconColor: 'text-navy-600', iconBg: 'bg-navy-50', status: 'available' };
  };

  if (!modules?.length) return <EmptyState message="No modules available" />;

  return (
    <div className="space-y-5">
      {modules.map((module) => {
        // Derive module items from activities, quizzes, and files that belong to this module
        const modActivities = activities.filter((a) => a.weekly_module_id === module.id);
        const modQuizzes = quizzes.filter((q) => q.weekly_module_id === module.id);
        const modFiles = files.filter((f) => f.weekly_module_id === module.id);

        // Combine all items with their type and status config for display
        const moduleItems = [
          ...modActivities.map((a) => {
            const config = getActivityConfig(a);
            return {
              id: a.id,
              type: 'activity' as const,
              title: a.title,
              meta: a.deadline ? `Due ${formatDate(a.deadline)}` : 'No due date',
              published: a.is_published,
              iconColor: config.iconColor,
              iconBg: config.iconBg,
              status: config.status,
            };
          }),
          ...modQuizzes.map((q) => {
            const config = getQuizConfig(q);
            return {
              id: q.id,
              type: 'quiz' as const,
              title: q.title,
              meta: q.time_limit_minutes ? `${q.time_limit_minutes} min` : `${q.question_count || 0} questions`,
              published: q.is_published,
              iconColor: config.iconColor,
              iconBg: config.iconBg,
              status: config.status,
              openAt: q.open_at,
              closeAt: q.close_at,
            };
          }),
          ...modFiles.map((f) => ({
            id: f.id,
            type: 'file' as const,
            title: f.file_name,
            meta: formatFileSize(f.file_size_bytes),
            published: f.is_visible,
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-50',
            status: 'file',
          })),
        ];

        const itemCount = moduleItems.length;
        const lastUpdated = module.updated_at
          ? new Date(module.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Recently';

        return (
          <div key={module.id} className="bg-white rounded-2xl shadow-card overflow-hidden flex flex-col">
            {/* Module Header */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-navy-600 flex items-center justify-center shadow-sm">
                  <span className="font-display font-bold text-white text-sm">
                    {module.is_exam_week ? 'EX' : `W${module.week_number}`}
                  </span>
                </div>
                <div className="text-left">
                  <h3 className="font-display font-semibold text-navy-800 text-base">{module.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'} • Updated {lastUpdated}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {module.is_exam_week && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 uppercase tracking-wide">
                    Exam Week
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-gray-400 transition-transform duration-200',
                    expandedModules.has(module.id) && 'rotate-180'
                  )}
                />
              </div>
            </button>

            {/* Module Items */}
            <AnimatePresence initial={false}>
              {expandedModules.has(module.id) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden flex-1"
                >
                  <div className="p-3 space-y-1">
                    {moduleItems.length > 0 ? (
                      moduleItems.map((item, index) => (
                        <motion.div
                          key={`${item.type}-${item.id}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => {
                            if (item.type === 'activity') {
                              router.push(`/activities/${item.id}`);
                            } else if (item.type === 'quiz') {
                              if (item.status !== 'not-open') {
                                router.push(`/quizzes/${item.id}`);
                              }
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors",
                            (item.type === 'activity' || (item.type === 'quiz' && item.status !== 'not-open')) && "cursor-pointer",
                            item.type === 'quiz' && item.status === 'not-open' && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', item.iconBg)}>
                            {item.type === 'file' && <FolderOpen className={cn('w-4.5 h-4.5', item.iconColor)} />}
                            {item.type === 'activity' && <FileText className={cn('w-4.5 h-4.5', item.iconColor)} />}
                            {item.type === 'quiz' && <ClipboardCheck className={cn('w-4.5 h-4.5', item.iconColor)} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-navy-800 truncate">{item.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{item.meta}</div>
                          </div>
                          <div className="flex-shrink-0">
                            {/* Status indicators */}
                            {item.type === 'activity' && item.status === 'graded' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Graded
                              </span>
                            )}
                            {item.type === 'activity' && item.status === 'submitted' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Submitted
                              </span>
                            )}
                            {item.type === 'activity' && item.status === 'not-started' && (
                              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Not Started</span>
                            )}
                            {item.type === 'activity' && item.status === 'late' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </span>
                            )}
                            {item.type === 'quiz' && item.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Completed
                              </span>
                            )}
                            {item.type === 'quiz' && item.status === 'in-progress' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> In Progress
                              </span>
                            )}
                            {item.type === 'quiz' && item.status === 'not-open' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            )}
                            {item.type === 'quiz' && item.status === 'closed' && (
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Closed</span>
                            )}
                            {!item.published && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Draft</span>
                            )}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No items in this module</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// Assignments Tab
function AssignmentsTab({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  const getAssignmentConfig = (activity: Activity) => {
    const submission = activity.my_submission;
    const isLate = activity.deadline && new Date(activity.deadline) < new Date() && !submission;

    if (!submission) {
      return {
        status: isLate ? 'late' : 'not-started',
        badge: isLate ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-3.5 h-3.5" />
            Overdue
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Not Started
          </span>
        ),
        iconBg: isLate ? 'bg-amber-100' : 'bg-gray-100',
        iconColor: isLate ? 'text-amber-600' : 'text-gray-500',
        barColor: isLate ? 'bg-amber-500' : 'bg-gray-300',
        buttonText: isLate ? 'Submit Now' : 'Start Assignment',
        buttonVariant: 'btn-primary' as const,
        buttonDisabled: false,
        pointsColor: isLate ? 'text-amber-600' : 'text-navy-800',
      };
    }

    switch (submission.status) {
      case 'graded':
        return {
          status: 'graded',
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle className="w-3.5 h-3.5" />
              Graded
            </span>
          ),
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          barColor: 'bg-emerald-500',
          buttonText: 'View Feedback',
          buttonVariant: 'btn-secondary' as const,
          buttonDisabled: false,
          pointsColor: 'text-emerald-600',
        };
      case 'submitted':
        return {
          status: 'submitted',
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
              <CheckCircle className="w-3.5 h-3.5" />
              Submitted
            </span>
          ),
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          barColor: 'bg-blue-500',
          buttonText: 'View Submission',
          buttonVariant: 'btn-secondary' as const,
          buttonDisabled: false,
          pointsColor: 'text-navy-800',
        };
      case 'late':
        return {
          status: 'late-submitted',
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
              <Clock className="w-3.5 h-3.5" />
              Submitted Late
            </span>
          ),
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          barColor: 'bg-blue-500',
          buttonText: 'View Submission',
          buttonVariant: 'btn-secondary' as const,
          buttonDisabled: false,
          pointsColor: 'text-navy-800',
        };
      default:
        return {
          status: 'not-started',
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
              Not Started
            </span>
          ),
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-500',
          barColor: 'bg-gray-300',
          buttonText: 'Start Assignment',
          buttonVariant: 'btn-primary' as const,
          buttonDisabled: false,
          pointsColor: 'text-navy-800',
        };
    }
  };

  const assignments = activities?.filter((a) => a.is_published) || [];

  // Filter assignments based on selected tab
  const filteredAssignments = assignments.filter((activity) => {
    const config = getAssignmentConfig(activity);
    if (filter === 'all') return true;
    if (filter === 'pending') return config.status === 'not-started' || config.status === 'late';
    if (filter === 'submitted') return config.status === 'submitted' || config.status === 'late-submitted';
    if (filter === 'graded') return config.status === 'graded';
    return true;
  });

  // Get counts for filter tabs
  const counts = {
    all: assignments.length,
    pending: assignments.filter(a => {
      const config = getAssignmentConfig(a);
      return config.status === 'not-started' || config.status === 'late';
    }).length,
    submitted: assignments.filter(a => {
      const config = getAssignmentConfig(a);
      return config.status === 'submitted' || config.status === 'late-submitted';
    }).length,
    graded: assignments.filter(a => {
      const config = getAssignmentConfig(a);
      return config.status === 'graded';
    }).length,
  };

  if (!assignments.length) return <EmptyState message="No assignments available" />;

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-3">
        {[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending' },
          { id: 'submitted', label: 'Submitted' },
          { id: 'graded', label: 'Graded' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as typeof filter)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              filter === tab.id
                ? 'bg-navy-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
              )}
            >
              {counts[tab.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Assignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredAssignments.map((activity: Activity) => {
          const config = getAssignmentConfig(activity);
          const submission = activity.my_submission;
          const isOverdue = activity.deadline && new Date(activity.deadline) < new Date() && !submission;

          return (
            <div
              key={activity.id}
              className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden group cursor-pointer"
              onClick={() => router.push(`/activities/${activity.id}`)}
            >
              {/* Status Bar */}
              <div className={cn('h-1.5 w-full', config.barColor)} />

              <div className="p-6">
                {/* Header - Icon + Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={cn('w-11 h-11 rounded-full flex items-center justify-center', config.iconBg)}>
                    <FileText className={cn('w-5 h-5', config.iconColor)} />
                  </div>
                  {config.badge}
                </div>

                {/* Title */}
                <h3 className="font-display font-semibold text-xl text-navy-800 mb-2" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {activity.title}
                </h3>

                {/* Description */}
                {activity.instructions && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    {activity.instructions}
                  </p>
                )}

                {/* Meta Row */}
                <div className="flex items-center gap-6 mb-5">
                  <div className={cn('flex items-center gap-2 text-sm', isOverdue ? 'text-amber-600' : 'text-gray-500')}>
                    <Calendar className={cn('w-4 h-4', isOverdue ? 'text-amber-500' : 'text-gray-400')} />
                    <span>
                      {activity.deadline ? (
                        isOverdue ? `Due ${formatDate(activity.deadline)}` : `Due ${formatDate(activity.deadline)}`
                      ) : (
                        'No due date'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span>{activity.points} points</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm font-semibold', config.pointsColor)}>
                    {submission?.status === 'graded'
                      ? `${submission.score}/${activity.points}`
                      : submission?.status === 'submitted' || submission?.status === 'late'
                      ? 'Pending Grade'
                      : `${activity.points} pts`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/activities/${activity.id}`);
                    }}
                    className={cn(
                      'text-sm font-medium transition-colors duration-200',
                      config.buttonVariant === 'btn-primary'
                        ? 'text-navy-600 hover:text-navy-700'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {config.buttonText} →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-display font-semibold text-lg text-navy-800 mb-1">
            No {filter === 'all' ? '' : filter} assignments
          </h3>
          <p className="text-gray-500">
            {filter === 'pending' ? 'All caught up! No pending assignments.' :
             filter === 'submitted' ? 'No submissions yet.' :
             filter === 'graded' ? 'No graded assignments yet.' :
             'No assignments available.'}
          </p>
        </div>
      )}
    </div>
  );
}

// Quizzes Tab
function QuizzesTab({ quizzes }: { quizzes: Quiz[] }) {
  const router = useRouter();

  const getQuizConfig = (quiz: Quiz) => {
    const now = new Date();
    const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
    const closeAt = quiz.close_at ? new Date(quiz.close_at) : null;

    // Check quiz status
    if (closeAt && now > closeAt) {
      return {
        status: 'closed',
        iconBg: 'bg-gray-100',
        icon: Lock,
        iconColor: 'text-gray-400',
        badge: null,
        badgeColor: '',
        buttonText: 'Locked',
        canClick: false,
      };
    }

    if (openAt && now < openAt) {
      return {
        status: 'not-open',
        iconBg: 'bg-gray-100',
        icon: Lock,
        iconColor: 'text-gray-400',
        badge: null,
        badgeColor: '',
        buttonText: 'Locked',
        canClick: false,
        openDate: quiz.open_at,
      };
    }

    if (quiz.my_attempt?.is_submitted) {
      const percentage = Math.round((quiz.my_attempt.score / quiz.my_attempt.max_score) * 100);
      return {
        status: 'completed',
        iconBg: 'bg-emerald-500',
        icon: CheckCircle,
        iconColor: 'text-white',
        badge: 'Completed',
        badgeColor: 'bg-emerald-50 text-emerald-600',
        score: percentage,
        scoreLabel: `${quiz.my_attempt.score}/${quiz.my_attempt.max_score}`,
        buttonText: 'Review',
        canClick: true,
        submittedDate: quiz.my_attempt.submitted_at,
        bestOf: quiz.attempt_limit > 1 ? `Best of ${quiz.attempt_limit}` : null,
      };
    }

    if (quiz.my_in_progress_attempt) {
      return {
        status: 'in-progress',
        iconBg: 'bg-navy-600',
        icon: Play,
        iconColor: 'text-white',
        badge: 'In Progress',
        badgeColor: 'bg-blue-50 text-blue-600',
        buttonText: 'Resume',
        canClick: true,
      };
    }

    const attemptsRemaining = quiz.attempt_limit - (quiz.my_attempt?.attempts_used || 0);
    return {
      status: 'available',
      iconBg: 'bg-navy-600',
      icon: HelpCircle,
      iconColor: 'text-white',
      badge: null,
      badgeColor: '',
      buttonText: 'Start Quiz',
      canClick: true,
      attemptsRemaining,
    };
  };

  const publishedQuizzes = quizzes?.filter((q) => q.is_published) || [];
  if (!publishedQuizzes.length) return <EmptyState message="No quizzes available" />;

  return (
    <div className="space-y-5">
      {publishedQuizzes.map((quiz) => {
        const config = getQuizConfig(quiz);
        const Icon = config.icon;
        const attemptsRemaining = quiz.attempt_limit - (quiz.my_attempt?.attempts_used || 0);
        const isCompleted = config.status === 'completed';

        return (
          <div
            key={quiz.id}
            className={cn(
              "flex items-center gap-5 p-6 bg-white rounded-2xl shadow-card transition-all duration-200",
              config.canClick ? "hover:shadow-card-hover" : "opacity-75"
            )}
          >
            {/* Quiz Icon */}
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
              config.iconBg
            )}>
              <Icon className={cn('w-6 h-6', config.iconColor)} />
            </div>

            {/* Quiz Content */}
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-display font-semibold text-lg",
                config.status === 'not-open' || config.status === 'closed' ? 'text-gray-500' : 'text-navy-800'
              )}>
                {quiz.title}
              </h3>
              {quiz.instructions && (
                <p className={cn(
                  "text-sm mt-1 line-clamp-1",
                  config.status === 'not-open' || config.status === 'closed' ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {quiz.instructions}
                </p>
              )}
              <div className="flex items-center gap-5 mt-2.5 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {quiz.time_limit_minutes || 0} minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  {quiz.question_count || 0} questions
                </span>
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isCompleted
                    ? `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`
                    : `${quiz.attempt_limit} attempt${quiz.attempt_limit !== 1 ? 's' : ''} allowed`}
                </span>
                {isCompleted && quiz.my_attempt?.submitted_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Completed {formatDate(quiz.my_attempt.submitted_at)}
                  </span>
                )}
                {config.status === 'not-open' && quiz.open_at && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Lock className="w-3.5 h-3.5" />
                    Opens {formatDate(quiz.open_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Right Section: Status Badge + Score + Button */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Status Badge - only show if exists */}
              {config.badge && (
                <span className={cn('px-3 py-1 rounded-full text-xs font-medium', config.badgeColor)}>
                  {config.badge}
                </span>
              )}

              {/* Score Display for Completed */}
              {isCompleted && (
                <div className="flex items-center gap-4">
                  <div className="text-right pr-4 border-r border-gray-200">
                    <div className={cn(
                      'text-3xl font-bold leading-none',
                      config.score! >= 90 ? 'text-emerald-500' :
                      config.score! >= 80 ? 'text-blue-500' :
                      config.score! >= 70 ? 'text-amber-500' : 'text-red-500'
                    )}>
                      {config.score}%
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Score</div>
                    <div className="text-xs text-gray-500 mt-0.5">{config.scoreLabel} correct</div>
                    {config.bestOf && (
                      <div className="text-xs text-gray-400 mt-0.5">{config.bestOf}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {config.status !== 'not-open' && config.status !== 'closed' && (
                <button
                  onClick={() => {
                    if (config.status === 'in-progress' && quiz.my_in_progress_attempt) {
                      router.push(`/quizzes/${quiz.id}/take?attempt=${quiz.my_in_progress_attempt.attempt_id}`);
                    } else {
                      router.push(`/quizzes/${quiz.id}`);
                    }
                  }}
                  className={cn(
                    'px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    isCompleted
                      ? 'bg-slate-100 text-navy-700 hover:bg-slate-200'
                      : 'bg-navy-600 text-white hover:bg-navy-700'
                  )}
                >
                  {config.buttonText}
                </button>
              )}

              {/* Locked indicator */}
              {(config.status === 'not-open' || config.status === 'closed') && (
                <span className="text-sm text-gray-400 font-medium">{config.buttonText}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// Files Tab
function FilesTab({ files }: { files: CourseFile[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const getFileIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><span className="text-red-600 font-bold text-xs">PDF</span></div>;
      case 'pptx':
      case 'ppt':
        return <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><span className="text-orange-600 font-bold text-xs">PPT</span></div>;
      case 'docx':
      case 'doc':
        return <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><span className="text-blue-600 font-bold text-xs">DOC</span></div>;
      case 'xlsx':
      case 'xls':
        return <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><span className="text-green-600 font-bold text-xs">XLS</span></div>;
      default:
        return <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center"><span className="text-gray-600 font-bold text-xs">FILE</span></div>;
    }
  };

  const categories = ['All', 'Module', 'Assignment', 'Quiz', 'General'];

  const filteredFiles = categoryFilter === 'All'
    ? files
    : files?.filter((f) => f.category === categoryFilter.toLowerCase());

  if (!files?.length) return <EmptyState message="No files available" />;

  return (
    <div className="bg-white rounded-xl shadow-card">
      <div className="p-4 border-b border-gray-100">
        <div className="flex gap-2 flex-wrap">
          {categories.map((filter) => (
            <button
              key={filter}
              onClick={() => setCategoryFilter(filter)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                categoryFilter === filter
                  ? 'bg-navy-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {filteredFiles?.map((file: CourseFile) => (
          <div key={file.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
            {getFileIcon(file.file_type)}
            <div className="flex-1">
              <p className="font-medium text-navy-800">{file.file_name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.file_size_bytes)} • {formatDate(file.created_at)}</p>
            </div>
            <a
              href={file.file_url}
              download
              className="p-2 text-gray-400 hover:text-navy-600 transition-colors"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// Announcements Tab
function AnnouncementsTab({ announcements }: { announcements: Announcement[] }) {
  const sortedAnnouncements = announcements?.sort((a, b) => {
    // Pinned first, then by date
    if (a.is_published !== b.is_published) return Number(b.is_published) - Number(a.is_published);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) || [];

  if (!sortedAnnouncements.length) return <EmptyState message="No announcements yet" />;

  return (
    <div className="space-y-4">
      {sortedAnnouncements.map((announcement) => (
        <div key={announcement.id} className={cn(
          'bg-white rounded-xl shadow-card p-5',
          announcement.is_published && 'border-l-4 border-gold-500'
        )}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 font-semibold">
              {getInitials(announcement.created_by || 'Unknown')}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-navy-800">{announcement.title}</h3>
                {announcement.is_published && (
                  <span className="badge badge-gold text-xs">Pinned</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">
                {announcement.created_by || 'Unknown'} • {formatDate(announcement.created_at)}
              </p>
              <p className="text-gray-700">{announcement.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Attendance Tab
function AttendanceTab({ courseId }: { courseId: string }) {
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: meetings, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings', courseId],
    queryFn: () => attendanceApi.getMeetings(courseId),
    enabled: !!courseId,
  });

  const currentMeeting = meetings?.[0]; // Get first meeting for demo

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', currentMeeting?.id],
    queryFn: () => attendanceApi.getAttendance(currentMeeting!.id),
    enabled: !!currentMeeting?.id && isTeacher,
  });

  if (isStudent) {
    // Student view - show their attendance summary
    const presentCount = 18; // These would come from API
    const lateCount = 2;
    const absentCount = 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-card p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{presentCount}</p>
            <p className="text-sm text-gray-500">Present</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{lateCount}</p>
            <p className="text-sm text-gray-500">Late</p>
          </div>
          <div className="bg-white rounded-xl shadow-card p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{absentCount}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-display font-semibold text-navy-800">Attendance History</h3>
          </div>
          <EmptyState message="Attendance records will appear here" />
        </div>
      </div>
    );
  }

  // Teacher view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-display text-lg font-semibold">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <button
            onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button className="btn btn-primary">+ New Meeting</button>
      </div>

      {meetingsLoading ? (
        <LoadingState />
      ) : currentMeeting ? (
        <div className="bg-white rounded-xl shadow-card p-8">
          <h3 className="font-display font-semibold text-navy-800 mb-4">{currentMeeting.title}</h3>
          {attendanceLoading ? (
            <LoadingState />
          ) : (
            <EmptyState message="Select students to mark attendance" />
          )}
        </div>
      ) : (
        <EmptyState message="No meetings scheduled" />
      )}
    </div>
  );
}

// Grades Tab
function GradesTab({ courseId }: { courseId: string }) {
  const isStudent = useIsStudent();

  const { data: grades, isLoading, error } = useQuery({
    queryKey: ['grades', courseId],
    queryFn: () => gradesApi.getMyGrades(courseId),
    enabled: !!courseId && isStudent,
  });

  if (!isStudent) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">View the Gradebook to manage student grades</p>
      </div>
    );
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load grades" />;

  return (
    <div className="space-y-6">
      {/* Grade Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{grades?.current_grade || 'N/A'}</p>
          <p className="text-sm text-gray-500">Current Grade</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{grades?.class_average || 'N/A'}</p>
          <p className="text-sm text-gray-500">Class Average</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-3xl font-bold text-navy-600">{grades?.gpa || 'N/A'}</p>
          <p className="text-sm text-gray-500">GPA</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4 text-center">
          <p className="text-3xl font-bold text-navy-600">{grades?.completed || 'N/A'}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Item</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Type</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grades?.items?.map((item: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-navy-800">{item.title}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.type}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.due_date)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'font-semibold',
                    item.percentage >= 90 && 'text-green-600',
                    item.percentage >= 80 && item.percentage < 90 && 'text-blue-600',
                    item.percentage < 80 && 'text-yellow-600',
                  )}>
                    {item.score}
                  </span>
                </td>
              </tr>
            )) || (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No graded items yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CoursePage() {
  const params = useParams();
  const courseId = params.id as string;
  const [activeTab, setActiveTab] = useState('modules');
  const { courses, fetchCourses } = useCoursesStore();

  // Fetch course content (works for both students and teachers)
  const { data: courseDetail } = useQuery({
    queryKey: ['courseDetail', courseId],
    queryFn: () => coursesApi.getCourse(courseId),
    enabled: !!courseId,
  });

  const { data: content, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ['courseContent', courseId],
    queryFn: () => coursesApi.getCourseContent(courseId),
    enabled: !!courseId,
  });

  // Fetch courses if not loaded (safeguard for direct navigation)
  useEffect(() => {
    if (courses.length === 0) {
      fetchCourses();
    }
  }, [courses.length, fetchCourses]);

  // Find course metadata from the courses list for fallback
  const courseInfo = courses.find((c) => c.course_section_id === courseId);

  // Use course detail from API for complete metadata, fallback to store data
  const courseCode = courseDetail?.course?.code || courseInfo?.course_code || 'COURSE';
  const courseTitle = courseDetail?.course?.title || courseInfo?.course_title || 'Course Title';
  const sectionName = courseDetail?.section?.name || courseInfo?.section_name || 'SECTION';
  const teacherName = courseDetail?.teacher?.full_name || courseInfo?.teacher_name || 'Teacher';
  const gradeLevel = courseDetail?.section?.grade_level || courseInfo?.grade_level;
  const strand = courseDetail?.section?.strand || courseInfo?.strand;
  const studentCount = courseDetail?.student_count || courseInfo?.student_count;

  // Extract content from the API response
  const modules = content?.modules || [];
  const activities = content?.activities || [];
  const files = content?.files || [];
  const announcements = content?.announcements || [];
  const quizzes = content?.quizzes || [];

  const renderTabContent = () => {
    if (contentLoading) return <LoadingState />;
    if (contentError) return <ErrorState message="Failed to load course content" />;

    switch (activeTab) {
      case 'modules':
        return <ModulesTab modules={modules} activities={activities} quizzes={quizzes} files={files} />;
      case 'assignments':
        return <AssignmentsTab activities={activities} />;
      case 'quizzes':
        return <QuizzesTab quizzes={quizzes} />;
      case 'files':
        return <FilesTab files={files} />;
      case 'announcements':
        return <AnnouncementsTab announcements={announcements} />;
      case 'attendance':
        return <AttendanceTab courseId={courseId} />;
      case 'grades':
        return <GradesTab courseId={courseId} />;
      default:
        return <ModulesTab modules={modules} activities={activities} quizzes={quizzes} files={files} />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Course Header */}
      <div className="relative h-60 bg-gradient-to-r from-navy-600 to-green-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 mb-3">
              <span className="uppercase">{courseCode}</span>
              <span>@</span>
              <span className="uppercase">{sectionName}</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Crimson Pro', serif" }}>
              {courseTitle}
            </h1>
            <div className="flex items-center gap-6 text-sm text-white/90">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {teacherName}
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {courseDetail?.student_count ? `${courseDetail.student_count} Students` : courseInfo?.student_count ? `${courseInfo.student_count} Students` : 'Students'}
              </span>
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {gradeLevel} - {strand}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-navy-600 text-navy-600'
                      : 'border-transparent text-gray-500 hover:text-navy-600 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="px-8 pb-8 pt-6"
      >
        {renderTabContent()}
      </motion.div>
    </div>
  );
}
