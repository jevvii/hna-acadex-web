import type {
  Profile,
  StudentCourse,
  TeacherCourse,
  CourseSectionDetail,
  CourseContent,
  WeeklyModule,
  ModuleItem,
  Activity,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  CourseFile,
  Announcement,
  MeetingSession,
  AttendanceStatus,
  AttendanceRecord,
  CalendarEvent,
  TodoItem,
  GradebookData,
  UserNotification,
  ActivityComment,
  Submission,
  Question,
} from './types';
import { API_BASE_URL } from './config';
import { logger } from './logger';
import { toMediaProxyUrl } from './utils';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Get CSRF token from meta tag for state-changing requests
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
}

/**
 * Check if the request is a state-changing method
 */
function isStateChangingMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  isFormData?: boolean;
};

async function request(path: string, options: RequestOptions = {}, retry = true) {
  const { method = 'GET', body, auth = true, isFormData = false } = options;
  const headers: Record<string, string> = {};

  // Add CSRF token for state-changing requests
  if (isStateChangingMethod(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body == null ? undefined : (isFormData ? body as FormData : JSON.stringify(body)),
    credentials: 'include', // Include HttpOnly cookies for authentication
  });

  if (res.status === 401 && auth) {
    // Check if user had a session before (via persisted auth state or cookies)
    // If not authenticated, this is just "not logged in" not "session expired"
    const hadSession = typeof window !== 'undefined' &&
      (document.cookie.includes('access_token') ||
       localStorage.getItem('auth-storage'));

    if (hadSession && retry) {
      // User WAS logged in but session expired
      throw new ApiError('Session expired. Please sign in again.', 401, null);
    }
    // User was never logged in - return null silently (caller should handle)
    return null;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data?.detail || data?.message || JSON.stringify(data) || 'Request failed';
    throw new ApiError(detail, res.status, data);
  }

  return data;
}

export const api = {
  get: (path: string, auth = true) => request(path, { method: 'GET', auth }),
  post: (path: string, body?: unknown, auth = true) => request(path, { method: 'POST', body, auth }),
  patch: (path: string, body?: unknown, auth = true) => request(path, { method: 'PATCH', body, auth }),
  put: (path: string, body?: unknown, auth = true) => request(path, { method: 'PUT', body, auth }),
  delete: (path: string, auth = true) => request(path, { method: 'DELETE', auth }),
  postForm: (path: string, formData: FormData, auth = true) =>
    request(path, { method: 'POST', body: formData, auth, isFormData: true }),
  patchForm: (path: string, formData: FormData, auth = true) =>
    request(path, { method: 'PATCH', body: formData, auth, isFormData: true }),
};

// Auth API - Uses HttpOnly cookies for authentication
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await api.post('/auth/login/', { email, password }, false);
    return data;
  },
  register: async (email: string, password: string, fullName: string, role: string) => {
    return api.post('/auth/register/', { email, password, full_name: fullName, role }, false);
  },
  logout: async () => {
    try {
      await api.post('/auth/logout/');
    } catch (error: unknown) {
      // Log logout errors but don't throw - user should still be logged out locally
      logger.error('Logout API call failed:', error);
    }
  },
  forgotPassword: async (email: string) => {
    return api.post('/auth/forgot-password/', { email }, false);
  },
  changePassword: async (newPassword: string) => {
    return api.post('/auth/change-password/', { new_password: newPassword });
  },
  getProfile: async () => {
    return api.get('/auth/me/');
  },
  updateProfile: async (profile: Partial<Profile>) => {
    return api.patch('/profiles/me/', profile);
  },
  uploadAvatar: async (formData: FormData) => {
    return api.postForm('/profiles/me/avatar/', formData);
  },
};

// Courses API
export const coursesApi = {
  getStudentCourses: async (): Promise<StudentCourse[]> => {
    return api.get('/courses/student/');
  },
  getTeacherCourses: async (): Promise<TeacherCourse[]> => {
    return api.get('/courses/teacher/');
  },
  getCourse: async (courseSectionId: string): Promise<CourseSectionDetail> => {
    return api.get(`/course-sections/${courseSectionId}/`);
  },
  getCourseContent: async (courseSectionId: string): Promise<CourseContent> => {
    return api.get(`/course-sections/${courseSectionId}/content/`);
  },
};

// Modules API - uses course-modules endpoint with course_section filter
export const modulesApi = {
  getModules: async (courseSectionId: string): Promise<WeeklyModule[]> => {
    return api.get(`/course-modules/?course_section=${courseSectionId}`);
  },
};

