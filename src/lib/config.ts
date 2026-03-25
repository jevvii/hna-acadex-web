// Single source of truth for API URL configuration
// Use relative path to leverage Next.js rewrites for same-origin cookie handling
// In development: /api/* is rewritten to localhost:8000/api/*
// In production: Set NEXT_PUBLIC_API_URL to the actual API URL
export const API_BASE_URL = '/api';
export const API_ORIGIN = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';