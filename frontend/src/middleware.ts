import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('token');

  // Paths that require authentication
  const protectedPaths = ['/dashboard', '/profile', '/bookings', '/documents'];
  const adminPaths = ['/admin'];
  const authPaths = ['/login', '/register'];

  // Check if it's a protected path
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p));
  const isAdminPath = adminPaths.some(p => path.startsWith(p));
  const isAuthPath = authPaths.some(p => path.startsWith(p));

  // If user is on auth page and has token, redirect to dashboard
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user tries to access protected paths without token
  if ((isProtectedPath || isAdminPath) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/bookings/:path*',
    '/documents/:path*',
    '/admin/:path*',
    '/login',
    '/register'
  ]
};
