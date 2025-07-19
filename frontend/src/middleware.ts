import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Căi care necesită autentificare
  const protectedPaths = ['/admin', '/dashboard', '/profile', '/bookings'];
  const isProtectedPath = protectedPaths.some(pp => path.startsWith(pp));
  
  if (isProtectedPath) {
    // Verifică token în cookies (nu în localStorage care nu e accesibil aici)
    const token = request.cookies.get('token');
    
    if (!token) {
      // Redirect la login cu return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
    
    // Verifică rolul pentru admin
    if (path.startsWith('/admin')) {
      try {
        const user = request.cookies.get('user');
        if (user) {
          const userData = JSON.parse(user.value);
          if (userData.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        }
      } catch (e) {
        // Invalid user data
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/bookings/:path*'
  ]
};