// Activities API - uses activities endpoint with course_section filter
export const activitiesApi = {
  getActivities: async (courseSectionId: string): Promise<Activity[]> => {
    return api.get(`/activities/?course_section=${courseSectionId}`);
  },
  getActivity: async (activityId: string): Promise<Activity> => {
    return api.get(`/activities/${activityId}/`);
  },
  submitActivity: async (activityId: string, formData: FormData) => {
    return api.postForm(`/activities/${activityId}/submit/`, formData);
  },
  getMySubmission: async (activityId: string): Promise<Submission | null> => {
    return api.get(`/activities/${activityId}/my-submissions/`);
  },
  getAllSubmissions: async (activityId: string) => {
    return api.get(`/activities/${activityId}/submissions/`);
  },
  gradeSubmission: async (submissionId: string, data: { score: number; feedback?: string }) => {
    return api.patch(`/activity-submissions/${submissionId}/grade/`, data);
  },
  createActivity: async (courseSectionId: string, formData: FormData) => {
    formData.append('course_section_id', courseSectionId);
    return api.postForm('/activities/', formData);
  },
  updateActivity: async (activityId: string, formData: FormData) => {
    return api.patchForm(`/activities/${activityId}/`, formData);
  },
  deleteActivity: async (activityId: string) => {
    return api.delete(`/activities/${activityId}/`);
  },
  toggleActivityPublish: async (activityId: string, isPublished: boolean) => {
    return api.patch(`/activities/${activityId}/`, { is_published: isPublished });
  },
};

// Quizzes API - uses quizzes endpoint with course_section filter
export const quizzesApi = {
  getQuizzes: async (courseSectionId: string): Promise<Quiz[]> => {
    return api.get(`/quizzes/?course_section=${courseSectionId}`);
  },
  getQuiz: async (quizId: string): Promise<Quiz> => {
    return api.get(`/quizzes/${quizId}/`);
  },
  takeQuiz: async (quizId: string): Promise<{ attempt_id: string; attempt_number: number; questions: QuizQuestion[]; time_remaining_seconds?: number; answers?: Array<{ question_id: string; selected_choice_id?: string; text_answer?: string }> }> => {
    return api.get(`/quizzes/${quizId}/take/`);
  },
  getLatestAttempt: async (quizId: string): Promise<QuizAttempt | null> => {
    return api.get(`/quizzes/${quizId}/my-latest-attempt/`);
  },
  saveProgress: async (quizId: string, attemptId: string, answers: Array<{ question_id: string; selected_choice_id?: string; text_answer?: string }>) => {
    return api.post(`/quizzes/${quizId}/save-progress/`, { attempt_id: attemptId, answers });
  },
  submitAttempt: async (quizId: string, attemptId: string | null, answers: Array<{ question_id: string; selected_choice_id?: string; text_answer?: string }>) => {
    const payload: Record<string, unknown> = { answers };
    if (attemptId) {
      payload.attempt_id = attemptId;
    }
    return api.post(`/quizzes/${quizId}/submit-attempt/`, payload);
  },
  getGradingList: async (quizId: string) => {
    return api.get(`/quizzes/${quizId}/grading/`);
  },
  gradeAnswer: async (answerId: string, data: { points_awarded: number; is_correct?: boolean }) => {
    return api.patch(`/quiz-answers/${answerId}/grade/`, data);
  },
  quickCreate: async (courseSectionId: string, data: {
    title: string;
    instructions?: string;
    time_limit_minutes?: number;
    attempt_limit: number;
    weekly_module_id?: string;
    open_at?: string;
    close_at?: string;
    questions: QuizQuestion[];
  }) => {
    return api.post('/quizzes/quick-create/', { course_section_id: courseSectionId, ...data });
  },
  createQuiz: async (courseSectionId: string, data: Partial<Quiz>) => {
    return api.post('/quizzes/', { course_section_id: courseSectionId, ...data });
  },
  updateQuiz: async (quizId: string, data: Partial<Quiz>) => {
    return api.patch(`/quizzes/${quizId}/`, data);
  },
  deleteQuiz: async (quizId: string) => {
    return api.delete(`/quizzes/${quizId}/`);
  },
  toggleQuizPublish: async (quizId: string, isPublished: boolean) => {
    return api.patch(`/quizzes/${quizId}/`, { is_published: isPublished });
  },
  getQuestions: async (quizId: string): Promise<Question[]> => {
    const data = await api.get(`/quizzes/${quizId}/questions/`);
    // Map backend 'choices' to frontend 'options'
    return data.map((q: Record<string, unknown>) => ({
      ...q,
      options: (q.choices as Array<Record<string, unknown>>)?.map((c: Record<string, unknown>) => ({
        id: c.id,
        text: c.choice_text,
        is_correct: c.is_correct,
        sort_order: c.sort_order,
      })),
    }));
  },
  bulkUpdateQuestions: async (quizId: string, questions: Question[]): Promise<Question[]> => {
    // Map frontend field names to backend field names
    const payload = {
      questions: questions.map((q, idx) => ({
        id: q.id.startsWith('new-') ? undefined : q.id,
        quiz_id: quizId,
        question_text: q.text,
        question_type: q.type,
        points: q.points,
        sort_order: idx,
        choices: q.options?.map((o, oidx) => ({
          id: o.id.startsWith('new-') ? undefined : o.id,
          choice_text: o.text,
          is_correct: o.is_correct,
          sort_order: oidx,
        })),
        correct_answer: q.correct_answer || '',
        alternate_answers: q.alternate_answers || [],
        case_sensitive: q.case_sensitive ?? false,
        word_limit: q.word_limit || null,
      })),
    };
    // Remove undefined values from payload
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    const data = await api.post(`/quizzes/${quizId}/questions/bulk/`, cleanPayload);
    // Map response back to frontend format
    return data.map((q: Record<string, unknown>) => ({
      ...q,
      text: q.question_text,
      type: q.question_type,
      options: (q.choices as Array<Record<string, unknown>>)?.map((c: Record<string, unknown>) => ({
        id: c.id,
        text: c.choice_text,
        is_correct: c.is_correct,
        sort_order: c.sort_order,
      })),
    }));
  },
};

