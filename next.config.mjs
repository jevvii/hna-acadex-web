import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Preserve trailing slashes in URLs for Django backend compatibility
  // Django URL patterns expect trailing slashes (e.g., /api/auth/login/)
  trailingSlash: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.hna-acadex.com' },
    ],
  },
  // Silence turbopack workspace root warning
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      // Proxy all /api/* requests to Django backend
      // Using explicit path patterns that include trailing slash support
      // Django requires trailing slashes on all URL patterns
      {
        source: '/api/auth/:path*/',
        destination: `${apiUrl}/api/auth/:path*/`,
      },
      {
        source: '/api/courses/:path*/',
        destination: `${apiUrl}/api/courses/:path*/`,
      },
      {
        source: '/api/course-sections/:path*/',
        destination: `${apiUrl}/api/course-sections/:path*/`,
      },
      {
        source: '/api/profiles/:path*/',
        destination: `${apiUrl}/api/profiles/:path*/`,
      },
      {
        source: '/api/dashboard/:path*/',
        destination: `${apiUrl}/api/dashboard/:path*/`,
      },
      {
        source: '/api/activities/:path*/',
        destination: `${apiUrl}/api/activities/:path*/`,
      },
      {
        source: '/api/quizzes/:path*/',
        destination: `${apiUrl}/api/quizzes/:path*/`,
      },
      {
        source: '/api/course-files/:path*/',
        destination: `${apiUrl}/api/course-files/:path*/`,
      },
      {
        source: '/api/announcements/:path*/',
        destination: `${apiUrl}/api/announcements/:path*/`,
      },
      {
        source: '/api/attendance/:path*/',
        destination: `${apiUrl}/api/attendance/:path*/`,
      },
      {
        source: '/api/calendar-events/:path*/',
        destination: `${apiUrl}/api/calendar-events/:path*/`,
      },
      {
        source: '/api/notifications/:path*/',
        destination: `${apiUrl}/api/notifications/:path*/`,
      },
      {
        source: '/api/todos/:path*/',
        destination: `${apiUrl}/api/todos/:path*/`,
      },
      {
        source: '/api/reminders/:path*/',
        destination: `${apiUrl}/api/reminders/:path*/`,
      },
      {
        source: '/api/activity-comments/:path*/',
        destination: `${apiUrl}/api/activity-comments/:path*/`,
      },
      {
        source: '/api/enrollments/:path*/',
        destination: `${apiUrl}/api/enrollments/:path*/`,
      },
      {
        source: '/api/activity-submissions/:path*/',
        destination: `${apiUrl}/api/activity-submissions/:path*/`,
      },
      {
        source: '/api/quiz-answers/:path*/',
        destination: `${apiUrl}/api/quiz-answers/:path*/`,
      },
      {
        source: '/api/quiz-questions/:path*/',
        destination: `${apiUrl}/api/quiz-questions/:path*/`,
      },
      // Catch-all for other API routes (with trailing slash)
      {
        source: '/api/:path*/',
        destination: `${apiUrl}/api/:path*/`,
      },
      // Proxy media files to Django backend for PDF/image serving
      {
        source: '/media/:path*',
        destination: `${apiUrl}/media/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;