import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/_next',
  '/api',
  '/favicon',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow root — it does a client-side redirect to /dashboard
  // (a server-side redirect here would race with the cookie being set)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Check for session presence via cookie set by AuthProvider on login
  const session = request.cookies.get('toplab_auth');

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    // Only set `from` for meaningful paths so the post-login redirect is useful
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|api).*)',
  ],
};