// Files API - uses course-files endpoint with course_section filter
export const filesApi = {
  getFiles: async (courseSectionId: string): Promise<CourseFile[]> => {
    return api.get(`/course-files/?course_section=${courseSectionId}`);
  },
  uploadFile: async (courseSectionId: string, formData: FormData) => {
    formData.append('course_section_id', courseSectionId);
    return api.postForm('/course-files/', formData);
  },
  toggleFileVisibility: async (fileId: string, isVisible: boolean) => {
    return api.patch(`/course-files/${fileId}/`, { is_visible: isVisible });
  },
  deleteFile: async (fileId: string) => {
    return api.delete(`/course-files/${fileId}/`);
  },
  downloadFile: async (fileUrl: string, fileName: string) => {
    // Convert absolute URL to relative for Next.js proxy (avoids CSP issues with different IPs)
    const proxyUrl = toMediaProxyUrl(fileUrl);
    const response = await fetch(proxyUrl, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// Announcements API - uses announcements endpoint with course_section filter
export const announcementsApi = {
  getAnnouncements: async (courseSectionId?: string): Promise<Announcement[]> => {
    if (courseSectionId) {
      return api.get(`/announcements/?course_section=${courseSectionId}`);
    }
    return api.get('/announcements/');
  },
  createAnnouncement: async (announcement: Partial<Announcement>) => {
    return api.post('/announcements/', announcement);
  },
};

// Attendance API
export const attendanceApi = {
  getAttendanceOverview: async (courseSectionId: string) => {
    return api.get(`/course-sections/${courseSectionId}/attendance/`);
  },
  // Alias for components expecting getMeetings
  getMeetings: async (courseSectionId: string): Promise<MeetingSession[]> => {
    const data = await api.get(`/course-sections/${courseSectionId}/attendance/`);
    // Return sessions if available
    return data?.sessions || [];
  },
  getAttendance: async (meetingId: string): Promise<AttendanceRecord[]> => {
    // Get the session records
    const data = await api.get(`/attendance/sessions/${meetingId}/records/`);
    return data || [];
  },
  markAttendance: async (meetingId: string, studentId: string, status: AttendanceStatus, remarks?: string) => {
    return api.post(`/attendance/sessions/${meetingId}/records/`, {
      records: [{ student_id: studentId, status, remarks }]
    });
  },
  createSession: async (courseSectionId: string, date: string, title: string) => {
    return api.post(`/course-sections/${courseSectionId}/attendance/sessions/`, { date, title });
  },
  // Alias for components expecting createMeeting
  createMeeting: async (courseSectionId: string, date: string, title: string) => {
    return api.post(`/course-sections/${courseSectionId}/attendance/sessions/`, { date, title });
  },
  deleteSession: async (sessionId: string) => {
    return api.delete(`/attendance/sessions/${sessionId}/`);
  },
  updateRecords: async (sessionId: string, records: { student_id: string; status: string; remarks?: string }[]) => {
    return api.post(`/attendance/sessions/${sessionId}/records/`, { records });
  },
};

// Calendar API
export const calendarApi = {
  getEvents: async (startDate?: string, endDate?: string): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    const query = params.toString();
    return api.get(`/calendar-events/${query ? `?${query}` : ''}`);
  },
  createEvent: async (event: Partial<CalendarEvent>) => {
    return api.post('/calendar-events/', event);
  },
};

// Notifications API
export const notificationsApi = {
  getNotifications: async (): Promise<UserNotification[]> => {
    return api.get('/notifications/');
  },
  markAsRead: async (notificationId: string) => {
    return api.patch(`/notifications/${notificationId}/`, { is_read: true });
  },
  markAllAsRead: async () => {
    return api.post('/notifications/mark-all-read/');
  },
  deleteNotification: async (notificationId: string) => {
    return api.delete(`/notifications/${notificationId}/`);
  },
};

// Todo API
export const todoApi = {
  getTodos: async (): Promise<TodoItem[]> => {
    return api.get('/todos/');
  },
  createTodo: async (todo: Partial<TodoItem>) => {
    return api.post('/todos/', todo);
  },
  updateTodo: async (todoId: string, updates: Partial<TodoItem>) => {
    return api.patch(`/todos/${todoId}/`, updates);
  },
  deleteTodo: async (todoId: string) => {
    return api.delete(`/todos/${todoId}/`);
  },
};

// Grades API
export const gradesApi = {
  getGrades: async (courseSectionId: string) => {
    return api.get(`/course-sections/${courseSectionId}/grades/`);
  },
  // Alias for components expecting getMyGrades
  getMyGrades: async (courseSectionId: string) => {
    return api.get(`/course-sections/${courseSectionId}/grades/`);
  },
  getGradebook: async (courseSectionId: string): Promise<GradebookData> => {
    return api.get(`/course-sections/${courseSectionId}/gradebook/`);
  },
  overrideGrade: async (enrollmentId: string, overrideData: { midterm_override?: number; final_override?: number; remarks?: string }) => {
    return api.post(`/enrollments/${enrollmentId}/grade-override/`, overrideData);
  },
  exportCSV: async (courseSectionId: string) => {
    return api.get(`/course-sections/${courseSectionId}/grades/export/`);
  },
};

// Reminders API
export interface Reminder {
  id: string;
  user_id: string;
  reminder_type: 'activity' | 'quiz';
  activity_id?: string;
  quiz_id?: string;
  course_section_id?: string;
  activity_title?: string;
  activity_deadline?: string;
  reminder_datetime: string;
  offset_minutes: number;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export const reminderApi = {
  list: async (): Promise<Reminder[]> => {
    return api.get('/reminders/');
  },
  getByActivity: async (activityId: string): Promise<Reminder[]> => {
    return api.get(`/reminders/?activity_id=${activityId}`);
  },
  getByQuiz: async (quizId: string): Promise<Reminder[]> => {
    return api.get(`/reminders/?quiz_id=${quizId}`);
  },
  create: async (data: {
    reminder_type: 'activity' | 'quiz';
    activity_id?: string;
    quiz_id?: string;
    reminder_datetime: string;
    offset_minutes: number;
  }): Promise<Reminder> => {
    return api.post('/reminders/', data);
  },
  update: async (reminderId: string, data: Partial<Reminder>): Promise<Reminder> => {
    return api.patch(`/reminders/${reminderId}/`, data);
  },
  delete: async (reminderId: string): Promise<boolean> => {
    await api.delete(`/reminders/${reminderId}/`);
    return true;
  },
};

// Activity Comments API
export const activityCommentsApi = {
  getByActivity: async (activityId: string, options?: { submissionId?: string; studentId?: string }): Promise<ActivityComment[]> => {
    const params = new URLSearchParams();
    if (options?.submissionId) params.append('submission_id', options.submissionId);
    if (options?.studentId) params.append('student_id', options.studentId);
    const query = params.toString();
    return api.get(`/activities/${activityId}/comments/${query ? `?${query}` : ''}`);
  },
  create: async (data: {
    activity_id: string;
    content?: string;
    submission_id?: string;
    parent_id?: string;
    file_urls?: string[];
  }): Promise<ActivityComment> => {
    return api.post('/activity-comments/', data);
  },
  update: async (commentId: string, data: Partial<ActivityComment>): Promise<ActivityComment> => {
    return api.patch(`/activity-comments/${commentId}/`, data);
  },
  delete: async (commentId: string): Promise<boolean> => {
    await api.delete(`/activity-comments/${commentId}/`);
    return true;
  },
};