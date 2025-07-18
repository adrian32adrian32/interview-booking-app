import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Dacă suntem pe /dashboard
  if (path === '/dashboard') {
    // Verifică cookies pentru user
    const userCookie = request.cookies.get('user');
    
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        console.log('Middleware: User role:', user.role);
        
        // Dacă e admin, redirect la admin dashboard
        if (user.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      } catch (e) {
        console.error('Middleware: Error parsing user cookie:', e);
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard']
};
