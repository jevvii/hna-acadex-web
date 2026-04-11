export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive';
export type StrandType = 'STEM' | 'ABM' | 'HUMSS' | 'TVL' | 'GAS' | 'NONE';
export type GradeLevel =
  | 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10'
  | 'Grade 11' | 'Grade 12';
export type SubmissionStatus = 'not_submitted' | 'submitted' | 'late' | 'graded';
export type ScoreSelectionPolicy = 'latest' | 'highest';

export type ActivityStatus = 'not-submitted' | 'submitted' | 'graded';

export interface AttemptDisplay {
  id: number;
  date: string;
  score?: number;
  status: SubmissionStatus;
  submitted_at: string;
}

export type NotificationType =
  | 'new_activity' | 'new_quiz' | 'new_exam' | 'grade_released'
  | 'course_announcement' | 'school_announcement' | 'system';
export type AnnouncementAudience = 'teachers_only' | 'all';
export type EventType = 'deadline' | 'exam' | 'personal' | 'holiday' | 'school_event';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
export type QuizQuestionType =
  | 'multiple_choice' | 'multi_select' | 'true_false'
  | 'identification' | 'essay';

// Frontend state types for quiz builder
export interface QuestionOption {
  id: string;
  text: string;  // Maps to 'choice_text' in API
  is_correct: boolean;
  sort_order: number;
}

export interface Question {
  id: string;  // 'new-{uuid}' for new questions, UUID string for existing
  type: QuizQuestionType;
  text: string;  // HTML from Tiptap
  points: number;
  sort_order: number;
  options?: QuestionOption[];  // For mcq, multi_select, true_false
  correct_answer?: string;  // For identification
  alternate_answers?: string[];  // For identification
  case_sensitive?: boolean;  // For identification
  word_limit?: number;  // For essay
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  grade_level?: GradeLevel;
  strand?: StrandType;
  section?: string;
  employee_id?: string;
  student_id?: string;
  theme?: 'light' | 'dark' | 'system';
  requires_setup?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  name: string;
  grade_level: GradeLevel;
  strand: StrandType;
  school_year: string;
  is_active: boolean;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  color_overlay?: string;
  grade_level?: GradeLevel;
  strand?: StrandType;
  school_year: string;
  semester?: string;
  num_weeks?: number;
  is_active: boolean;
}

export interface CourseSection {
  id: string;
  course_id: string;
  section_id: string;
  teacher_id?: string;
  school_year: string;
  semester?: string;
  is_active: boolean;
}

export interface CourseSectionDetail extends CourseSection {
  course: Course;
  section: Section;
  teacher?: Profile;
}

export interface CourseContent {
  modules: WeeklyModule[];
  activities: Activity[];
  files: CourseFile[];
  announcements: Announcement[];
  quizzes: Quiz[];
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_section_id: string;
  final_grade?: number;
  is_active: boolean;
  enrolled_at: string;
}

export interface GradeSummary {
  graded_items_count: number;
  total_items_count: number;
  pending_items_count: number;
  excluded_items_count: number;
  has_pending: boolean;
  has_released_grades: boolean;
  has_no_gradeable_items: boolean;
  is_partial: boolean;
}

export interface StudentCourse {
  student_id: string;
  course_section_id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  cover_image_url?: string;
  color_overlay?: string;
  section_name: string;
  strand: StrandType;
  grade_level: GradeLevel;
  final_grade?: number;
  final_grade_letter?: string;
  grade_overridden?: boolean;
  teacher_name?: string;
  course_tag: string;
  semester?: string;
  school_year: string;
  grade_summary?: GradeSummary;
}

export interface TeacherCourse {
  teacher_id: string;
  course_section_id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  cover_image_url?: string;
  color_overlay?: string;
  section_name: string;
  strand: StrandType;
  grade_level: GradeLevel;
  course_tag: string;
  student_count: number;
  semester?: string;
  school_year: string;
}

export interface WeeklyModule {
  id: string;
  course_section_id: string;
  week_number: number;
  title: string;
  description?: string;
  is_exam_week: boolean;
  is_published: boolean;
  sort_order: number;
  updated_at?: string;
  items?: ModuleItem[];
}

export interface ModuleItem {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  item_type: 'file' | 'link' | 'activity' | 'quiz' | 'label';
  file_url?: string;
  external_url?: string;
  activity_id?: string;
  quiz_id?: string;
  sort_order: number;
  is_published: boolean;
}

