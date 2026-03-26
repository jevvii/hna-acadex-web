'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [errorCount, setErrorCount] = useState(0);
  const MAX_RETRIES = 2;

  useEffect(() => {
    // Prevent concurrent fetches and limit retries
    if (fetchingRef.current || errorCount >= MAX_RETRIES) return;

    // Skip auth check on login page
    if (pathname === '/login' || pathname === '/setup' || pathname === '/forgot-password') {
      return;
    }

    if (!isAuthenticated) {
      fetchingRef.current = true;
      fetchProfile()
        .then(() => {
          const state = useAuthStore.getState();
          if (!state.isAuthenticated) {
            // Only redirect to login if we haven't exceeded retries
            if (errorCount < MAX_RETRIES) {
              router.push('/login');
            }
          } else if (state.user?.requires_setup) {
            router.push('/setup');
          }
          // Reset error count on success
          setErrorCount(0);
        })
        .catch((error) => {
          console.error('Failed to fetch profile:', error);
          setErrorCount(prev => prev + 1);
          // Don't redirect on API errors - let the user see the page
          // This prevents redirect loops on network issues
        })
        .finally(() => {
          fetchingRef.current = false;
        });
    } else if (user?.requires_setup) {
      router.push('/setup');
    }
  }, [isAuthenticated, user?.requires_setup, router, fetchProfile, pathname, errorCount]);

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
