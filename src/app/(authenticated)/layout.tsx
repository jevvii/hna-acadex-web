'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { motion } from 'framer-motion';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, fetchProfile } = useAuthStore();
  const fetchingRef = useRef(false);

  useEffect(() => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;

    // Skip auth check on login page (these routes shouldn't use this layout, but be safe)
    if (pathname === '/login' || pathname === '/setup' || pathname === '/forgot-password') {
      return;
    }

    if (!isAuthenticated) {
      // Check if there's evidence of a previous session before calling fetchProfile
      // This prevents unnecessary API calls and console errors for users who were never logged in
      const hasSessionCookie = document.cookie.includes('access_token');
      const hasPersistedAuth = localStorage.getItem('auth-storage');
      const hadSession = hasSessionCookie || hasPersistedAuth;

      if (hadSession) {
        // User appears to have had a session - verify it with the backend
        fetchingRef.current = true;
        fetchProfile()
          .then(() => {
            const state = useAuthStore.getState();
            if (!state.isAuthenticated) {
              // Session was invalid/expired - redirect to login
              router.push('/login');
            } else if (state.user?.requires_setup) {
              router.push('/setup');
            }
          })
          .catch(() => {
            // Session expired or invalid - redirect to login
            router.push('/login');
          })
          .finally(() => {
            fetchingRef.current = false;
          });
      } else {
        // No evidence of previous session - redirect to login silently
        router.push('/login');
      }
    } else if (user?.requires_setup) {
      router.push('/setup');
    }
  }, [isAuthenticated, user?.requires_setup, router, fetchProfile, pathname]);

  // Show loading spinner while checking auth or if user needs setup
  if (!isAuthenticated || user?.requires_setup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-navy-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="ml-64 min-h-screen">
          {children}
        </main>
      </div>
    </ErrorBoundary>
  );
}
