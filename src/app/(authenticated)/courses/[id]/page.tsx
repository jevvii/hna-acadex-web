'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

  if (!modules?.length) return <EmptyState message="No modules available" />;

  return (
    <div className="space-y-4">
      {modules.map((module) => {
        // Derive module items from activities, quizzes, and files that belong to this module
        const modActivities = activities.filter((a) => a.weekly_module_id === module.id);
        const modQuizzes = quizzes.filter((q) => q.weekly_module_id === module.id);
        const modFiles = files.filter((f) => f.weekly_module_id === module.id);

        // Combine all items with their type for display
        const moduleItems = [
          ...modActivities.map((a) => ({
            id: a.id,
            type: 'activity' as const,
            title: a.title,
            meta: a.deadline ? `Due ${formatDate(a.deadline)}` : 'No due date',
            published: a.is_published,
          })),
          ...modQuizzes.map((q) => ({
            id: q.id,
            type: 'quiz' as const,
            title: q.title,
            meta: q.time_limit_minutes ? `${q.time_limit_minutes} min` : `${q.question_count || 0} questions`,
            published: q.is_published,
          })),
          ...modFiles.map((f) => ({
            id: f.id,
            type: 'file' as const,
            title: f.file_name,
            meta: formatFileSize(f.file_size_bytes),
            published: f.is_visible,
          })),
        ];

        return (
          <div key={module.id} className="bg-white rounded-xl shadow-card overflow-hidden">
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
                  <span className="font-display font-bold text-navy-600">
                    {module.is_exam_week ? 'EX' : `W${module.week_number}`}
                  </span>
                </div>
                <div className="text-left">
                  <h3 className="font-display font-semibold text-navy-800">{module.title}</h3>
                  <p className="text-sm text-gray-500">{module.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  module.is_published
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {module.is_published ? 'Published' : 'Draft'}
                </span>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-gray-400 transition-transform',
                    expandedModules.has(module.id) && 'rotate-180'
                  )}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedModules.has(module.id) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-2">
                    {moduleItems.length > 0 ? (
                      moduleItems.map((item, index) => (
                        <motion.div
                          key={`${item.type}-${item.id}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          {item.type === 'file' && <FolderOpen className="w-5 h-5 text-blue-500" />}
                          {item.type === 'activity' && <FileText className="w-5 h-5 text-green-500" />}
                          {item.type === 'quiz' && <ClipboardCheck className="w-5 h-5 text-orange-500" />}
                          <div className="flex-1">
                            <span className="text-navy-700">{item.title}</span>
                            {item.meta && <span className="text-sm text-gray-400 ml-2">{item.meta}</span>}
                          </div>
                          {!item.published && (
                            <span className="text-xs text-gray-400">Draft</span>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-gray-500 py-4">No items in this module</p>
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
  const getStatusBadge = (activity: Activity) => {
    const submission = activity.my_submission;
    if (!submission) {
      return <span className="badge badge-warning">Not Started</span>;
    }
    switch (submission.status) {
      case 'graded':
        return <span className="badge badge-success">Graded: {submission.score}</span>;
      case 'submitted':
        return <span className="badge badge-info">Submitted</span>;
      case 'late':
        return <span className="badge badge-error">Late</span>;
      default:
        return <span className="badge badge-warning">Not Started</span>;
    }
  };

  const assignments = activities?.filter((a) => a.is_published) || [];
  if (!assignments.length) return <EmptyState message="No assignments available" />;

  return (
    <div className="space-y-4">
      {assignments.map((activity: Activity) => (
        <div key={activity.id} className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-navy-800">{activity.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {activity.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Due {formatDate(activity.deadline)}
                    </span>
                  )}
                  <span>{activity.points} pts</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(activity)}
              <button className="btn btn-outline">
                {activity.my_submission ? 'View' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Quizzes Tab
function QuizzesTab({ quizzes }: { quizzes: Quiz[] }) {
  const publishedQuizzes = quizzes?.filter((q) => q.is_published) || [];
  if (!publishedQuizzes.length) return <EmptyState message="No quizzes available" />;

  return (
    <div className="space-y-4">
      {publishedQuizzes.map((quiz) => (
        <div key={quiz.id} className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-navy-800">{quiz.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{quiz.question_count || 0} questions</span>
                  {quiz.time_limit_minutes && <span>{quiz.time_limit_minutes} min</span>}
                  <span>{quiz.attempt_limit} attempts allowed</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {quiz.my_attempt?.is_submitted ? (
                <>
                  <span className="badge badge-success">
                    Score: {quiz.my_attempt.score}/{quiz.my_attempt.max_score}
                  </span>
                  <button className="btn btn-outline">Review</button>
                </>
              ) : quiz.my_in_progress_attempt ? (
                <button className="btn btn-primary">Continue</button>
              ) : (
                <button className="btn btn-primary">Start Quiz</button>
              )}
            </div>
          </div>
        </div>
      ))}
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

  // Find course metadata from the courses list
  const courseInfo = courses.find((c) => c.course_section_id === courseId);
  const courseCode = courseInfo?.course_code || 'COURSE';
  const courseTitle = courseInfo?.course_title || 'Course Title';
  const sectionName = courseInfo?.section_name || 'SECTION';

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
            <div className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <span className="text-gold-400">{courseCode}</span>
              <span>@</span>
              <span>{sectionName}</span>
            </div>
            <h1 className="font-display text-4xl font-bold">{courseTitle}</h1>
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
      <div className="p-8 max-w-5xl">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
}
