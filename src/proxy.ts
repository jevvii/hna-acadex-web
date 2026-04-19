import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Check for access_token cookie (set by backend HttpOnly cookie)
  const accessToken = request.cookies.get('access_token');
  const isAuthenticated = !!accessToken;

  // Protected routes that require authentication
  const protectedPaths = ['/courses', '/activities', '/quizzes', '/calendar', '/todos', '/notifications', '/settings', '/report-card', '/advisory'];
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect unauthenticated users to login for protected paths
  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only match app routes, exclude static files, API routes, and auth pages
  matcher: [
    // Match all paths except: api, _next/static, _next/image, favicon, login, setup, forgot-password, and files
    '/((?!api|_next/static|_next/image|favicon.ico|login|setup|forgot-password|[^/]+\\.[^/]+$).*)'
  ]
};