export interface Activity {
  id: string;
  course_section_id: string;
  weekly_module_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  points: number;
  deadline?: string;
  allow_late_submissions?: boolean;
  allowed_file_types?: string[];
  support_file_url?: string;
  attempt_limit?: number;
  score_selection_policy?: ScoreSelectionPolicy;
  is_published: boolean;
  created_by?: string;
  student_count?: number;
  created_at: string;
  my_submission?: {
    id: string;
    status: SubmissionStatus;
    score?: number;
    feedback?: string;
    text_content?: string;
    file_urls?: string[];
    submitted_at?: string;
    attempt_number?: number;
  } | null;
  my_submissions?: Submission[];
  attempts_used?: number;
  attempts_remaining?: number;
  class_stats?: {
    lowest_score?: number | null;
    highest_score?: number | null;
    average_score?: number | null;
  };
  // Teacher stats
  submission_count?: number;
  graded_count?: number;
}

export interface Submission {
  id: string;
  activity_id: string;
  student_id: string;
  attempt_number?: number;
  file_urls?: string[];
  text_content?: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  submitted_at?: string;
  graded_at?: string;
}

export interface CourseFile {
  id: string;
  course_section_id: string;
  weekly_module_id?: string;
  uploader_id?: string;
  file_name: string;
  file_url: string;
  preview_file_url?: string;
  file_type?: string;
  file_size_bytes?: number;
  category: 'module' | 'assignment' | 'quiz' | 'general';
  folder_path: string;
  is_visible: boolean;
  created_at: string;
}

export interface Quiz {
  id: string;
  course_section_id: string;
  weekly_module_id?: string;
  title: string;
  instructions?: string;
  time_limit_minutes?: number;
  attempt_limit: number;
  points?: number;
  question_count?: number;
  questions?: QuizQuestion[];
  score_selection_policy?: ScoreSelectionPolicy;
  open_at?: string;
  close_at?: string;
  is_published: boolean;
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  show_results: boolean;
  created_at: string;
  student_count?: number;
  my_attempt?: {
    id: string;
    score?: number;
    max_score?: number;
    pending_manual_grading: boolean;
    is_submitted: boolean;
    attempt_number: number;
    attempts_used?: number;
    attempts_remaining?: number;
    attempt_limit?: number;
  } | null;
  my_in_progress_attempt?: {
    attempt_id: string;
    attempt_number: number;
    time_remaining_seconds?: number | null;
  } | null;
  attempts?: Array<{
    id: string;
    attempt_number: number;
    score?: number;
    max_score?: number;
    pending_manual_grading: boolean;
    is_submitted: boolean;
    submitted_at?: string;
  }>;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  sort_order: number;
  matching_pairs?: { left: string; right: string }[];
  image_url?: string;
}

export interface QuizChoice {
  id: string;
  question_id: string;
  choice_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at?: string;
  score?: number;
  max_score?: number;
  time_taken_seconds?: number;
  is_submitted: boolean;
}

export interface Announcement {
  id: string;
  course_section_id?: string;
  school_wide: boolean;
  audience: AnnouncementAudience;
  title: string;
  body: string;
  attachment_urls?: string[];
  created_by?: string;
  scheduled_at?: string;
  is_published: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  creator_id?: string;
  course_section_id?: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_at: string;
  end_at?: string;
  all_day: boolean;
  color?: string;
  is_personal: boolean;
}

export interface TodoItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_at?: string;
  is_done: boolean;
  activity_id?: string;
  quiz_id?: string;
  course_section_id?: string;
  completed_at?: string;
  created_at: string;
}

export interface UserNotification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  course_section_id?: string;
  activity_id?: string;
  quiz_id?: string;
  announcement_id?: string;
  submission_id?: string;
  is_read: boolean;
  created_at: string;
}

// Keep backward compatibility alias
type Notification = UserNotification;

export interface MeetingSession {
  id: string;
  course_section_id: string;
  date: string;
  title: string;
  created_by_id?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  meeting_id: string;
  student_id: string;
  status: AttendanceStatus;
  remarks?: string;
  marked_by_id?: string;
  updated_at: string;
  created_at: string;
}

export interface AttendanceSummary {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
}

export interface AttendanceHistoryItem {
  meeting_id: string;
  date: string;
  title: string;
  status: AttendanceStatus | null;  // null means unmarked/not recorded
  remarks?: string | null;
}

export interface AttendanceOverviewStudent {
  course_section_id: string;
  sessions: MeetingSession[];
  summary: AttendanceSummary;
  history: AttendanceHistoryItem[];
  updated_at: string;
}

export interface AttendanceStudent {
  student_id: string;
  student_name: string;
  student_email: string;
  avatar_url?: string | null;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
}

export interface AttendanceOverviewTeacher {
  course_section_id: string;
  sessions: MeetingSession[];
  students: AttendanceStudent[];
  records: AttendanceRecord[];
  updated_at: string;
}

