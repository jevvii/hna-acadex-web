'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-2xl font-bold text-[#1A3A6B]">Something went wrong</h1>
      <p className="mt-2 text-gray-600">An unexpected error occurred.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-[#1A3A6B] px-6 py-2 text-white hover:bg-[#142d55]"
      >
        Try again
      </button>
    </div>
  );
}