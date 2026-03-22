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
  CourseFile,
  Announcement,
  MeetingSession,
  AttendanceStatus,
  AttendanceRecord,
  CalendarEvent,
  TodoItem,
  GradebookData,
  UserNotification,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const ACCESS_TOKEN_KEY = 'hna_access_token';
const REFRESH_TOKEN_KEY = 'hna_refresh_token';

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(access: string, refresh: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.access) return null;

  localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  return data.access as string;
}

type RequestOptions = {
  method?: string;
  body?: any;
  auth?: boolean;
  isFormData?: boolean;
};

async function request(path: string, options: RequestOptions = {}, retry = true) {
  const { method = 'GET', body, auth = true, isFormData = false } = options;
  const headers: Record<string, string> = {};

  let token = auth ? getAccessToken() : null;
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body == null ? undefined : (isFormData ? body : JSON.stringify(body)),
  });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      clearAuthTokens();
      throw new ApiError('Session expired. Please sign in again.', 401, null);
    }
    return request(path, options, false);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data?.detail || data?.message || JSON.stringify(data) || 'Request failed';
    console.error('API Error:', res.status, detail);
    throw new ApiError(detail, res.status, data);
  }

  return data;
}

export const api = {
  get: (path: string, auth = true) => request(path, { method: 'GET', auth }),
  post: (path: string, body?: any, auth = true) => request(path, { method: 'POST', body, auth }),
  patch: (path: string, body?: any, auth = true) => request(path, { method: 'PATCH', body, auth }),
  put: (path: string, body?: any, auth = true) => request(path, { method: 'PUT', body, auth }),
  delete: (path: string, auth = true) => request(path, { method: 'DELETE', auth }),
  postForm: (path: string, formData: FormData, auth = true) =>
    request(path, { method: 'POST', body: formData, auth, isFormData: true }),
  patchForm: (path: string, formData: FormData, auth = true) =>
    request(path, { method: 'PATCH', body: formData, auth, isFormData: true }),
};

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await api.post('/auth/login/', { email, password }, false);
    if (data.access && data.refresh) {
      setAuthTokens(data.access, data.refresh);
    }
    return data;
  },
  register: async (email: string, password: string, fullName: string, role: string) => {
    return api.post('/auth/register/', { email, password, full_name: fullName, role }, false);
  },
  logout: async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await api.post('/auth/logout/', { refresh });
      } catch (e) {
        // Ignore logout errors
      }
    }
    clearAuthTokens();
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
  submitActivity: async (activityId: string, submission: { text_content?: string; file_urls?: string[] }) => {
    return api.post(`/activities/${activityId}/submit/`, submission);
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
  takeQuiz: async (quizId: string) => {
    return api.get(`/quizzes/${quizId}/take/`);
  },
  submitAttempt: async (quizId: string, answers: Record<string, any>) => {
    return api.post(`/quizzes/${quizId}/submit-attempt/`, { answers });
  },
};

// Files API - uses course-files endpoint with course_section filter
export const filesApi = {
  getFiles: async (courseSectionId: string): Promise<CourseFile[]> => {
    return api.get(`/course-files/?course_section=${courseSectionId}`);
  },
  uploadFile: async (courseSectionId: string, formData: FormData) => {
    formData.append('course_section', courseSectionId);
    return api.postForm('/course-files/', formData);
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