export interface StudentUploadedFile {
  id: string;
  student_id: string;
  submission_id?: string;
  activity_id?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_bytes?: number;
  uploaded_at: string;
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  submission_id?: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  parent_id?: string;
  content?: string;
  file_urls?: string[];
  created_at: string;
  updated_at: string;
  replies?: ActivityComment[];
}

export interface GradebookActivityGrade {
  activity_id: string;
  title: string;
  points: number;
  deadline?: string;
  score?: number;
  status?: 'graded' | 'submitted' | 'late' | 'not_submitted';
  is_late: boolean;
  is_excused: boolean;
  graded_at?: string;
  is_na?: boolean;
}

export interface GradebookQuizGrade {
  quiz_id: string;
  title: string;
  max_score: number;
  close_at?: string;
  score?: number;
  attempts: number;
  max_attempts: number;
  is_late: boolean;
  is_na?: boolean;
  pending_grading?: boolean;
}

export interface GradebookStudent {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_avatar?: string;
  enrolled_at?: string;
  is_active: boolean;
  grades: {
    activities: GradebookActivityGrade[];
    quizzes: GradebookQuizGrade[];
  };
  final_grade?: number;
  final_grade_letter?: string;
  grade_overridden: boolean;
  manual_final_grade?: number;
}

export interface GradebookItem {
  id: string;
  title: string;
  type: 'activity' | 'quiz';
  max_points: number;
  deadline?: string;
  created_at: string;
}

export interface GradebookSummary {
  activity_id?: string;
  quiz_id?: string;
  avg_score?: number;
  high_score?: number;
  low_score?: number;
  missing_count: number;
  needs_grading_count: number;
}

export interface GradebookData {
  students: GradebookStudent[];
  inactive_students: GradebookStudent[];
  items: {
    activities: GradebookItem[];
    quizzes: GradebookItem[];
  };
  summary: {
    activities: GradebookSummary[];
    quizzes: GradebookSummary[];
  };
}

// API Error type for proper error handling
export interface ApiErrorResponse {
  message?: string;
  detail?: string;
  error?: string;
  [key: string]: unknown;
}

// Quiz grading attempt type
export interface QuizGradingAttempt {
  student_id: string;
  student_name: string;
  student_email: string;
  score?: number;
  max_score?: number;
  submitted_at?: string;
  time_taken_seconds?: number;
  status: 'not_submitted' | 'submitted' | 'graded';
  pending_manual_grading?: boolean;
  attempt_number?: number;
}

// Quiz question choice type
export interface QuizQuestionChoice {
  id: string;
  choice_text: string;
  is_correct: boolean;
}

// Quiz question with choices (extended type)
export interface QuizQuestionWithChoices extends QuizQuestion {
  choices?: QuizQuestionChoice[];
  blanks?: { id: string; correct_answer: string }[];
}

// Extended QuizQuestion type for taking quiz
export interface QuizQuestionWithData extends QuizQuestion {
  choices?: QuizQuestionChoice[];
  blanks?: { id: string; correct_answer: string }[];
}

// Builder question types (frontend state)
export interface QuestionOption {
  id: string;
  text: string;  // Maps to 'choice_text' in API
  is_correct: boolean;
  sort_order: number;
}

export interface Question {
  id: string;  // 'new-${uuid}' for new, uuid string for existing
  type: QuizQuestionType;
  text: string;  // HTML from Tiptap
  points: number;
  sort_order: number;
  options?: QuestionOption[];  // Maps to 'choices' in API
  correct_answer?: string;  // For identification type
  alternate_answers?: string[];  // For identification type
  case_sensitive?: boolean;  // For identification type
  word_limit?: number;  // For essay type
}

// Meeting with attendance records
export interface MeetingWithAttendance extends MeetingSession {
  attendance_records?: AttendanceRecord[];
  student_count?: number;
  present_count?: number;
  absent_count?: number;
  late_count?: number;
}

// Quiz builder types
export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface Question {
  id: string;
  type: QuizQuestionType;
  text: string;
  points: number;
  sort_order: number;
  options?: QuestionOption[];
  correct_answer?: string;
  alternate_answers?: string[];
  case_sensitive?: boolean;
  word_limit?: number;
}

// Quiz Builder types (frontend state)
export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface Question {
  id: string;
  type: QuizQuestionType;
  text: string;
  points: number;
  sort_order: number;
  options?: QuestionOption[];
  correct_answer?: string;
  alternate_answers?: string[];
  case_sensitive?: boolean;
  word_limit?: number;
}

// Attendance types
export interface AttendanceSummary {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
}

export interface AttendanceHistoryItem {
  meeting_id: string;
  date: string;
  title: string;
  status: AttendanceStatus | null;  // null means unmarked/not recorded
  remarks?: string | null;
}

export interface AttendanceOverviewStudent {
  course_section_id: string;
  sessions: MeetingSession[];
  summary: AttendanceSummary;
  history: AttendanceHistoryItem[];
  updated_at: string;
}

