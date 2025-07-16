import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const { pathname } = request.nextUrl;

  // Rute publice care nu necesită autentificare
  const publicRoutes = ['/', '/login', '/register'];
  
  // Rute care necesită autentificare
  const protectedRoutes = ['/dashboard', '/profile', '/bookings'];
  
  // Rute doar pentru admin
  const adminRoutes = ['/admin'];

  // Verifică dacă e rută protejată
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.includes(pathname);

  // Dacă nu e autentificat și încearcă să acceseze rută protejată
  if ((isProtectedRoute || isAdminRoute) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Dacă e autentificat și încearcă să acceseze login/register
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
