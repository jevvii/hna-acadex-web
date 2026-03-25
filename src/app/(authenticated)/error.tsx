'use client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { logger.error('Route error:', error); }, [error]);
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Error loading page</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700">Try Again</button>
      </div>
    </div>
  );
}