export interface AttendanceStudent {
  student_id: string;
  student_name: string;
  student_email: string;
  avatar_url?: string | null;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
}

export interface AttendanceOverviewTeacher {
  course_section_id: string;
  sessions: MeetingSession[];
  students: AttendanceStudent[];
  records: AttendanceRecord[];
  updated_at: string;
}

// Grading Period types
// All periods are quarters now
// semester_group: 1 for Q1+Q2 (1st Sem), 2 for Q3+Q4 (2nd Sem), null for Grades 7-10

export interface GradingPeriod {
  id: string;
  school_year: string;
  period_type: 'quarter';  // Always quarter now
  period_number: number;  // 1-4 for Q1-Q4
  semester_group: number | null;  // 1 for 1st Sem, 2 for 2nd Sem, null for Grades 7-10
  label: string;  // 'Q1', 'Q2', 'Q3', 'Q4'
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradeEntry {
  id: string;
  enrollment_id: string;
  grading_period_id: string;
  course_section_id?: string;
  student_name?: string;
  period_label: string;
  score: number | null;
  computed_score: number | null;
  override_score: number | null;
  is_published: boolean;
  computed_at: string;
  created_at: string;
  updated_at: string;
}

// Student grade view types
export interface StudentPeriodGrade {
  period: GradingPeriod;
  score: number | null;
  is_published: boolean;
}

export interface StudentGradeData {
  course_section_id: string;
  course_code: string;
  course_title: string;
  grade_level: GradeLevel;
  periods: StudentPeriodGrade[];
  final_grade: number | null;
  final_grade_letter: string | null;
  is_final_published: boolean;
}

// Subject teacher gradebook types
export interface SubjectPeriodGrade {
  period_id: string;
  period_label: string;
  grade_entry_id: string | null;
  computed_score: number | null;
  override_score: number | null;
  score: number | null;
  is_published: boolean;
}

export interface SubjectStudentGrade {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  periods: SubjectPeriodGrade[];
  final_grade: number | null;
  final_grade_letter: string | null;
  is_final_published?: boolean;
}

export interface SubjectGradeData {
  course_section_id: string;
  course_code: string;
  course_title: string;
  grade_level: GradeLevel;
  semester_group: number | null;  // For Grades 11-12: 1 or 2, for Grades 7-10: null
  periods: GradingPeriod[];
  submissions: GradeSubmission[];
  students: SubjectStudentGrade[];
  all_final_published?: boolean;  // True if all students' final grades are published
}

// Advisory teacher grade view types
export interface AdvisorySubjectGrade {
  subject_id: string;
  subject_code: string;
  subject_title: string;
  teacher_name: string;
  periods: {
    period_label: string;
    score: number | null;
    is_published: boolean;
  }[];
  final_grade: number | null;
  final_grade_letter: string | null;
}

export interface AdvisoryStudentGrade {
  student_id: string;
  student_name: string;
  subjects: AdvisorySubjectGrade[];
  final_average: number | null;
}

export interface AdvisoryGradeData {
  section_id: string;
  section_name: string;
  grade_level: GradeLevel;
  strand: StrandType;
  school_year: string;
  periods: GradingPeriod[];
  students: AdvisoryStudentGrade[];
}

// Grade weight configuration types
export interface GradeWeightConfig {
  id: string;
  course_section: string;
  written_works: number;
  performance_tasks: number;
  quarterly_assessment: number;
  is_customized: boolean;
  subject_category: string | null;
  category_label: string | null;
  updated_at: string;
}

// Grade submission types
export interface GradeSubmission {
  grading_period_id: string;
  period_label: string;
  status: 'draft' | 'submitted' | 'published';
  submitted_by: string | null;
  submitted_at: string | null;
}

export interface SectionReportCard {
  id: string;
  section_id: string;
  grading_period_id: string;
  is_published: boolean;
  published_by: string | null;
  published_at: string | null;
}

export interface StudentReportCard {
  section_name: string;
  grade_level: string;
  strand: string | null;
  school_year: string;
  periods: GradingPeriod[];
  subjects: {
    course_section_id: string;
    course_code: string;
    course_title: string;
    teacher_name: string;
    period_grades: {
      period_label: string;
      score: number | null;
      adviser_overridden: boolean;
    }[];
    final_grade: number | null;
    final_grade_letter: string | null;
  }[];
  overall_average: number | null;
}

export interface AdvisorySubmissionStatus {
  course_section_id: string;
  course_code: string;
  course_title: string;
  teacher_name: string;
  periods: {
    grading_period_id: string;
    period_label: string;
    status: 'draft' | 'submitted' | 'published';
    submitted_at: string | null;
  }[];
}
