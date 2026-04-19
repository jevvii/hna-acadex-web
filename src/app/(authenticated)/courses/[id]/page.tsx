'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { useCoursesStore } from '@/store/courses';
import { useIsStudent, useIsTeacher, useAuthStore } from '@/store/auth';
import { CreateActivityModal } from '@/components/modals/CreateActivityModal';
import { CreateQuizModal } from '@/components/modals/CreateQuizModal';
import { cn, getInitials, resolveFileUrl, toMediaProxyUrl } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  coursesApi,
  modulesApi,
  attendanceApi,
  gradesApi,
  activitiesApi,
  quizzesApi,
  filesApi,
  gradingApi,
  announcementsApi,
} from '@/lib/api';
import {
  WeeklyModule,
  ModuleItem,
  Activity,
  Quiz,
  CourseFile,
  Announcement,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceHistoryItem,
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
  ClipboardList,
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
  Plus,
  User,
  Award,
  X,
  Upload,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { TeacherGradesView } from '@/components/grades';

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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function getApplicableSubjectTrack(category?: string): 'Core' | 'Applied' | 'Specialized' | null {
  if (category === 'shs_core') return 'Core';
  if (category === 'shs_applied') return 'Applied';
  if (category === 'shs_specialized') return 'Specialized';
  return null;
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
  files,
  isTeacher,
  onToggleActivityPublish,
  onToggleQuizPublish,
  onToggleFileVisibility,
  onUpdateModule,
  onPreviewFile,
  onDownloadFile,
}: {
  modules: WeeklyModule[];
  activities: Activity[];
  quizzes: Quiz[];
  files: CourseFile[];
  isTeacher?: boolean;
  onToggleActivityPublish?: (activity: Activity) => void;
  onToggleQuizPublish?: (quiz: Quiz) => void;
  onToggleFileVisibility?: (file: CourseFile) => void;
  onUpdateModule?: (module: WeeklyModule, changes: { title: string; is_exam_week: boolean }) => void;
  onPreviewFile?: (file: CourseFile) => void;
  onDownloadFile?: (file: CourseFile) => void;
}) {
  const router = useRouter();
  // Track which modules are expanded - all expanded by default when modules load
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<WeeklyModule | null>(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState('');
  const [moduleIsExamWeekDraft, setModuleIsExamWeekDraft] = useState(false);

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

  const openModuleEditor = (module: WeeklyModule) => {
    setEditingModule(module);
    setModuleTitleDraft(module.title);
    setModuleIsExamWeekDraft(module.is_exam_week);
  };

  const handleSaveModule = () => {
    if (!editingModule || !onUpdateModule) return;
    const nextTitle = moduleTitleDraft.trim();
    if (!nextTitle) return;
    onUpdateModule(editingModule, {
      title: nextTitle,
      is_exam_week: moduleIsExamWeekDraft,
    });
    setEditingModule(null);
  };

  // Get activity icon config based on status
  const getActivityConfig = (activity: Activity) => {
    const submission = activity.my_submission;
    const deadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();
    const allowLate = activity.allow_late_submissions !== false; // Default to true if not set
    const isMissing = deadlinePassed && !submission && !allowLate;
    const isOverdue = deadlinePassed && !submission && allowLate;

    if (!submission) {
      if (isMissing) {
        return {
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          status: 'missing',
        };
      }
      if (isOverdue) {
        return {
          iconColor: 'text-amber-500',
          iconBg: 'bg-amber-50',
          status: 'overdue',
        };
      }
      return {
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-50',
        status: 'not-started',
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
        return { iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50', status: 'not-started' };
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
        // For students, filter out unpublished/hidden items
        const modActivities = activities.filter((a) => a.weekly_module_id === module.id && (isTeacher || a.is_published));
        const modQuizzes = quizzes.filter((q) => q.weekly_module_id === module.id && (isTeacher || q.is_published));
        const modFiles = files.filter((f) => f.weekly_module_id === module.id && (isTeacher || f.is_visible));

        // Combine all items with their type and status config for display
        // Files are hoisted to the top, followed by activities, then quizzes
        const moduleItems = [
          // Files first (learning materials)
          ...modFiles.map((f) => ({
            id: f.id,
            type: 'file' as const,
            title: f.file_name,
            meta: formatFileSize(f.file_size_bytes),
            published: f.is_visible,
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-50',
            status: 'file',
            originalItem: f,
          })),
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
              originalItem: a,
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
              originalItem: q,
            };
          }),
        ];

        const itemCount = moduleItems.length;

        return (
          <div key={module.id} className="bg-white rounded-2xl shadow-card overflow-hidden flex flex-col">
            {/* Module Header */}
            <div
              role="button"
              tabIndex={0}
              aria-expanded={expandedModules.has(module.id)}
              onClick={() => toggleModule(module.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleModule(module.id);
                }
              }}
              className="w-full flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
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
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isTeacher && onUpdateModule && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModuleEditor(module);
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Edit Week
                  </button>
                )}
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
            </div>

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
                            } else if (item.type === 'file' && onPreviewFile) {
                              const file = item.originalItem as CourseFile;
                              if (file.is_visible || isTeacher) {
                                onPreviewFile(file);
                              }
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-colors",
                            (item.type === 'activity' || (item.type === 'quiz' && item.status !== 'not-open') || item.type === 'file') && "cursor-pointer hover:bg-gray-50",
                            item.type === 'quiz' && item.status === 'not-open' && "opacity-60 cursor-not-allowed",
                            item.type === 'file' && !item.published && !isTeacher && "cursor-not-allowed"
                          )}
                        >
                          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', item.iconBg)}>
                            {item.type === 'file' && <FolderOpen className={cn('w-4.5 h-4.5', item.iconColor)} />}
                            {item.type === 'activity' && <FileText className={cn('w-4.5 h-4.5', item.iconColor)} />}
                            {item.type === 'quiz' && <ClipboardCheck className={cn('w-4.5 h-4.5', item.iconColor)} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="text-sm font-medium text-navy-800 truncate">{item.title}</div>
                              {item.type === 'activity' && (item.originalItem as Activity).is_exam && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 flex-shrink-0">
                                  {(item.originalItem as Activity).exam_type === 'monthly' ? 'Monthly' :
                                   (item.originalItem as Activity).exam_type === 'quarterly' ? 'Quarterly' : 'Exam'}
                                </span>
                              )}
                            </div>
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
                            {item.type === 'activity' && item.status === 'not-started' && !isTeacher && (
                              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Not Started</span>
                            )}
                            {item.type === 'activity' && item.status === 'not-started' && isTeacher && (
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Available</span>
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
                            {/* File preview/download actions */}
                            {item.type === 'file' && item.published && (
                              <div className="flex items-center gap-1">
                                {onPreviewFile && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPreviewFile(item.originalItem as CourseFile);
                                    }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-navy-600 hover:bg-navy-50 transition-colors"
                                    title="Preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                {onDownloadFile && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDownloadFile(item.originalItem as CourseFile);
                                    }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-navy-600 hover:bg-navy-50 transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                            {/* Draft/Hidden badge for teachers */}
                            {!item.published && isTeacher && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {item.type === 'file' ? 'Hidden' : 'Draft'}
                              </span>
                            )}
                            {/* Toggle publish button for teachers */}
                            {isTeacher && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.type === 'activity' && onToggleActivityPublish) {
                                    onToggleActivityPublish(item.originalItem);
                                  } else if (item.type === 'quiz' && onToggleQuizPublish) {
                                    onToggleQuizPublish(item.originalItem);
                                  } else if (item.type === 'file' && onToggleFileVisibility) {
                                    onToggleFileVisibility(item.originalItem);
                                  }
                                }}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  item.published
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-gray-400 hover:bg-gray-100'
                                )}
                                title={item.published ? 'Unpublish' : 'Publish'}
                              >
                                {item.published ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-current" />
                                )}
                              </button>
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
      <Dialog.Root open={!!editingModule} onOpenChange={(open) => { if (!open) setEditingModule(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 md:w-full md:max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <Dialog.Title className="text-lg font-semibold text-navy-900">Edit Module Week</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500 mt-1">
                Update the week title or mark it as an exam week.
              </Dialog.Description>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Week Title</label>
                <input
                  value={moduleTitleDraft}
                  onChange={(e) => setModuleTitleDraft(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="e.g. Oral Communication Foundations"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moduleIsExamWeekDraft}
                  onChange={(e) => setModuleIsExamWeekDraft(e.target.checked)}
                  className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                />
                <span className="text-sm text-gray-700">Mark as Exam Week</span>
              </label>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModule}
                disabled={!moduleTitleDraft.trim()}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// Assignments Tab
function AssignmentsTab({
  activities,
  isTeacher,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onGradeActivity,
  onTogglePublish,
}: {
  activities: Activity[];
  isTeacher?: boolean;
  onAddActivity?: () => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activity: Activity) => void;
  onGradeActivity?: (activity: Activity) => void;
  onTogglePublish?: (activity: Activity) => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  const getAssignmentConfig = (activity: Activity) => {
    const submission = activity.my_submission;
    const deadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();
    const allowLate = activity.allow_late_submissions !== false; // Default to true if not set
    const isMissing = deadlinePassed && !submission && !allowLate;
    const isOverdue = deadlinePassed && !submission && allowLate;

    if (!submission) {
      if (isMissing) {
        return {
          status: 'missing',
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Missing
            </span>
          ),
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          barColor: 'bg-red-500',
          buttonText: 'View Details',
          buttonVariant: 'btn-secondary' as const,
          buttonDisabled: false,
          pointsColor: 'text-red-600',
        };
      }
      if (isOverdue) {
        return {
          status: 'overdue',
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-3.5 h-3.5" />
              Overdue
            </span>
          ),
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          barColor: 'bg-amber-500',
          buttonText: 'Submit Now',
          buttonVariant: 'btn-primary' as const,
          buttonDisabled: false,
          pointsColor: 'text-amber-600',
        };
      }
      return {
        status: 'not-started',
        badge: (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
            Available
          </span>
        ),
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        barColor: 'bg-emerald-500',
        buttonText: 'Start Assignment',
        buttonVariant: 'btn-primary' as const,
        buttonDisabled: false,
        pointsColor: 'text-navy-800',
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
              Available
            </span>
          ),
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          barColor: 'bg-emerald-500',
          buttonText: 'Start Assignment',
          buttonVariant: 'btn-primary' as const,
          buttonDisabled: false,
          pointsColor: 'text-navy-800',
        };
    }
  };

  // Teachers can see all activities (including drafts), students only see published
  const assignments = isTeacher
    ? (activities || [])
    : (activities?.filter((a) => a.is_published) || []);

  // Filter assignments based on selected tab
  const filteredAssignments = assignments.filter((activity) => {
    const config = getAssignmentConfig(activity);
    if (filter === 'all') return true;
    if (filter === 'pending') return config.status === 'not-started' || config.status === 'overdue' || config.status === 'missing';
    if (filter === 'submitted') return config.status === 'submitted' || config.status === 'late-submitted';
    if (filter === 'graded') return config.status === 'graded';
    return true;
  });

  // Get counts for filter tabs
  const counts = {
    all: assignments.length,
    pending: assignments.filter(a => {
      const config = getAssignmentConfig(a);
      return config.status === 'not-started' || config.status === 'overdue' || config.status === 'missing';
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

  return (
    <div className="space-y-6">
      {/* Filter Tabs and Add Button */}
      <div className="flex items-center justify-between">
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
        {isTeacher && (
          <button
            onClick={onAddActivity}
            className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
        )}
      </div>

      {/* Assignment Grid */}
      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredAssignments.map((activity: Activity) => {
          const config = getAssignmentConfig(activity);
          const submission = activity.my_submission;
          const isOverdue = activity.deadline && new Date(activity.deadline) < new Date() && !submission;

          // For teachers: get stats from activity (fallback to 0 if not available)
          const totalStudents = activity.student_count ?? 0;
          const submittedCount = activity.submission_count ?? 0;
          const gradedCount = activity.graded_count ?? 0;

          // Progress-aware coloring for teacher stats
          const getStatsColors = (studentCount: number, submissionCount: number, gradedCount: number) => {
            // State 1: No submissions yet
            if (submissionCount === 0) {
              return {
                students: 'text-slate-400',
                submitted: 'text-slate-400',
                graded: 'text-slate-400',
              };
            }
            // State 5: All submitted AND all graded
            if (submissionCount === studentCount && gradedCount === studentCount) {
              return {
                students: 'text-green-600',
                submitted: 'text-green-600',
                graded: 'text-green-600',
              };
            }
            // State 4: All submitted are graded (but not all students submitted)
            if (gradedCount === submissionCount) {
              return {
                students: 'text-slate-400',
                submitted: 'text-green-600',
                graded: 'text-green-600',
              };
            }
            // State 2 & 3: Some submitted, need grading (gradedCount < submissionCount)
            return {
              students: 'text-slate-400',
              submitted: 'text-blue-500',
              graded: 'text-amber-500',
            };
          };

          const statsColors = getStatsColors(totalStudents, submittedCount, gradedCount);

          return (
            <div
              key={activity.id}
              className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden group cursor-pointer"
              onClick={() => router.push(`/activities/${activity.id}`)}
            >
              {/* Status Bar */}
              <div className={cn('h-1.5 w-full', activity.is_published ? (isTeacher ? 'bg-navy-500' : config.barColor) : 'bg-gray-300')} />

              <div className="p-6">
                {/* Header - Icon + Badges */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-11 h-11 rounded-full flex items-center justify-center', activity.is_published ? (isTeacher ? 'bg-navy-100' : config.iconBg) : 'bg-gray-100')}>
                      <FileText className={cn('w-5 h-5', activity.is_published ? (isTeacher ? 'text-navy-600' : config.iconColor) : 'text-gray-400')} />
                    </div>
                    {!activity.is_published && isTeacher && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        Draft
                      </span>
                    )}
                    {activity.is_exam && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        {activity.exam_type === 'monthly' ? 'Monthly Exam' :
                         activity.exam_type === 'quarterly' ? 'Quarterly Exam' :
                         'Exam'}
                      </span>
                    )}
                  </div>
                  {/* Status badge only for students */}
                  {!isTeacher && config.badge}
                  {/* Due date badge for teachers */}
                  {isTeacher && activity.deadline && (
                    <span className="text-xs text-slate-500">
                      Due {formatDate(activity.deadline)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className={cn('font-display font-semibold text-xl mb-2', activity.is_published ? 'text-navy-800' : 'text-gray-500')} style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {activity.title}
                </h3>

                {/* Description - strip HTML for preview */}
                {activity.instructions && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    {stripHtml(activity.instructions)}
                  </p>
                )}

                {/* Meta Row */}
                <div className="flex items-center gap-6 mb-5">
                  <div className={cn('flex items-center gap-2 text-sm', isOverdue && !isTeacher ? 'text-amber-600' : 'text-gray-500')}>
                    <Calendar className={cn('w-4 h-4', isOverdue && !isTeacher ? 'text-amber-500' : 'text-gray-400')} />
                    <span>
                      {activity.deadline ? (
                        formatDate(activity.deadline)
                      ) : (
                        'No due date'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span>{activity.points} pts</span>
                  </div>
                </div>

                {/* Stats Row for Teachers */}
                {isTeacher && (
                  <div className="flex items-center gap-2 mb-3">
                    {/* Students stat */}
                    <div className="flex items-center gap-1">
                      <Users className={cn('w-3.5 h-3.5', statsColors.students)} />
                      <span className={cn('text-sm font-medium', statsColors.students)}>{totalStudents}</span>
                      <span className="text-xs text-slate-400">students</span>
                    </div>
                    <span className="text-slate-300">·</span>
                    {/* Submitted stat */}
                    <div className="flex items-center gap-1">
                      <CheckCircle className={cn('w-3.5 h-3.5', statsColors.submitted)} />
                      <span className={cn('text-sm font-medium', statsColors.submitted)}>{submittedCount}</span>
                      <span className="text-xs text-slate-400">submitted</span>
                    </div>
                    <span className="text-slate-300">·</span>
                    {/* Graded stat */}
                    <div className="flex items-center gap-1">
                      <Award className={cn('w-3.5 h-3.5', statsColors.graded)} />
                      <span className={cn('text-sm font-medium', statsColors.graded)}>{gradedCount}</span>
                      <span className="text-xs text-slate-400">graded</span>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  {/* Student view: show points/status */}
                  {!isTeacher && (
                    <span className={cn('text-sm font-semibold', activity.is_published ? config.pointsColor : 'text-gray-500')}>
                      {submission?.status === 'graded'
                        ? `${submission.score}/${activity.points}`
                        : submission?.status === 'submitted' || submission?.status === 'late'
                        ? 'Pending Grade'
                        : `${activity.points} pts`}
                    </span>
                  )}
                  {/* Teacher view: show points */}
                  {isTeacher && (
                    <span className="text-sm font-semibold text-navy-800">
                      {activity.points} pts
                    </span>
                  )}
                  {isTeacher ? (
                    <div className="flex items-center gap-2">
                      {onTogglePublish && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePublish(activity);
                          }}
                          className={cn(
                            'text-xs font-medium px-2 py-1 rounded transition-colors',
                            activity.is_published
                              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          )}
                        >
                          {activity.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/activities/${activity.id}`);
                        }}
                        className="text-sm font-medium text-navy-600 hover:text-navy-700 transition-colors duration-200"
                      >
                        Edit/Grade →
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-display font-semibold text-lg text-navy-800 mb-1">
            {assignments.length === 0 ? 'No assignments available' : `No ${filter === 'all' ? '' : filter} assignments`}
          </h3>
          <p className="text-gray-500">
            {assignments.length === 0 ? (
              isTeacher ? 'Create your first assignment for this subject.' : 'No assignments have been posted yet.'
            ) : filter === 'pending' ? 'All caught up! No pending assignments.' :
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
function QuizzesTab({ quizzes, isTeacher, onAddQuiz, onTogglePublish }: { quizzes: Quiz[]; isTeacher?: boolean; onAddQuiz?: () => void; onTogglePublish?: (quiz: Quiz) => void }) {
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
      const score = quiz.my_attempt.score ?? 0;
      const maxScore = quiz.my_attempt.max_score ?? 1;
      const percentage = Math.round((score / maxScore) * 100);
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
        submittedDate: (quiz.my_attempt as any).submitted_at,
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

  // Teachers can see all quizzes (including drafts), students only see published
  const publishedQuizzes = isTeacher
    ? (quizzes || [])
    : (quizzes?.filter((q) => q.is_published) || []);

  return (
    <div className="space-y-5">
      {/* Header with Add Button */}
      {isTeacher && (
        <div className="flex items-center justify-end">
          <button
            onClick={onAddQuiz}
            className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Quiz
          </button>
        </div>
      )}

      {publishedQuizzes.length > 0 ? publishedQuizzes.map((quiz) => {
        const config = getQuizConfig(quiz);
        const Icon = config.icon;
        const attemptsRemaining = quiz.attempt_limit - (quiz.my_attempt?.attempts_used || 0);
        const isCompleted = config.status === 'completed';

        return (
          <div
            key={quiz.id}
            onClick={() => isTeacher && router.push(`/quizzes/${quiz.id}`)}
            className={cn(
              "flex items-center gap-5 p-6 bg-white rounded-2xl shadow-card transition-all duration-200",
              config.canClick || isTeacher ? "hover:shadow-card-hover cursor-pointer" : "opacity-75",
              !quiz.is_published && isTeacher && "border-l-4 border-gray-300"
            )}
          >
            {/* Quiz Icon */}
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
              quiz.is_published ? config.iconBg : 'bg-gray-100'
            )}>
              <Icon className={cn('w-6 h-6', quiz.is_published ? config.iconColor : 'text-gray-400')} />
            </div>

            {/* Quiz Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-display font-semibold text-lg",
                  !quiz.is_published ? 'text-gray-500' :
                  config.status === 'not-open' || config.status === 'closed' ? 'text-gray-500' : 'text-navy-800'
                )}>
                  {quiz.title}
                </h3>
                {!quiz.is_published && isTeacher && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    Draft
                  </span>
                )}
              </div>
              {quiz.instructions && (
                <p className={cn(
                  "text-sm mt-1 line-clamp-1",
                  !quiz.is_published ? 'text-gray-400' :
                  config.status === 'not-open' || config.status === 'closed' ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {stripHtml(quiz.instructions)}
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
                {isCompleted && (quiz.my_attempt as any)?.submitted_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Completed {formatDate((quiz.my_attempt as any).submitted_at)}
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
              {/* Draft Badge for teachers */}
              {!quiz.is_published && isTeacher && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                  Draft
                </span>
              )}

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
              {isTeacher ? (
                <div className="flex items-center gap-2">
                  {onTogglePublish && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePublish(quiz);
                      }}
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded transition-colors',
                        quiz.is_published
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      )}
                    >
                      {quiz.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                  )}
                  {!quiz.is_published && (
                    <button
                      onClick={() => router.push(`/quizzes/${quiz.id}/build`)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-navy-700 border border-navy-200 hover:bg-navy-50 transition-colors"
                    >
                      Edit Questions
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/quizzes/${quiz.id}`)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 transition-colors"
                  >
                    Edit/Grade
                  </button>
                </div>
              ) : (
                config.status !== 'not-open' && config.status !== 'closed' && (
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
                )
              )}

              {/* Locked indicator */}
              {(config.status === 'not-open' || config.status === 'closed') && (
                <span className="text-sm text-gray-400 font-medium">{config.buttonText}</span>
              )}
            </div>
          </div>
        );
      }) : (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-display font-semibold text-lg text-navy-800 mb-1">No quizzes available</h3>
          <p className="text-gray-500">
            {isTeacher ? 'Create your first quiz for this subject.' : 'No quizzes have been posted yet.'}
          </p>
        </div>
      )}
    </div>
  );
}


// File Preview Modal - Fetches file with auth and displays via blob URL
function FilePreviewModal({
  file,
  isOpen,
  onClose,
}: {
  file: CourseFile | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) {
      setBlobUrl(null);
      setIsLoading(true);
      setHasError(false);
      return;
    }

    let objectUrl: string | null = null;
    const controller = new AbortController();

    const fetchFile = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Convert absolute URL to relative for Next.js proxy (avoids CSP issues with different IPs)
        const proxyUrl = toMediaProxyUrl(file.file_url);
        const response = await fetch(proxyUrl, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logger.error('File fetch error:', err);
          setHasError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, file]);

  // Reset fullscreen when closing
  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
    }
  }, [isOpen]);

  if (!file) return null;

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
    file.file_type?.toLowerCase() || ''
  );
  const isPdf = file.file_type?.toLowerCase() === 'pdf';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className={cn(
          "bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col",
          isFullscreen
            ? "fixed inset-0 rounded-none"
            : "fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh]"
        )}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-navy-900 truncate">
              {file.file_name}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Preview of {file.file_name}
            </Dialog.Description>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-gray-500" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-gray-500" />
                )}
              </button>
              <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close preview">
                <X className="w-5 h-5 text-gray-500" />
              </Dialog.Close>
            </div>
          </div>

          <div className={cn(
            "flex-1 overflow-auto p-4",
            isFullscreen && "flex items-center justify-center"
          )}>
            {isLoading && (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
              </div>
            )}

            {hasError && (
              <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
                <p>Failed to load file preview</p>
              </div>
            )}

            {!isLoading && !hasError && blobUrl && isImage && (
              <img
                src={blobUrl}
                alt={file.file_name}
                className={cn(
                  "object-contain",
                  isFullscreen ? "max-w-full max-h-full" : "max-w-full max-h-[70vh] mx-auto"
                )}
              />
            )}

            {!isLoading && !hasError && blobUrl && isPdf && (
              <iframe
                src={blobUrl}
                className={cn(
                  "w-full",
                  isFullscreen ? "h-full" : "h-[70vh]"
                )}
                title={`PDF Preview - ${file.file_name}`}
              />
            )}

            {!isLoading && !hasError && blobUrl && !isImage && !isPdf && (
              <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                <FileText className="w-16 h-16 mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Preview not available for this file type
                </p>
                <p className="text-sm text-gray-500">
                  Download the file to view it
                </p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


// Helper to format week label
function weekLabel(module: WeeklyModule): string {
  return `Week ${module.week_number}: ${module.title}`;
}

// Upload Modal - File upload with category and week selection
function UploadModal({
  isOpen,
  onClose,
  courseSectionId,
  modules,
  onUploadComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseSectionId?: string;
  modules: WeeklyModule[];
  onUploadComplete: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<'module' | 'assignment' | 'quiz' | 'general'>('general');
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles((prev) => [...prev, ...Array.from(selectedFiles)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !courseSectionId) return;

    setUploading(true);
    const progress: Record<string, number> = {};
    files.forEach((f) => {
      progress[f.name] = 0;
    });
    setUploadProgress(progress);

    let successCount = 0;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        formData.append('is_visible', String(isPublished));
        if (selectedWeekId) {
          formData.append('weekly_module_id', selectedWeekId);
        }

        // Simulate progress for UX (actual progress would need XMLHttpRequest)
        setUploadProgress((p) => ({ ...p, [file.name]: 50 }));

        await filesApi.uploadFile(courseSectionId, formData);

        setUploadProgress((p) => ({ ...p, [file.name]: 100 }));
        successCount++;
      } catch (err) {
        logger.error('Upload failed for', file.name, err);
        setUploadProgress((p) => ({ ...p, [file.name]: -1 })); // -1 indicates error
      }
    }

    setUploading(false);
    if (successCount === files.length) {
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseSectionId] });
      onUploadComplete();
      onClose();
      setFiles([]);
      setUploadProgress({});
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setUploadProgress({});
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 md:w-full md:max-w-lg md:max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-navy-900">
              Upload Files
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Upload files to the course
            </Dialog.Description>
            <Dialog.Close className="p-2 hover:bg-gray-100 rounded-full transition-colors" disabled={uploading} aria-label="Close upload dialog">
              <X className="w-5 h-5 text-gray-500" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Week/Module Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Week/Topic</label>
              <select
                value={selectedWeekId || ''}
                onChange={(e) => setSelectedWeekId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                disabled={uploading}
              >
                <option value="">Unassigned</option>
                {modules.sort((a, b) => a.week_number - b.week_number).map((m) => (
                  <option key={m.id} value={m.id}>{weekLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                disabled={uploading}
              >
                <option value="general">General</option>
                <option value="module">Module</option>
                <option value="assignment">Assignment</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                disabled={uploading}
              />
              <label htmlFor="isPublished" className="text-sm text-gray-700">
                Publish immediately (visible to students)
              </label>
            </div>

            {/* File Input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-navy-500 hover:bg-navy-50/50 transition-colors flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {files.length > 0 ? 'Add more files' : 'Click to select files'}
                </span>
              </button>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Selected Files ({files.length})
                </label>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {uploadProgress[file.name] !== undefined && (
                      <div className="w-16">
                        {uploadProgress[file.name] === -1 ? (
                          <span className="text-xs text-red-500">Failed</span>
                        ) : uploadProgress[file.name] === 100 ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-navy-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {!uploading && uploadProgress[file.name] === undefined && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-100 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


// Files Tab
function FilesTab({
  files,
  modules,
  isTeacher,
  courseSectionId,
  onTogglePublish,
  onDelete,
  onUpdateWeek,
}: {
  files: CourseFile[];
  modules: WeeklyModule[];
  isTeacher?: boolean;
  courseSectionId?: string;
  onTogglePublish?: (file: CourseFile) => void;
  onDelete?: (file: CourseFile) => void;
  onUpdateWeek?: (file: CourseFile, weekId: string | null) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [previewFile, setPreviewFile] = useState<CourseFile | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingWeekFileId, setEditingWeekFileId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Create a map for quick module lookup
  const moduleById = new Map<string, WeeklyModule>();
  modules?.forEach((m) => moduleById.set(m.id, m));

  const getWeekBadge = (file: CourseFile) => {
    const module = file.weekly_module_id ? moduleById.get(file.weekly_module_id) : null;
    const labelText = module ? `Week ${module.week_number}: ${module.title}` : 'Unassigned';
    const isEditing = editingWeekFileId === file.id;

    if (isEditing && isTeacher) {
      return (
        <select
          autoFocus
          value={file.weekly_module_id || ''}
          onChange={(e) => {
            const newWeekId = e.target.value || null;
            onUpdateWeek?.(file, newWeekId);
            setEditingWeekFileId(null);
          }}
          onBlur={() => setEditingWeekFileId(null)}
          className="text-xs px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Unassigned</option>
          {modules?.sort((a, b) => a.week_number - b.week_number).map((m) => (
            <option key={m.id} value={m.id}>Week {m.week_number}: {m.title}</option>
          ))}
        </select>
      );
    }

    return (
      <button
        type="button"
        onClick={() => isTeacher && setEditingWeekFileId(file.id)}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
          isTeacher ? 'cursor-pointer hover:bg-amber-100' : 'cursor-default'
        } ${
          module
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}
        title={isTeacher ? 'Click to change week assignment' : undefined}
      >
        {labelText}
      </button>
    );
  };

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
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><span className="text-emerald-600 font-bold text-xs">IMG</span></div>;
      default:
        return <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center"><span className="text-gray-600 font-bold text-xs">FILE</span></div>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      module: 'bg-purple-50 text-purple-700 border-purple-200',
      assignment: 'bg-blue-50 text-blue-700 border-blue-200',
      quiz: 'bg-orange-50 text-orange-700 border-orange-200',
      general: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[category] || colors.general}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };

  const categories = ['All', 'Module', 'Assignment', 'Quiz', 'General'] as const;

  // Teachers see all files, students only see visible files
  const visibleFiles = isTeacher ? files : files?.filter((f) => f.is_visible);

  // Count files per category
  const categoryCounts = categories.reduce((acc, cat) => {
    if (cat === 'All') {
      acc[cat] = visibleFiles?.length || 0;
    } else {
      acc[cat] = visibleFiles?.filter((f) => f.category === cat.toLowerCase())?.length || 0;
    }
    return acc;
  }, {} as Record<string, number>);

  const filteredFiles = categoryFilter === 'All'
    ? visibleFiles
    : visibleFiles?.filter((f) => f.category === categoryFilter.toLowerCase());

  const handleDownload = async (file: CourseFile) => {
    try {
      await filesApi.downloadFile(file.file_url, file.file_name);
    } catch (err) {
      logger.error('Download failed:', err);
    }
  };

  const handleUploadComplete = () => {
    if (courseSectionId) {
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseSectionId] });
    }
  };

  if (!files?.length && !isTeacher) {
    return <EmptyState message="No files available yet." />;
  }

  return (
    <>
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        courseSectionId={courseSectionId}
        modules={modules}
        onUploadComplete={handleUploadComplete}
      />

      <div className="bg-white rounded-xl shadow-card">
        {/* Header with Upload Button */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {categories.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCategoryFilter(filter)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  categoryFilter === filter
                    ? 'bg-navy-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {filter} ({categoryCounts[filter] || 0})
              </button>
            ))}
          </div>

          {isTeacher && (
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Upload File
            </button>
          )}
        </div>

        {/* File List */}
        {filteredFiles?.length === 0 ? (
          <div className="p-8">
            <EmptyState
              message={
                isTeacher
                  ? 'No files uploaded yet. Click "+ Upload File" to get started.'
                  : 'No files available in this category.'
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredFiles?.map((file: CourseFile) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors",
                  !file.is_visible && isTeacher && "opacity-60"
                )}
              >
                {getFileIcon(file.file_type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn("font-medium cursor-pointer hover:text-navy-600", file.is_visible ? 'text-navy-800' : 'text-gray-500')}
                      onClick={() => file.is_visible && setPreviewFile(file)}
                    >
                      {file.file_name}
                    </p>
                    {!file.is_visible && isTeacher && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        Draft
                      </span>
                    )}
                    {getCategoryBadge(file.category)}
                    {getWeekBadge(file)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.file_size_bytes)} • {formatDate(file.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isTeacher && onTogglePublish && (
                    <button
                      type="button"
                      onClick={() => onTogglePublish(file)}
                      className={cn(
                        'text-xs font-medium px-3 py-1.5 rounded transition-colors',
                        file.is_visible
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                      )}
                    >
                      {file.is_visible ? 'Unpublish' : 'Publish'}
                    </button>
                  )}

                  {isTeacher && onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${file.file_name}"?`)) {
                          onDelete(file);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {file.is_visible && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="p-2 text-gray-400 hover:text-navy-600 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        className="p-2 text-gray-400 hover:text-navy-600 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Announcements Tab
function AnnouncementsTab({
  announcements,
  isTeacher,
  isCreating,
  onCreateAnnouncement,
}: {
  announcements: Announcement[];
  isTeacher: boolean;
  isCreating: boolean;
  onCreateAnnouncement?: (title: string, body: string) => void;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const sortedAnnouncements = [...(announcements || [])].sort((a, b) => {
    // Pinned first, then by date
    if (a.is_published !== b.is_published) return Number(b.is_published) - Number(a.is_published);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const canSubmit = newTitle.trim().length > 0 && newBody.trim().length > 0 && !isCreating;

  const handleSubmit = () => {
    if (!canSubmit || !onCreateAnnouncement) return;
    onCreateAnnouncement(newTitle.trim(), newBody.trim());
    setNewTitle('');
    setNewBody('');
    setIsComposerOpen(false);
  };

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="bg-white rounded-xl shadow-card p-4">
          {!isComposerOpen ? (
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Announcement
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Announcement title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
                placeholder="Write your announcement..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsComposerOpen(false);
                    setNewTitle('');
                    setNewBody('');
                  }}
                  className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {sortedAnnouncements.length === 0 ? (
        <EmptyState message="No announcements yet" />
      ) : (
        sortedAnnouncements.map((announcement) => (
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
                <p className="text-gray-700 whitespace-pre-wrap">{announcement.body}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Attendance Tab
function AttendanceTab({ courseId }: { courseId: string }) {
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();
  const queryClient = useQueryClient();

  // New meeting modal state
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [newMeetingDate, setNewMeetingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newMeetingTitle, setNewMeetingTitle] = useState('');

  // Selected session for teacher view
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  // Local state for optimistic attendance updates
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Clear local records when switching sessions
  useEffect(() => {
    setLocalRecords({});
    setHasChanges(false);
  }, [selectedSessionIndex]);

  // Fetch attendance overview
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['attendanceOverview', courseId],
    queryFn: () => attendanceApi.getAttendanceOverview(courseId),
    enabled: !!courseId,
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: () => attendanceApi.createMeeting(courseId, newMeetingDate, newMeetingTitle || formatDate(newMeetingDate)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceOverview', courseId] });
      setIsNewMeetingModalOpen(false);
      setNewMeetingTitle('');
      setNewMeetingDate(new Date().toISOString().split('T')[0]);
      setSelectedSessionIndex(0); // New meeting will be at index 0 (most recent)
      setLocalRecords({}); // Clear local records for fresh start
      setHasChanges(false);
    },
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: (records: { student_id: string; status: string; remarks?: string }[]) =>
      attendanceApi.updateRecords(overview?.sessions?.[selectedSessionIndex]?.id || '', records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceOverview', courseId] });
      setLocalRecords({});
      setHasChanges(false);
    },
  });

  // Helper to format date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Auto-generate title from date
  const generateTitleFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Get status indicator style for circular indicator (teacher view)
  const getStatusIndicatorStyle = (status: AttendanceStatus | 'None') => {
    const configs: Record<string, { border: string; fill: string; text: string }> = {
      Present: { border: 'border-[#86efac]', fill: 'bg-[#22c55e]', text: 'text-[#22c55e]' },
      Late: { border: 'border-[#fcd34d]', fill: 'bg-[#f59e0b]', text: 'text-[#f59e0b]' },
      Absent: { border: 'border-[#fca5a5]', fill: 'bg-[#ef4444]', text: 'text-[#ef4444]' },
      Excused: { border: 'border-[#c4b5fd]', fill: 'bg-[#a78bfa]', text: 'text-[#a78bfa]' },
      None: { border: 'border-gray-300', fill: 'bg-transparent', text: 'text-gray-400' },
    };
    return configs[status] || configs.None;
  };

  // Get status pill style for history items (student view)
  const getStatusPillStyle = (status: AttendanceStatus) => {
    const configs: Record<string, { bg: string; text: string }> = {
      Present: { bg: 'bg-green-100', text: 'text-[#22c55e]' },
      Late: { bg: 'bg-amber-100', text: 'text-[#f59e0b]' },
      Absent: { bg: 'bg-red-100', text: 'text-[#ef4444]' },
      Excused: { bg: 'bg-purple-100', text: 'text-[#a78bfa]' },
    };
    return configs[status] || configs.Present;
  };

  // Cycle through statuses (None is only the initial unmarked state, not part of the cycle)
  // Cycle order: Present → Late → Absent → Excused → Present
  // When 'None' (unmarked), clicking goes to 'Present'
  const cycleStatus = (current: AttendanceStatus | 'None'): AttendanceStatus => {
    const STATUS_CYCLE: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'Excused'];
    if (current === 'None') {
      return 'Present'; // First click from unmarked goes to Present
    }
    const currentIndex = STATUS_CYCLE.indexOf(current);
    return STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
  };

  // Student view
  if (isStudent) {
    const summary = overview?.summary as {
      total_sessions: number;
      present_count: number;
      absent_count: number;
      late_count: number;
      excused_count: number;
      attendance_percentage: number;
    } | undefined;
    const history: AttendanceHistoryItem[] = overview?.history || [];

    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState message="Failed to load attendance" />;

    // Determine attendance rate color
    const attendanceRate = summary?.attendance_percentage ?? 0;
    const rateColor = attendanceRate >= 75 ? '#22c55e' : attendanceRate >= 50 ? '#f59e0b' : '#ef4444';

    return (
      <div className="space-y-5">
        {/* Stats Strip - 5 compact cards */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-gray-50 rounded-[10px] p-3.5 text-center">
            <p className="text-[26px] font-medium text-[#22c55e]">{summary?.present_count ?? 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Present</p>
          </div>
          <div className="bg-gray-50 rounded-[10px] p-3.5 text-center">
            <p className="text-[26px] font-medium text-[#f59e0b]">{summary?.late_count ?? 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Late</p>
          </div>
          <div className="bg-gray-50 rounded-[10px] p-3.5 text-center">
            <p className="text-[26px] font-medium text-[#ef4444]">{summary?.absent_count ?? 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Absent</p>
          </div>
          <div className="bg-gray-50 rounded-[10px] p-3.5 text-center">
            <p className="text-[26px] font-medium text-[#a78bfa]">{summary?.excused_count ?? 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Excused</p>
          </div>
          <div className="bg-gray-50 rounded-[10px] p-3.5 text-center">
            <p className="text-[26px] font-medium text-gray-500">{summary?.total_sessions ?? 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Sessions</p>
          </div>
        </div>

        {/* Attendance Rate Card */}
        {summary && summary.total_sessions > 0 && (
          <div className="bg-white rounded-[10px] border p-3.5" style={{ borderWidth: '0.5px', borderColor: 'rgb(229 231 235)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-gray-600">Attendance Rate</span>
              <span className="text-[22px] font-medium" style={{ color: rateColor }}>
                {Math.round(summary.attendance_percentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-[3px] h-[6px] overflow-hidden">
              <div
                className="h-full rounded-[3px] transition-all duration-300"
                style={{ width: `${summary.attendance_percentage}%`, backgroundColor: rateColor }}
              />
            </div>
          </div>
        )}

        {/* Attendance History */}
        <div>
          <h3 className="text-[13px] font-medium text-gray-700 mb-2">Attendance History</h3>
          {history.length > 0 ? (
            <div className="space-y-[7px]">
              {history.map((item: AttendanceHistoryItem) => {
                // Handle null status (unmarked/not recorded)
                const isUnmarked = item.status === null;
                const pillStyle = isUnmarked ? null : getStatusPillStyle(item.status as AttendanceStatus);
                const dotColor = isUnmarked ? '#9ca3af' : item.status === 'Present' ? '#22c55e' : item.status === 'Late' ? '#f59e0b' : item.status === 'Absent' ? '#ef4444' : '#a78bfa';
                return (
                  <div
                    key={item.meeting_id}
                    className="bg-white rounded-[10px] p-[11px_14px] flex items-center gap-2.5"
                    style={{ borderWidth: '0.5px', borderColor: 'rgb(229 231 235)' }}
                  >
                    <div
                      className="w-[10px] h-[10px] rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{formatDisplayDate(item.date)}</p>
                    </div>
                    {isUnmarked ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium shrink-0 bg-gray-100 text-gray-400">
                        Not marked
                      </span>
                    ) : (
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium shrink-0',
                        pillStyle!.bg, pillStyle!.text
                      )}>
                        {item.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No attendance records yet" />
          )}
        </div>
      </div>
    );
  }

  // Teacher view
  const sessions = overview?.sessions || [];
  const students = overview?.students || [];
  const records = overview?.records || [];

  // Build record map for current session
  const recordMap: Record<string, AttendanceStatus> = {};
  const currentSessionId = sessions[selectedSessionIndex]?.id;
  records.forEach((r: AttendanceRecord) => {
    if (r.meeting_id === currentSessionId) {
      recordMap[r.student_id] = localRecords[r.student_id] || r.status;
    }
  });
  // Merge with local changes
  Object.entries(localRecords).forEach(([key, status]) => {
    recordMap[key] = status;
  });

  // Count attendance for current session
  const sessionCounts = {
    present: Object.values(recordMap).filter(s => s === 'Present').length,
    late: Object.values(recordMap).filter(s => s === 'Late').length,
    absent: Object.values(recordMap).filter(s => s === 'Absent').length,
    excused: Object.values(recordMap).filter(s => s === 'Excused').length,
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load attendance" />;

  return (
    <div className="space-y-6">
      {/* New Meeting Modal */}
      {isNewMeetingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-navy-800">New Meeting</h3>
              <button
                onClick={() => setIsNewMeetingModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newMeetingDate}
                  onChange={(e) => {
                    setNewMeetingDate(e.target.value);
                    if (!newMeetingTitle) {
                      setNewMeetingTitle(generateTitleFromDate(e.target.value));
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder={generateTitleFromDate(newMeetingDate)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              {createMeetingMutation.isError && (
                <p className="text-sm text-red-600">
                  {createMeetingMutation.error instanceof Error
                    ? createMeetingMutation.error.message
                    : 'Failed to create meeting'}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsNewMeetingModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMeetingMutation.mutate()}
                  disabled={createMeetingMutation.isPending}
                  className="flex-1 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50"
                >
                  {createMeetingMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {sessions.length > 0 ? (
            <>
              <button
                onClick={() => setSelectedSessionIndex(Math.min(selectedSessionIndex + 1, sessions.length - 1))}
                disabled={selectedSessionIndex >= sessions.length - 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="font-display font-semibold text-navy-800">
                  {sessions[selectedSessionIndex]?.title || 'Select Session'}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDisplayDate(sessions[selectedSessionIndex]?.date || '')}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionIndex(Math.max(selectedSessionIndex - 1, 0))}
                disabled={selectedSessionIndex <= 0}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-400">
                ({selectedSessionIndex + 1} of {sessions.length})
              </span>
            </>
          ) : (
            <p className="text-gray-500">No sessions yet</p>
          )}
        </div>
        <button
          onClick={() => setIsNewMeetingModalOpen(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </button>
      </div>

      {/* Session Content */}
      {sessions.length > 0 && students.length > 0 ? (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          {/* Session Stats */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
                <span className="text-gray-600">Present: {sessionCounts.present}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span className="text-gray-600">Late: {sessionCounts.late}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span className="text-gray-600">Absent: {sessionCounts.absent}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#a78bfa]" />
                <span className="text-gray-600">Excused: {sessionCounts.excused}</span>
              </span>
              <span className="ml-auto text-gray-500">
                {sessionCounts.present + sessionCounts.late} / {students.length} attended
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4 text-xs">
            <span className="text-gray-500">Legend:</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-gray-300" />
                <span className="text-gray-500">None</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-[#86efac] bg-[#22c55e]" />
                <span className="text-gray-500">Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-[#fcd34d] bg-[#f59e0b]" />
                <span className="text-gray-500">Late</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-[#fca5a5] bg-[#ef4444]" />
                <span className="text-gray-500">Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full border-[2.5px] border-[#c4b5fd] bg-[#a78bfa]" />
                <span className="text-gray-500">Excused</span>
              </div>
            </div>
            <span className="ml-auto text-gray-400">Tap to cycle</span>
          </div>

          {/* Student List */}
          <div className="divide-y divide-gray-100">
            {students.map((student: {
              student_id: string;
              student_name: string;
              student_email: string;
              avatar_url?: string | null;
            }) => {
              const currentStatus = (recordMap[student.student_id] || 'None') as AttendanceStatus | 'None';
              const style = getStatusIndicatorStyle(currentStatus);
              const showStatusText = currentStatus !== 'None';
              return (
                <div
                  key={student.student_id}
                  className="p-4 flex items-center hover:bg-gray-50"
                >
                  {/* Status Circle */}
                  <button
                    onClick={() => {
                      const newStatus = cycleStatus(currentStatus);
                      setLocalRecords(prev => ({ ...prev, [student.student_id]: newStatus }));
                      setHasChanges(true);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-3 border-[2.5px] transition-all hover:scale-105"
                    style={{ borderColor: currentStatus === 'None' ? 'rgb(209 213 219)' : currentStatus === 'Present' ? '#86efac' : currentStatus === 'Late' ? '#fcd34d' : currentStatus === 'Absent' ? '#fca5a5' : '#c4b5fd' }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: currentStatus === 'None' ? 'transparent' : currentStatus === 'Present' ? '#22c55e' : currentStatus === 'Late' ? '#f59e0b' : currentStatus === 'Absent' ? '#ef4444' : '#a78bfa' }}
                    />
                  </button>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-500 to-green-600 flex items-center justify-center text-white font-semibold shrink-0">
                    {student.avatar_url ? (
                      <img
                        src={resolveFileUrl(student.avatar_url)}
                        alt={student.student_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(student.student_name)
                    )}
                  </div>

                  {/* Name and Email */}
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-navy-800 truncate">{student.student_name}</p>
                    <p className="text-sm text-gray-500 truncate">{student.student_email}</p>
                  </div>

                  {/* Status Label */}
                  {showStatusText && (
                    <span className={cn('text-xs font-medium ml-2', style.text)}>
                      {currentStatus}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setLocalRecords({});
                  setHasChanges(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  const updates = Object.entries(localRecords).map(([studentId, status]) => ({
                    student_id: studentId,
                    status,
                  }));
                  updateAttendanceMutation.mutate(updates);
                }}
                disabled={updateAttendanceMutation.isPending}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50"
              >
                {updateAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      ) : sessions.length > 0 && students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No students enrolled in this course</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No meetings scheduled yet</p>
          <button
            onClick={() => setIsNewMeetingModalOpen(true)}
            className="btn btn-primary"
          >
            Create First Meeting
          </button>
        </div>
      )}
    </div>
  );
}

// Grades Tab
function GradesTab({ courseId, courseInfo }: { courseId: string; courseInfo?: { course_section_id: string; course_code: string; course_title: string; section_name: string; teacher_id?: string; teacher_name?: string; grade_level?: string; strand?: string; school_year?: string } }) {
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // For students, redirect to Report Card page
  if (isStudent) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
        <h3 className="mt-3 text-base font-medium text-slate-700">
          Your grades are on your Report Card
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Your adviser publishes your consolidated report card{' '}
          with grades from all subjects.
        </p>
        <Link
          href="/report-card"
          className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          View My Report Card →
        </Link>
      </div>
    );
  }

  // For teachers and admins - show subject gradebook only
  // Advisory teachers should access advisory grades from the dashboard
  return <TeacherGradesView courseSectionId={courseId} />;
}

export default function CoursePage() {
  const params = useParams();
  const courseId = params.id as string;
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialTab = (() => {
    const tab = searchParams.get('tab');
    return tab && tabs.some((item) => item.id === tab) ? tab : 'modules';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [previewFile, setPreviewFile] = useState<CourseFile | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const { courses, fetchCourses } = useCoursesStore();

  // Toggle activity publish status
  const toggleActivityPublish = async (activity: Activity) => {
    try {
      await activitiesApi.toggleActivityPublish(activity.id, !activity.is_published);
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
    } catch (error) {
      logger.error('Failed to toggle activity publish status:', error);
    }
  };

  // Toggle quiz publish status
  const toggleQuizPublish = async (quiz: Quiz) => {
    try {
      await quizzesApi.toggleQuizPublish(quiz.id, !quiz.is_published);
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
    } catch (error) {
      logger.error('Failed to toggle quiz publish status:', error);
    }
  };

  // Toggle file visibility status
  const toggleFileVisibility = async (file: CourseFile) => {
    try {
      await filesApi.toggleFileVisibility(file.id, !file.is_visible);
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
    } catch (error) {
      logger.error('Failed to toggle file visibility:', error);
    }
  };

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => filesApi.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
    },
    onError: (err) => {
      logger.error('Failed to delete file:', err);
    },
  });

  const handleDeleteFile = (file: CourseFile) => {
    deleteFileMutation.mutate(file.id);
  };

  const createAnnouncementMutation = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      announcementsApi.createAnnouncement({
        course_section_id: courseId,
        school_wide: false,
        audience: 'all',
        title,
        body,
        is_published: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
    },
    onError: (err) => {
      logger.error('Failed to create announcement:', err);
    },
  });

  // Update file week assignment
  const handleUpdateFileWeek = async (file: CourseFile, weekId: string | null) => {
    try {
      await filesApi.updateFile(file.id, { weekly_module_id: weekId });
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
    } catch (error) {
      logger.error('Failed to update file week assignment:', error);
    }
  };

  const handleUpdateModule = async (
    module: WeeklyModule,
    changes: { title: string; is_exam_week: boolean }
  ) => {
    try {
      await modulesApi.updateModule(module.id, {
        title: changes.title,
        is_exam_week: changes.is_exam_week,
      });
      queryClient.invalidateQueries({ queryKey: ['courseContent', courseId] });
    } catch (error) {
      logger.error('Failed to update module week settings:', error);
    }
  };

  // Download file
  const handleDownloadFile = async (file: CourseFile) => {
    try {
      await filesApi.downloadFile(file.file_url, file.file_name);
    } catch (err) {
      logger.error('Download failed:', err);
    }
  };

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
    staleTime: 0,
    refetchOnMount: true,
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
  const teacherName = courseDetail?.teacher?.full_name || (courseInfo as any)?.teacher_name || 'Teacher';
  const gradeLevel = courseDetail?.section?.grade_level || courseInfo?.grade_level;
  const strand = courseDetail?.section?.strand || courseInfo?.strand;
  const sectionId = courseDetail?.section?.id || (courseInfo as any)?.section_id;
  const subjectCategory = courseDetail?.course?.category || (courseInfo as any)?.category;
  const subjectTrackLabel = getApplicableSubjectTrack(subjectCategory);
  const isAdvisorySubject = Boolean(
    isTeacher
    && user?.advisory_section_id
    && (
      (sectionId && sectionId === user.advisory_section_id)
      || (user.advisory_section_name && sectionName === user.advisory_section_name)
    )
  );
  const teacherMetaLabel = isAdvisorySubject ? 'Advisory Subject' : teacherName;
  const studentCount = (courseDetail as any)?.student_count || (courseInfo as any)?.student_count;

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
        return <ModulesTab
          modules={modules}
          activities={activities}
          quizzes={quizzes}
          files={files}
          isTeacher={isTeacher}
          onToggleActivityPublish={toggleActivityPublish}
          onToggleQuizPublish={toggleQuizPublish}
          onToggleFileVisibility={toggleFileVisibility}
          onUpdateModule={handleUpdateModule}
          onPreviewFile={(file) => setPreviewFile(file)}
          onDownloadFile={handleDownloadFile}
        />;
      case 'assignments':
        return <AssignmentsTab activities={activities} isTeacher={isTeacher} onAddActivity={() => setIsActivityModalOpen(true)} onTogglePublish={toggleActivityPublish} />;
      case 'quizzes':
        return <QuizzesTab quizzes={quizzes} isTeacher={isTeacher} onAddQuiz={() => setIsQuizModalOpen(true)} onTogglePublish={toggleQuizPublish} />;
      case 'files':
        return (
          <FilesTab
            files={files}
            modules={modules}
            isTeacher={isTeacher}
            courseSectionId={courseId}
            onTogglePublish={toggleFileVisibility}
            onDelete={isTeacher ? handleDeleteFile : undefined}
            onUpdateWeek={handleUpdateFileWeek}
          />
        );
      case 'announcements':
        return (
          <AnnouncementsTab
            announcements={announcements}
            isTeacher={isTeacher}
            isCreating={createAnnouncementMutation.isPending}
            onCreateAnnouncement={(title, body) =>
              createAnnouncementMutation.mutate({ title, body })
            }
          />
        );
      case 'attendance':
        return <AttendanceTab courseId={courseId} />;
      case 'grades':
        return <GradesTab courseId={courseId} courseInfo={courseInfo as any} />;
      default:
        return <ModulesTab
          modules={modules}
          activities={activities}
          quizzes={quizzes}
          files={files}
          isTeacher={isTeacher}
          onUpdateModule={handleUpdateModule}
          onPreviewFile={(file) => setPreviewFile(file)}
          onDownloadFile={handleDownloadFile}
        />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
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
              {isStudent ? (
                <span>{teacherMetaLabel}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {teacherMetaLabel}
                </span>
              )}
              {!isStudent && (
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {(courseDetail as any)?.student_count ? `${(courseDetail as any).student_count} Students` : (courseInfo as any)?.student_count ? `${(courseInfo as any).student_count} Students` : 'Students'}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {gradeLevel} - {strand}
              </span>
              {subjectTrackLabel && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/25 text-white">
                  {subjectTrackLabel}
                </span>
              )}
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

      {/* Modals */}
      <CreateActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        courseId={courseId}
        modules={modules}
      />
      <CreateQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        courseId={courseId}
        modules={modules}
      />
    </div>
  );
}
