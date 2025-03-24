import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get token from cookie or auth header
  const token = request.cookies.get('jwt_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // Function to verify token format
  const isValidToken = (token) => {
    if (!token) return false;
    try {
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) return false;
      const decodedPayload = JSON.parse(atob(payload));
      return !!decodedPayload.id; // Verify user ID exists
    } catch {
      return false;
    }
  };

  // Protected routes
  if (pathname.startsWith('/chat')) {
    if (!isValidToken(token)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Public routes - redirect to chat if already authenticated
  if (pathname === '/login' || pathname === '/signup') {
    if (isValidToken(token)) {
      return NextResponse.redirect(new URL('/chat', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/chat/:path*',
    '/login',
    '/signup'
  ]
}
