'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { useIsStudent } from '@/store/auth';
import { gradingApi } from '@/lib/api';
import { StudentReportCard } from '@/lib/types';
import { ReportCardView } from '@/components/grades';

export default function ReportCardPage() {
  const router = useRouter();
  const isStudent = useIsStudent();

  const { data: reportCard, isLoading, error, refetch } = useQuery<StudentReportCard>({
    queryKey: ['studentReportCard'],
    queryFn: gradingApi.getStudentReportCard,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Redirect non-students to dashboard
  useEffect(() => {
    if (isStudent === false) {
      router.replace('/');
    }
  }, [isStudent, router]);

  // Still loading role
  if (isStudent === undefined || isStudent === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600" />
      </div>
    );
  }

  if (!isStudent) {
    return null;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header with Print Button */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-navy-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <h1 className="font-display text-3xl font-bold text-navy-800 mb-6 print:hidden">
        My Report Card
      </h1>

      {/* Report Card Content */}
      <div className="rounded-xl overflow-hidden shadow-card print:shadow-none print:rounded-none">
        <ReportCardView
          reportCard={reportCard}
          isLoading={isLoading}
          error={error as Error | null}
          onRetry={() => refetch()}
        />
      </div>
    </div>
  );
}