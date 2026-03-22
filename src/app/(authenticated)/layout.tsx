'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { motion } from 'framer-motion';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, fetchProfile } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      fetchProfile().then(() => {
        const state = useAuthStore.getState();
        if (!state.isAuthenticated) {
          router.push('/login');
        } else if (state.user?.requires_setup) {
          router.push('/setup');
        }
      });
    } else if (user?.requires_setup) {
      router.push('/setup');
    }
  }, [isAuthenticated, user?.requires_setup, router, fetchProfile]);

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
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
