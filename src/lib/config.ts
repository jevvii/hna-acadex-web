export const API_BASE_URL = '/api';

export const API_ORIGIN = typeof window !== 'undefined'
  ? window.location.origin
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';