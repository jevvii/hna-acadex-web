'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AdvisoryGradebookView } from '@/components/grades';

export default function AdvisoryGradesPage() {
  const params = useParams<{ sectionId: string }>();
  const sectionId = params.sectionId;

  // Guard: sectionId must be available before rendering the gradebook
  if (!sectionId) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-navy-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <h1 className="font-display text-3xl font-bold text-navy-800 mb-6">
        Advisory Grades
      </h1>

      <AdvisoryGradebookView sectionId={sectionId} />
    </div>
  );
}