import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile, UserRole } from '@/lib/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: Profile | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user && !user?.requires_setup }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.login(email, password);

          if (!data) {
            throw new Error('Empty response from server');
          }

          // Handle users that require setup (new accounts, password reset flow)
          const user = data.user || null;
          const requiresSetup = data.requires_setup || user?.requires_setup;

          if (requiresSetup) {
            set({
              user,
              isAuthenticated: false,
              error: null
            });
            return;
          }

          if (user) {
            // Check user status
            if (user.status === 'inactive') {
              throw new Error('Your account is inactive. Please contact your administrator.');
            }

            set({ user, isAuthenticated: true });
          } else {
            throw new Error('Invalid server response: user data missing');
          }
        } catch (error: any) {
          set({
            error: error.message || 'Login failed. Please check your credentials.',
            isAuthenticated: false,
            user: null
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (e) {
          // Ignore logout errors
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      fetchProfile: async () => {
        try {
          const user = await authApi.getProfile();
          set({ user, isAuthenticated: !user?.requires_setup });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Role-based selectors
export const useUserRole = () => useAuthStore((state) => state.user?.role);
export const useIsTeacher = () => useAuthStore((state) => state.user?.role === 'teacher');
export const useIsStudent = () => useAuthStore((state) => state.user?.role === 'student');
export const useIsAdmin = () => useAuthStore((state) => state.user?.role === 'admin');
