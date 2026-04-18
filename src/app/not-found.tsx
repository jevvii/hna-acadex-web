import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-4xl font-bold text-[#1A3A6B]">404</h1>
      <p className="mt-2 text-lg text-gray-600">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-[#1A3A6B] px-6 py-2 text-white hover:bg-[#142d55]"
      >
        Go home
      </Link>
    </div>
  );
}