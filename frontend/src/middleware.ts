import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rute publice care nu necesită autentificare
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

// Rute doar pentru admin
const adminRoutes = [
  '/admin',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verifică dacă user-ul are token
  const token = request.cookies.get('token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  
  let user = null;
  if (userCookie) {
    try {
      user = JSON.parse(userCookie);
    } catch (error) {
      console.error('Error parsing user cookie:', error);
    }
  }

  // Verifică dacă este rută publică
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Verifică dacă este rută admin
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Redirect logic
  if (!token && !isPublicRoute) {
    // User neautentificat încearcă să acceseze rută protejată
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && (pathname === '/login' || pathname === '/register')) {
    // User autentificat încearcă să acceseze login/register
    const redirectUrl = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  if (isAdminRoute && user?.role !== 'admin') {
    // User non-admin încearcă să acceseze rută admin
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};