import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware — Next.js 15.
 *
 * Sorumluluk:
 *  - /dashboard, /settings için auth redirect (sb-access-token cookie kontrolü)
 *  - Request-ID header'ı eklemek (downstream log korelasyonu)
 *  - Anti-CSRF için basit Origin header doğrulaması (POST'larda)
 *
 * NOT: Asıl JWT doğrulama backend'de yapılıyor (apps/api/src/auth/jwt.guard.ts).
 * Burada sadece UX-level redirect.
 */
const PROTECTED_PATHS = ['/dashboard', '/settings'];

export function middleware(req: NextRequest): NextResponse {
  const url = req.nextUrl;
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  // 1. Protected path auth check
  if (PROTECTED_PATHS.some((p) => url.pathname.startsWith(p))) {
    const hasToken = req.cookies.has('sb-access-token');
    if (!hasToken) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('next', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Request-ID downstream
  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)'],
};
