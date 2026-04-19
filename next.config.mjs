import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_LOCAL_API_URL = 'http://localhost:8000';
const isProdBuild = process.env.NODE_ENV === 'production';

if (isProdBuild && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is required for production builds. ' +
    'Set it to your backend origin (without /api), e.g. https://example.up.railway.app'
  );
}

function normalizeApiUrl(rawApiUrl) {
  const fallback = DEFAULT_LOCAL_API_URL;
  const trimmed = (rawApiUrl || fallback).trim().replace(/\/+$/, '');
  if (!trimmed) return fallback;

  const isLocalhost = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed);
  if (isLocalhost) return trimmed.startsWith('http') ? trimmed : `http://${trimmed}`;

  if (trimmed.startsWith('http://')) {
    // Vercel frontends are HTTPS; force HTTPS origin to avoid mixed-content/cookie issues.
    return `https://${trimmed.slice('http://'.length)}`;
  }

  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Preserve trailing slashes in URLs for Django backend compatibility
  // Django URL patterns expect trailing slashes (e.g., /api/auth/login/)
  trailingSlash: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.hna-acadex.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // Silence turbopack workspace root warning
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
    return [
      // Single catch-all keeps Django's trailing slash paths intact
      // without creating double slashes for collection endpoints.
      {
        source: '/api/:path*',
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
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
