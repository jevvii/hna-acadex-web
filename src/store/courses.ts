import { create } from 'zustand';
import { StudentCourse, TeacherCourse, CourseSectionDetail } from '@/lib/types';
import { coursesApi } from '@/lib/api';
import { useAuthStore } from './auth';

interface CoursesState {
  courses: (StudentCourse | TeacherCourse)[];
  currentCourse: CourseSectionDetail | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCourses: () => Promise<void>;
  fetchCourse: (courseSectionId: string) => Promise<void>;
  clearCurrentCourse: () => void;
  clearError: () => void;
}

export const useCoursesStore = create<CoursesState>()((set) => ({
  courses: [],
  currentCourse: null,
  isLoading: false,
  error: null,

  fetchCourses: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const courses = user?.role === 'teacher'
        ? await coursesApi.getTeacherCourses()
        : await coursesApi.getStudentCourses();
      set({ courses });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch courses';
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCourse: async (courseSectionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const course = await coursesApi.getCourse(courseSectionId);
      set({ currentCourse: course });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch course';
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  clearCurrentCourse: () => set({ currentCourse: null }),
  clearError: () => set({ error: null }),
}));
